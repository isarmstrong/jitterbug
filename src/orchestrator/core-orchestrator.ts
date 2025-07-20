/**
 * Core Orchestrator - Central coordination point for all debugging operations
 */

import type {
  BranchName,
  DebugBranch,
  LogEntry,
  OrchestratorConfig,
} from './types.js';
import {
  BUILTIN_EVENTS,
  createBranchName,
  createEventType,
} from './types.js';
import { BranchRegistry } from './branch-registry.js';
import type { BranchRegistryConfig } from './branch-registry.js';
import { RoutingEngine } from './routing-engine.js';
import type { RoutingDecision } from './routing-engine.js';
import { EventBus, NamespacedEventBus } from './event-bus.js';
import { ConfigurationManager } from './config-manager.js';
import type { HealthMetrics } from './config-manager.js';
import { BaseOrchestratorError } from './errors.js';
import { emitJitterbugEvent } from '../browser/utils.js';

export class OrchestratorError extends BaseOrchestratorError {
  public readonly branchName?: BranchName;

  constructor(
    message: string,
    code: string,
    branchName?: BranchName,
    retryable = false
  ) {
    super(message, code, 'orchestrator', retryable);
    this.branchName = branchName;
  }
}

export interface OrchestratorStats {
  totalLogs: number;
  logsProcessed: number;
  logsFailed: number;
  routingStats: Record<string, number>;
  branchStats: Record<string, { logs: number; errors: number }>;
}

export class CoreOrchestrator {
  private readonly branchRegistry: BranchRegistry;
  private readonly routingEngine: RoutingEngine;
  private readonly eventBus: EventBus;
  private readonly configManager: ConfigurationManager;
  private readonly stats: OrchestratorStats = {
    totalLogs: 0,
    logsProcessed: 0,
    logsFailed: 0,
    routingStats: {},
    branchStats: {},
  };
  
  private isInitialized = false;
  private isShuttingDown = false;

  constructor(
    config: OrchestratorConfig = {},
    registryConfig: BranchRegistryConfig = {}
  ) {
    this.configManager = new ConfigurationManager(config);
    this.branchRegistry = new BranchRegistry(registryConfig);
    this.routingEngine = new RoutingEngine();
    this.eventBus = new EventBus(this.configManager.get('eventBusConfig'));

    this.setupEventHandling();
  }

