/**
 * Branch Management System
 * 
 * Provides runtime creation, management, and control of debug branches
 * for parallel investigation contexts and filtering.
 */

import { safeEmit } from './schema-registry.js';

/** @internal */
type BranchName = string;
/** @internal */
type ISODateString = string;

/** @internal */
interface BranchOptions {
  parent?: BranchName;
  metadata?: Record<string, unknown>;
  autoActivate?: boolean;
}

/** @internal */
interface BranchRecord {
  name: BranchName;
  parent?: BranchName;
  createdAt: ISODateString;
  active: boolean;
  enabled: boolean;
  metadata: Record<string, unknown>;
  stats: {
    events: number;
    errors: number;
    lastEventAt: ISODateString;
  };
}

/** @internal - Public view of branch for list operations */
interface BranchSummary {
  name: string;
  active: boolean;
  enabled: boolean;
  eventCount: number;
  errorCount: number;
  lastActivity: ISODateString;
  parent?: string;
}

/** @internal - Detailed view including metadata */
interface BranchDetails extends BranchSummary {
  createdAt: ISODateString;
  metadata: Record<string, unknown>;
}


// Branch name validation regex: alphanumeric, hyphens, underscores, dots, 1-40 chars
const BRANCH_NAME_REGEX = /^[a-z0-9\-_.]{1,40}$/i;

// Projection functions for clean API surface
function toSummary(record: BranchRecord): BranchSummary {
  return {
    name: record.name,
    parent: record.parent,
    active: record.active,
    enabled: record.enabled,
    eventCount: record.stats.events,
    errorCount: record.stats.errors,
    lastActivity: record.stats.lastEventAt
  };
}

function toDetails(record: BranchRecord): BranchDetails {
  return {
    ...toSummary(record),
    createdAt: record.createdAt,
    metadata: { ...record.metadata }
  };
}

/** @internal */
class BranchManager {
  private branches = new Map<BranchName, BranchRecord>();
  private activeBranch: BranchName = 'main';
  
  constructor() {
    // Always start with a main branch
    const now = new Date().toISOString();
    this.branches.set('main', {
      name: 'main',
      createdAt: now,
      active: true,
      enabled: true,
      metadata: { isDefault: true },
      stats: { events: 0, errors: 0, lastEventAt: now }
    });
  }

  /**
   * Create a new debug branch
   * @experimental
   */
  createBranch(name: string, options: BranchOptions = {}): BranchRecord {
    this.validateBranchName(name);
    
    if (this.branches.has(name)) {
      throw new Error(`Branch '${name}' already exists`);
    }

    // Validate parent branch exists if specified
    if (options.parent && !this.branches.has(options.parent)) {
      throw new Error(`Parent branch '${options.parent}' does not exist`);
    }

    // Check for circular references
    if (options.parent && this.wouldCreateCycle(name, options.parent)) {
      throw new Error(`Creating branch '${name}' with parent '${options.parent}' would create a cycle`);
    }

    const now = new Date().toISOString();
    const record: BranchRecord = {
      name,
      parent: options.parent,
      createdAt: now,
      active: false,
      enabled: true,
      metadata: options.metadata || {},
      stats: { events: 0, errors: 0, lastEventAt: now }
    };

    this.branches.set(name, record);

    // Emit branch creation event
    safeEmit('orchestrator.branch.lifecycle.created', {
      branch: name,
      parent: options.parent,
      timestamp: now,
      metadata: options.metadata
    });

    // Auto-activate if requested
    if (options.autoActivate) {
      this.setActiveBranch(name);
    }

    return record;
  }

  /**
   * Get all registered branches
   * @experimental
   */
  getBranches(): BranchSummary[] {
    return Array.from(this.branches.values()).map(toSummary);
  }

  /**
   * Get only active branches
   * @experimental
   */
  listActiveBranches(): BranchSummary[] {
    return this.getBranches().filter(branch => branch.active);
  }

  /**
   * Get detailed information about a specific branch
   * @experimental
   */
  getBranch(name: string): BranchDetails | undefined {
    const record = this.branches.get(name);
    if (!record) return undefined;

    return toDetails(record);
  }

