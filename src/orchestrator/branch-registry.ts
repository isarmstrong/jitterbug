/**
 * Branch Registry - Manages debug branches with dynamic registration and state tracking
 */

import type {
  BranchName,
  BranchState,
  DebugBranch,
  BranchMetadata,
  EventType,
} from './types.js';
import { BUILTIN_EVENTS } from './types.js';

export interface BranchRegistryConfig {
  readonly maxBranches?: number;
  readonly allowDuplicateNames?: boolean;
  readonly autoCleanupFailed?: boolean;
}

export class BranchRegistryError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly branchName?: BranchName
  ) {
    super(message);
    this.name = 'BranchRegistryError';
  }
}

export class BranchRegistry {
  private readonly branches = new Map<BranchName, DebugBranch>();
  private readonly metadata = new Map<BranchName, BranchMetadata>();
  private readonly config: Required<BranchRegistryConfig>;
  private readonly eventHandlers = new Set<(event: { type: EventType; data: unknown }) => void>();

  constructor(config: BranchRegistryConfig = {}) {
    this.config = {
      maxBranches: config.maxBranches ?? 50,
      allowDuplicateNames: config.allowDuplicateNames ?? false,
      autoCleanupFailed: config.autoCleanupFailed ?? true,
    };
  }

  /**
   * Register a new debug branch
   */
  async registerBranch(
    branch: DebugBranch,
    config?: Record<string, unknown>
  ): Promise<void> {
    this.validateBranchForRegistration(branch);
    
    try {
      // Initialize the branch
      await branch.initialize(config);
      
      // Register in maps
      this.branches.set(branch.name, branch);
      this.metadata.set(branch.name, this.createBranchMetadata(branch, config));
      
      // Emit registration event
      this.emitEvent(BUILTIN_EVENTS.BRANCH_REGISTERED, {
        name: branch.name,
        version: branch.version,
        capabilities: branch.capabilities,
      });
      
    } catch (error) {
      throw new BranchRegistryError(
        `Failed to register branch ${branch.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'REGISTRATION_FAILED',
        branch.name
      );
    }
  }

  /**
   * Unregister a debug branch
   */
  async unregisterBranch(name: BranchName): Promise<void> {
    const branch = this.branches.get(name);
    if (!branch) {
      throw new BranchRegistryError(
        `Branch ${name} not found`,
        'BRANCH_NOT_FOUND',
        name
      );
    }

    try {
      // Cleanup the branch
      await branch.cleanup();
      
      // Remove from maps
      this.branches.delete(name);
      this.metadata.delete(name);
      
      // Emit unregistration event
      this.emitEvent(BUILTIN_EVENTS.BRANCH_UNREGISTERED, {
        name,
      });
      
    } catch (error) {
      throw new BranchRegistryError(
        `Failed to unregister branch ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'UNREGISTRATION_FAILED',
        name
      );
    }
  }

  /**
   * Get a specific branch
   */
  getBranch(name: BranchName): DebugBranch | null {
    return this.branches.get(name) ?? null;
  }

  /**
   * Check if a branch exists
   */
  hasBranch(name: BranchName): boolean {
    return this.branches.has(name);
  }

  /**
   * Get all registered branches
   */
  getAllBranches(): readonly DebugBranch[] {
    return Array.from(this.branches.values());
  }

  /**
   * Get all branch names
   */
  getBranchNames(): readonly BranchName[] {
    return Array.from(this.branches.keys());
  }

  /**
   * Get branches by state
   */
  getBranchesByState(state: BranchState): readonly DebugBranch[] {
    return Array.from(this.branches.values()).filter(
      branch => branch.getState() === state
    );
  }

  /**
   * Get branch metadata
   */
  getBranchMetadata(name: BranchName): BranchMetadata | null {
    return this.metadata.get(name) ?? null;
  }

  /**
   * Get all branch metadata
   */
  getAllMetadata(): readonly BranchMetadata[] {
    return Array.from(this.metadata.values());
  }

  /**
   * Update branch state and emit event
   */
  updateBranchState(name: BranchName, newState: BranchState): void {
    const metadata = this.metadata.get(name);
    if (!metadata) {
      throw new BranchRegistryError(
        `Branch ${name} not found`,
        'BRANCH_NOT_FOUND',
        name
      );
    }

    const updatedMetadata: BranchMetadata = {
      ...metadata,
      state: newState,
    };

    this.metadata.set(name, updatedMetadata);
    
    this.emitEvent(BUILTIN_EVENTS.BRANCH_STATE_CHANGED, {
      name,
      oldState: metadata.state,
      newState,
    });

    // Auto-cleanup failed branches if configured
    if (newState === 'failed' && this.config.autoCleanupFailed) {
      this.unregisterBranch(name).catch((error) => {
        console.error(`Failed to auto-cleanup failed branch ${name}:`, error);
      });
    }
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    total: number;
    byState: Record<BranchState, number>;
    capabilities: Record<string, number>;
  } {
    const branches = this.getAllBranches();
    const stats = {
      total: branches.length,
      byState: {
        initializing: 0,
        active: 0,
        suspended: 0,
        failed: 0,
        destroyed: 0,
      } as Record<BranchState, number>,
      capabilities: {} as Record<string, number>,
    };

    for (const branch of branches) {
      const state = branch.getState();
      stats.byState[state]++;

      for (const capability of branch.capabilities) {
        stats.capabilities[capability] = (stats.capabilities[capability] ?? 0) + 1;
      }
    }

    return stats;
  }

  /**
   * Add event listener
   */
  addEventListener(handler: (event: { type: EventType; data: unknown }) => void): void {
    this.eventHandlers.add(handler);
  }

  /**
   * Remove event listener
   */
  removeEventListener(handler: (event: { type: EventType; data: unknown }) => void): void {
    this.eventHandlers.delete(handler);
  }

  /**
   * Clear all branches
   */
  async clear(): Promise<void> {
    const names = Array.from(this.branches.keys());
    await Promise.allSettled(names.map(name => this.unregisterBranch(name)));
  }

  private validateBranchForRegistration(branch: DebugBranch): void {
    if (!branch.name || typeof branch.name !== 'string') {
      throw new BranchRegistryError(
        'Branch must have a valid name',
        'INVALID_BRANCH_NAME'
      );
    }

    if (this.branches.size >= this.config.maxBranches) {
      throw new BranchRegistryError(
        `Maximum number of branches (${this.config.maxBranches}) exceeded`,
        'MAX_BRANCHES_EXCEEDED'
      );
    }

    if (!this.config.allowDuplicateNames && this.branches.has(branch.name)) {
      throw new BranchRegistryError(
        `Branch with name ${branch.name} already exists`,
        'DUPLICATE_BRANCH_NAME',
        branch.name
      );
    }

    if (!branch.version || typeof branch.version !== 'string') {
      throw new BranchRegistryError(
        'Branch must have a valid version',
        'INVALID_BRANCH_VERSION',
        branch.name
      );
    }

    if (!Array.isArray(branch.capabilities)) {
      throw new BranchRegistryError(
        'Branch must have capabilities array',
        'INVALID_CAPABILITIES',
        branch.name
      );
    }
  }

  private createBranchMetadata(
    branch: DebugBranch,
    config?: Record<string, unknown>
  ): BranchMetadata {
    return {
      name: branch.name,
      version: branch.version,
      capabilities: branch.capabilities,
      state: branch.getState(),
      registeredAt: Date.now(),
      config: config ?? {},
    };
  }

  private emitEvent(type: EventType, data: unknown): void {
    const event = { type, data };
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch (error) {
        console.error('Error in branch registry event handler:', error);
      }
    }
  }
}