  /**
   * Initialize the orchestrator
   */
  async initialize(): Promise<void> {
    const startTime = Date.now();
    emitJitterbugEvent('orchestrator.core.initialization.started', {});

    if (this.isInitialized) {
      emitJitterbugEvent('orchestrator.core.initialization.failed', {
        error: 'Already initialized',
        durationMs: Date.now() - startTime
      });
      throw new OrchestratorError(
        'Orchestrator is already initialized',
        'ALREADY_INITIALIZED'
      );
    }

    try {
      // Initialize routing rules from config
      const routingRules = this.configManager.get('routingRules') ?? [];
      for (const rule of routingRules) {
        this.routingEngine.addRule(rule);
      }

      this.isInitialized = true;

      // Emit initialization event
      this.eventBus.publish({
        type: createEventType('orchestrator:initialized'),
        source: createBranchName('orchestrator'),
        timestamp: Date.now(),
        data: { config: this.configManager.getConfig() } as Record<string, unknown>,
      });

      emitJitterbugEvent('orchestrator.core.initialization.completed', {
        durationMs: Date.now() - startTime,
        rulesCount: routingRules.length
      });

    } catch (error) {
      emitJitterbugEvent('orchestrator.core.initialization.failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        durationMs: Date.now() - startTime
      });
      throw new OrchestratorError(
        `Failed to initialize orchestrator: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'INITIALIZATION_FAILED'
      );
    }
  }

  /**
   * Shutdown the orchestrator
   */
  async shutdown(): Promise<void> {
    if (!this.isInitialized || this.isShuttingDown) {
      return;
    }

    const startTime = Date.now();
    emitJitterbugEvent('orchestrator.core.shutdown.started', {});

    this.isShuttingDown = true;

    try {
      // Emit shutdown event
      this.eventBus.publish({
        type: createEventType('orchestrator:shutdown'),
        source: createBranchName('orchestrator'),
        timestamp: Date.now(),
        data: { stats: this.getStats() } as Record<string, unknown>,
      });

      // Shutdown all branches
      await this.branchRegistry.clear();

      // Clear event bus
      this.eventBus.clear();

      this.isInitialized = false;
      this.isShuttingDown = false;

      emitJitterbugEvent('orchestrator.core.shutdown.completed', {
        durationMs: Date.now() - startTime
      });

    } catch (error) {
      emitJitterbugEvent('orchestrator.core.shutdown.failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        durationMs: Date.now() - startTime
      });

      throw new OrchestratorError(
        `Failed to shutdown orchestrator: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'SHUTDOWN_FAILED'
      );
    }
  }

  /**
   * Register a debug branch
   */
  async registerBranch(
    branch: DebugBranch,
    config?: Record<string, unknown>
  ): Promise<void> {
    this.ensureInitialized();

    const startTime = Date.now();
    emitJitterbugEvent('orchestrator.branch.registration.started', {
      branchName: branch.name,
      hasConfig: !!config
    });

    try {
      await this.branchRegistry.registerBranch(branch, config);
      
      // Initialize branch stats
      this.stats.branchStats[branch.name] = { logs: 0, errors: 0 };

      emitJitterbugEvent('orchestrator.branch.registration.completed', {
        branchName: branch.name,
        durationMs: Date.now() - startTime
      });
      
    } catch (error) {
      emitJitterbugEvent('orchestrator.branch.registration.failed', {
        branchName: branch.name,
        error: error instanceof Error ? error.message : 'Unknown error',
        durationMs: Date.now() - startTime
      });

      throw new OrchestratorError(
        `Failed to register branch ${branch.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'BRANCH_REGISTRATION_FAILED',
        branch.name
      );
    }
  }

  /**
   * Unregister a debug branch
   */
  async unregisterBranch(name: BranchName): Promise<void> {
    this.ensureInitialized();

    const startTime = Date.now();
    emitJitterbugEvent('orchestrator.branch.unregistration.started', {
      branchName: name
    });

    try {
      await this.branchRegistry.unregisterBranch(name);
      
      // Clean up branch stats
      delete this.stats.branchStats[name];

      emitJitterbugEvent('orchestrator.branch.unregistration.completed', {
        branchName: name,
        durationMs: Date.now() - startTime
      });
      
    } catch (error) {
      emitJitterbugEvent('orchestrator.branch.unregistration.failed', {
        branchName: name,
        error: error instanceof Error ? error.message : 'Unknown error',
        durationMs: Date.now() - startTime
      });

      throw new OrchestratorError(
        `Failed to unregister branch ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'BRANCH_UNREGISTRATION_FAILED',
        name
      );
    }
  }

  /**
   * Process a log entry through the orchestrator
   */
  async processLog(entry: LogEntry): Promise<void> {
    this.ensureInitialized();
    
    if (this.isShuttingDown) {
      throw new OrchestratorError(
        'Cannot process logs during shutdown',
        'SHUTTING_DOWN'
      );
    }

    this.stats.totalLogs++;
    const startTime = Date.now();
    emitJitterbugEvent('orchestrator.log.processing.started', {
      logLevel: entry.level,
      logSource: entry.metadata?.source || 'unknown'
    });

    try {
      // Get available branches
      const availableBranches = this.getAvailableBranches();
      
      if (availableBranches.length === 0) {
        throw new OrchestratorError(
          'No available branches for log processing',
          'NO_AVAILABLE_BRANCHES'
        );
      }

      // Route the log entry
      const decision = this.routingEngine.route(entry, availableBranches);
      this.updateRoutingStats(decision);

      // Get the target branch
      const targetBranch = this.branchRegistry.getBranch(decision.targetBranch);
      if (!targetBranch) {
        throw new OrchestratorError(
          `Target branch ${decision.targetBranch} not found`,
          'TARGET_BRANCH_NOT_FOUND',
          decision.targetBranch
        );
      }

      // Process the log
      await this.processLogInBranch(targetBranch, entry);
      
      // Record successful operation
      const responseTime = Date.now() - startTime;
      this.configManager.recordBranchOperation(decision.targetBranch, true, responseTime);
      this.configManager.recordRoutingOperation(true);
      this.stats.logsProcessed++;
      this.stats.branchStats[decision.targetBranch].logs++;

      emitJitterbugEvent('orchestrator.log.processing.completed', {
        durationMs: responseTime,
        targetBranch: decision.targetBranch,
        logLevel: entry.level
      });

    } catch (error) {
      this.stats.logsFailed++;
      this.configManager.recordRoutingOperation(false);

      emitJitterbugEvent('orchestrator.log.processing.failed', {
        durationMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        logLevel: entry.level
      });
      
      // Try fallback processing if graceful degradation is enabled
      if (this.configManager.get('errorHandling')?.enableGracefulDegradation) {
        await this.tryFallbackProcessing(entry, error);
      } else {
        throw new OrchestratorError(
          `Failed to process log: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'LOG_PROCESSING_FAILED'
        );
      }
    }
  }

  /**
   * Get a namespaced event bus for a branch
   */
  getEventBus(branchName: BranchName): NamespacedEventBus {
    this.ensureInitialized();
    return this.eventBus.createNamespacedBus(branchName, branchName);
  }

  /**
   * Get branch by name
   */
  getBranch(name: BranchName): DebugBranch | null {
    return this.branchRegistry.getBranch(name);
  }

  /**
   * Get all registered branches
   */
  getAllBranches(): readonly DebugBranch[] {
    return this.branchRegistry.getAllBranches();
  }

  /**
   * Get branch names
   */
  getBranchNames(): readonly BranchName[] {
    return this.branchRegistry.getBranchNames();
  }

  /**
   * Update orchestrator configuration
   */
  updateConfig(updates: Partial<OrchestratorConfig>): void {
    this.configManager.updateConfig(updates);
  }

  /**
   * Get current configuration
   */
  getConfig(): Readonly<OrchestratorConfig> {
    return this.configManager.getConfig();
  }

  /**
   * Get orchestrator statistics
   */
  getStats(): Readonly<OrchestratorStats> {
    return { ...this.stats };
  }

  /**
   * Get health metrics
   */
  getHealthMetrics(): HealthMetrics {
    return this.configManager.getHealthMetrics();
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    Object.assign(this.stats, {
      totalLogs: 0,
      logsProcessed: 0,
      logsFailed: 0,
      routingStats: {},
      branchStats: {},
    });
    this.configManager.resetMetrics();
    this.routingEngine.resetAnalytics();
  }

  /**
   * Enable a branch
   */
  enableBranch(name: BranchName): void {
    this.configManager.enableBranch(name);
  }

  /**
   * Disable a branch
   */
  disableBranch(name: BranchName): void {
    this.configManager.disableBranch(name);
  }

  /**
   * Check if orchestrator is initialized
   */
  get initialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Check if orchestrator is shutting down
   */
  get shuttingDown(): boolean {
    return this.isShuttingDown;
  }

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new OrchestratorError(
        'Orchestrator is not initialized',
        'NOT_INITIALIZED'
      );
    }
  }

  private getAvailableBranches(): BranchName[] {
    return this.branchRegistry.getBranchNames().filter(name => 
      this.configManager.isBranchEnabled(name) &&
      this.configManager.isBranchAvailable(name)
    );
  }

  private async processLogInBranch(branch: DebugBranch, entry: LogEntry): Promise<void> {
    const startTime = Date.now();
    
    try {
      await branch.processLog(entry);
      
      // Record successful operation
      const responseTime = Date.now() - startTime;
      this.configManager.recordBranchOperation(branch.name, true, responseTime);
      
    } catch (error) {
      // Record failed operation
      const responseTime = Date.now() - startTime;
      this.configManager.recordBranchOperation(branch.name, false, responseTime);
      
      // Update branch error stats
      this.stats.branchStats[branch.name].errors++;
      
      // Emit error event
      this.eventBus.publish({
        type: BUILTIN_EVENTS.ORCHESTRATOR_ERROR,
        source: createBranchName('orchestrator'),
        timestamp: Date.now(),
        data: {
          branchName: branch.name,
          error: error instanceof Error ? error.message : String(error),
          logEntry: entry,
        },
      });
      
      throw error;
    }
  }

  private async tryFallbackProcessing(entry: LogEntry, originalError: unknown): Promise<void> {
    const fallbackBranch = this.configManager.get('errorHandling')?.fallbackBranch;
    
    if (fallbackBranch) {
      const branch = this.branchRegistry.getBranch(fallbackBranch);
      if (branch && this.configManager.isBranchAvailable(fallbackBranch)) {
        try {
          await this.processLogInBranch(branch, entry);
          this.stats.logsProcessed++;
          return;
        } catch (fallbackError) {
          // Fallback also failed, throw original error
        }
      }
    }

    // No fallback or fallback failed
    throw new OrchestratorError(
      `Log processing failed and fallback unavailable: ${originalError instanceof Error ? originalError.message : 'Unknown error'}`,
      'FALLBACK_FAILED'
    );
  }

  private updateRoutingStats(decision: RoutingDecision): void {
    this.stats.routingStats[decision.strategy] = (this.stats.routingStats[decision.strategy] ?? 0) + 1;
  }

  private setupEventHandling(): void {
    // Listen to branch registry events
    this.branchRegistry.addEventListener((event) => {
      this.eventBus.publish({
        type: event.type,
        source: createBranchName('registry'),
        timestamp: Date.now(),
        data: event.data as Record<string, unknown>,
      });
    });

    // Listen to configuration changes
    this.configManager.addChangeListener((change) => {
      this.eventBus.publish({
        type: createEventType('config:changed'),
        source: createBranchName('orchestrator'),
        timestamp: Date.now(),
        data: change as unknown as Record<string, unknown>,
      });
    });
  }
}