  /**
   * Set the active branch (for new events)
   * @experimental
   */
  setActiveBranch(name: string): void {
    if (!this.branches.has(name)) {
      throw new Error(`Branch '${name}' does not exist`);
    }

    const previousActive = this.activeBranch;
    
    // Deactivate previous branch
    if (previousActive && this.branches.has(previousActive)) {
      const prevRecord = this.branches.get(previousActive)!;
      prevRecord.active = false;
      
      if (previousActive !== name) {
        safeEmit('orchestrator.branch.lifecycle.deactivated', {
          branch: previousActive,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Activate new branch
    const record = this.branches.get(name)!;
    record.active = true;
    this.activeBranch = name;

    safeEmit('orchestrator.branch.lifecycle.activated', {
      branch: name,
      previous: previousActive,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get the currently active branch name
   * @experimental
   */
  getActiveBranch(): string {
    return this.activeBranch;
  }

  /**
   * Enable a branch (allows event logging)
   * @experimental
   */
  enableBranch(name: string): void {
    const record = this.branches.get(name);
    if (!record) {
      throw new Error(`Branch '${name}' does not exist`);
    }

    if (!record.enabled) {
      record.enabled = true;
      safeEmit('orchestrator.branch.lifecycle.enabled', {
        branch: name,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Disable a branch (stops event logging)
   * @experimental
   */
  disableBranch(name: string): void {
    const record = this.branches.get(name);
    if (!record) {
      throw new Error(`Branch '${name}' does not exist`);
    }

    // Cannot disable the main branch
    if (name === 'main') {
      throw new Error('Cannot disable the main branch');
    }

    if (record.enabled) {
      record.enabled = false;
      safeEmit('orchestrator.branch.lifecycle.disabled', {
        branch: name,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Delete a branch (with validation)
   * @experimental
   */
  deleteBranch(name: string): boolean {
    if (name === 'main') {
      throw new Error('Cannot delete the main branch');
    }

    if (!this.branches.has(name)) {
      return false; // Already gone
    }

    // If deleting the active branch, switch to main
    if (name === this.activeBranch) {
      this.setActiveBranch('main');
    }

    // Check for child branches
    const childBranches = Array.from(this.branches.values())
      .filter(record => record.parent === name);
    
    if (childBranches.length > 0) {
      throw new Error(`Cannot delete branch '${name}': has ${childBranches.length} child branches`);
    }

    this.branches.delete(name);
    safeEmit('orchestrator.branch.lifecycle.deleted', {
      branch: name,
      timestamp: new Date().toISOString()
    });

    return true;
  }

  /**
   * Update branch statistics (called by event system)
   * @internal
   */
  recordEventForBranch(branchName: string, isError = false): void {
    const record = this.branches.get(branchName);
    if (record && record.enabled) {
      record.stats.events++;
      if (isError) {
        record.stats.errors++;
      }
      record.stats.lastEventAt = new Date().toISOString();
    }
  }

  /**
   * Check if branch is enabled for logging
   * @internal
   */
  isBranchEnabled(name: string): boolean {
    const record = this.branches.get(name);
    return record ? record.enabled : false;
  }

  private validateBranchName(name: string): void {
    if (!name || typeof name !== 'string') {
      throw new Error('Branch name must be a non-empty string');
    }

    if (!BRANCH_NAME_REGEX.test(name)) {
      throw new Error('Branch name must be 1-40 characters: letters, numbers, hyphens, underscores, dots only');
    }

    if (name.startsWith('.') || name.endsWith('.')) {
      throw new Error('Branch name cannot start or end with a dot');
    }
  }

  private wouldCreateCycle(newBranchName: string, parentName: string): boolean {
    const visited = new Set<string>();
    let current: string | undefined = parentName;

    while (current && !visited.has(current)) {
      if (current === newBranchName) {
        return true; // Found a cycle
      }
      
      visited.add(current);
      const record = this.branches.get(current);
      current = record?.parent;
    }

    return false;
  }

  /**
   * Reset to initial state (testing only)
   * @internal
   */
  __resetBranches(): void {
    this.branches.clear();
    this.activeBranch = 'main';
    
    // Recreate main branch
    const now = new Date().toISOString();
    this.branches.set('main', {
      name: 'main',
      createdAt: now,
      active: true,
      enabled: true,
      metadata: { isDefault: true },
      stats: { events: 0, errors: 0, lastEventAt: now }
    });
  }
}

// Singleton instance
/** @internal */
const branchManager = new BranchManager();

// Clean experimental API facade
/** @experimental Branch management API (subject to change without SemVer guarantees) */
export const experimentalBranches = {
  create: (name: string, options?: { parent?: string; metadata?: Record<string, unknown>; autoActivate?: boolean }): BranchDetails => {
    const record = branchManager.createBranch(name, options);
    return toDetails(record);
  },
  
  list: (): BranchSummary[] => branchManager.getBranches(),
  
  listActive: (): BranchSummary[] => branchManager.listActiveBranches(),
  
  get: (name: string): BranchDetails | undefined => branchManager.getBranch(name),
  
  setActive: (name: string) => branchManager.setActiveBranch(name),
  
  getActive: () => branchManager.getActiveBranch(),
  
  enable: (name: string) => branchManager.enableBranch(name),
  
  disable: (name: string) => branchManager.disableBranch(name),
  
  delete: (name: string) => branchManager.deleteBranch(name),
  
  /** @internal */
  _manager: branchManager, // Internal access for bootstrap integration
  
  /** @internal Testing only */
  __resetBranches: () => branchManager.__resetBranches()
};