/**
 * Configuration Manager - Runtime configuration and error resilience
 */

import type {
  BranchName,
  OrchestratorConfig,
  LogLevel,
} from './types.js';

export class ConfigurationError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

export interface ConfigurationChangeEvent {
  readonly key: string;
  readonly oldValue: unknown;
  readonly newValue: unknown;
  readonly timestamp: number;
}

export interface CircuitBreakerState {
  readonly branchName: BranchName;
  readonly state: 'closed' | 'open' | 'half-open';
  readonly failureCount: number;
  readonly lastFailureTime: number;
  readonly nextRetryTime: number;
}

export interface HealthMetrics {
  readonly branchMetrics: Record<string, BranchHealthMetrics>;
  readonly orchestratorHealth: OrchestratorHealthMetrics;
  readonly circuitBreakers: readonly CircuitBreakerState[];
}

export interface BranchHealthMetrics {
  readonly successCount: number;
  readonly errorCount: number;
  readonly avgResponseTime: number;
  readonly lastActivity: number;
  readonly isHealthy: boolean;
}

export interface OrchestratorHealthMetrics {
  readonly uptime: number;
  readonly totalLogs: number;
  readonly totalErrors: number;
  readonly routingSuccessRate: number;
  readonly memoryUsage: number;
}

export class ConfigurationManager {
  private config: OrchestratorConfig = {};
  private readonly circuitBreakers = new Map<BranchName, CircuitBreakerState>();
  private readonly healthMetrics = new Map<BranchName, BranchHealthMetrics>();
  private readonly changeListeners = new Set<(event: ConfigurationChangeEvent) => void>();
  private readonly startTime = Date.now();
  
  // Health tracking
  private totalLogs = 0;
  private totalErrors = 0;
  private routingSuccesses = 0;
  private routingAttempts = 0;

  constructor(initialConfig: OrchestratorConfig = {}) {
    this.config = this.validateAndMergeConfig(initialConfig);
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<OrchestratorConfig>): void {
    const oldConfig = { ...this.config };
    const newConfig = this.validateAndMergeConfig({ ...this.config, ...updates });
    
    // Track changes and emit events
    for (const [key, newValue] of Object.entries(newConfig)) {
      const oldValue = (oldConfig as Record<string, unknown>)[key];
      if (oldValue !== newValue) {
        this.emitConfigChange(key, oldValue, newValue);
      }
    }

    this.config = newConfig;
  }

  /**
   * Get current configuration
   */
  getConfig(): Readonly<OrchestratorConfig> {
    return { ...this.config };
  }

  /**
   * Get configuration value by key
   */
  get<K extends keyof OrchestratorConfig>(key: K): OrchestratorConfig[K] {
    return this.config[key];
  }

  /**
   * Set configuration value
   */
  set<K extends keyof OrchestratorConfig>(key: K, value: OrchestratorConfig[K]): void {
    this.updateConfig({ [key]: value } as Partial<OrchestratorConfig>);
  }

  /**
   * Enable a branch
   */
  enableBranch(branchName: BranchName): void {
    const enabledBranches = this.config.enabledBranches ?? [];
    if (!enabledBranches.includes(branchName)) {
      this.updateConfig({
        enabledBranches: [...enabledBranches, branchName],
      });
    }
  }

  /**
   * Disable a branch
   */
  disableBranch(branchName: BranchName): void {
    const enabledBranches = this.config.enabledBranches ?? [];
    this.updateConfig({
      enabledBranches: enabledBranches.filter(name => name !== branchName),
    });
  }

  /**
   * Check if a branch is enabled
   */
  isBranchEnabled(branchName: BranchName): boolean {
    const enabledBranches = this.config.enabledBranches;
    return !enabledBranches || enabledBranches.includes(branchName);
  }

  /**
   * Record branch operation result for health tracking
   */
  recordBranchOperation(
    branchName: BranchName,
    success: boolean,
    responseTime: number
  ): void {
    const current = this.healthMetrics.get(branchName) ?? {
      successCount: 0,
      errorCount: 0,
      avgResponseTime: 0,
      lastActivity: 0,
      isHealthy: true,
    };

    const newMetrics: BranchHealthMetrics = {
      successCount: current.successCount + (success ? 1 : 0),
      errorCount: current.errorCount + (success ? 0 : 1),
      avgResponseTime: this.updateAverage(current.avgResponseTime, responseTime, current.successCount + current.errorCount),
      lastActivity: Date.now(),
      isHealthy: this.calculateHealthStatus(current, success),
    };

    this.healthMetrics.set(branchName, newMetrics);

    // Update circuit breaker
    this.updateCircuitBreaker(branchName, success);

    // Update global metrics
    this.totalLogs++;
    if (!success) {
      this.totalErrors++;
    }
  }

  /**
   * Record routing operation result
   */
  recordRoutingOperation(success: boolean): void {
    this.routingAttempts++;
    if (success) {
      this.routingSuccesses++;
    }
  }

  /**
   * Get circuit breaker state for a branch
   */
  getCircuitBreakerState(branchName: BranchName): CircuitBreakerState | null {
    return this.circuitBreakers.get(branchName) ?? null;
  }

  /**
   * Check if a branch is available (not in open circuit state)
   */
  isBranchAvailable(branchName: BranchName): boolean {
    const circuitBreaker = this.circuitBreakers.get(branchName);
    if (!circuitBreaker) {
      return true; // No circuit breaker means available
    }

    if (circuitBreaker.state === 'open') {
      // Check if it's time to transition to half-open
      if (Date.now() >= circuitBreaker.nextRetryTime) {
        this.transitionCircuitBreaker(branchName, 'half-open');
        return true;
      }
      return false;
    }

    return true;
  }

  /**
   * Force reset a circuit breaker
   */
  resetCircuitBreaker(branchName: BranchName): void {
    this.circuitBreakers.delete(branchName);
  }

  /**
   * Get comprehensive health metrics
   */
  getHealthMetrics(): HealthMetrics {
    const orchestratorHealth: OrchestratorHealthMetrics = {
      uptime: Date.now() - this.startTime,
      totalLogs: this.totalLogs,
      totalErrors: this.totalErrors,
      routingSuccessRate: this.routingAttempts > 0 ? this.routingSuccesses / this.routingAttempts : 1,
      memoryUsage: this.getMemoryUsage(),
    };

    return {
      branchMetrics: Object.fromEntries(this.healthMetrics),
      orchestratorHealth,
      circuitBreakers: Array.from(this.circuitBreakers.values()),
    };
  }

  /**
   * Add configuration change listener
   */
  addChangeListener(listener: (event: ConfigurationChangeEvent) => void): void {
    this.changeListeners.add(listener);
  }

  /**
   * Remove configuration change listener
   */
  removeChangeListener(listener: (event: ConfigurationChangeEvent) => void): void {
    this.changeListeners.delete(listener);
  }

  /**
   * Reset all metrics
   */
  resetMetrics(): void {
    this.healthMetrics.clear();
    this.circuitBreakers.clear();
    this.totalLogs = 0;
    this.totalErrors = 0;
    this.routingSuccesses = 0;
    this.routingAttempts = 0;
  }

  private validateAndMergeConfig(config: OrchestratorConfig): OrchestratorConfig {
    const defaults: OrchestratorConfig = {
      enabledBranches: undefined,
      defaultLogLevel: 'info',
      routingRules: [],
      eventBusConfig: {
        maxListeners: 100,
        enableHistory: true,
        historySize: 1000,
      },
      errorHandling: {
        circuitBreakerThreshold: 5,
        circuitBreakerTimeout: 60000, // 1 minute
        enableGracefulDegradation: true,
        fallbackBranch: undefined,
      },
    };

    // Validate log level
    if (config.defaultLogLevel) {
      const validLevels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'fatal'];
      if (!validLevels.includes(config.defaultLogLevel)) {
        throw new ConfigurationError(
          `Invalid log level: ${config.defaultLogLevel}`,
          'INVALID_LOG_LEVEL'
        );
      }
    }

    // Validate circuit breaker settings
    if (config.errorHandling?.circuitBreakerThreshold !== undefined) {
      if (config.errorHandling.circuitBreakerThreshold < 1) {
        throw new ConfigurationError(
          'Circuit breaker threshold must be at least 1',
          'INVALID_CIRCUIT_BREAKER_THRESHOLD'
        );
      }
    }

    if (config.errorHandling?.circuitBreakerTimeout !== undefined) {
      if (config.errorHandling.circuitBreakerTimeout < 1000) {
        throw new ConfigurationError(
          'Circuit breaker timeout must be at least 1000ms',
          'INVALID_CIRCUIT_BREAKER_TIMEOUT'
        );
      }
    }

    return {
      ...defaults,
      ...config,
      eventBusConfig: { ...defaults.eventBusConfig, ...config.eventBusConfig },
      errorHandling: { ...defaults.errorHandling, ...config.errorHandling },
    };
  }

  private updateCircuitBreaker(branchName: BranchName, success: boolean): void {
    const errorHandling = this.config.errorHandling!;
    const threshold = errorHandling.circuitBreakerThreshold!;
    const timeout = errorHandling.circuitBreakerTimeout!;

    let circuitBreaker = this.circuitBreakers.get(branchName);
    
    if (!circuitBreaker) {
      circuitBreaker = {
        branchName,
        state: 'closed',
        failureCount: 0,
        lastFailureTime: 0,
        nextRetryTime: 0,
      };
    }

    if (success) {
      // Reset on success
      if (circuitBreaker.state === 'half-open') {
        this.transitionCircuitBreaker(branchName, 'closed');
      } else if (circuitBreaker.failureCount > 0) {
        this.circuitBreakers.set(branchName, {
          ...circuitBreaker,
          failureCount: 0,
        });
      }
    } else {
      // Increment failure count
      const newFailureCount = circuitBreaker.failureCount + 1;
      const now = Date.now();

      if (newFailureCount >= threshold && circuitBreaker.state === 'closed') {
        // Transition to open
        this.transitionCircuitBreaker(branchName, 'open', now + timeout);
      } else {
        this.circuitBreakers.set(branchName, {
          ...circuitBreaker,
          failureCount: newFailureCount,
          lastFailureTime: now,
        });
      }
    }
  }

  private transitionCircuitBreaker(
    branchName: BranchName,
    newState: 'closed' | 'open' | 'half-open',
    nextRetryTime?: number
  ): void {
    const current = this.circuitBreakers.get(branchName);
    const updated: CircuitBreakerState = {
      branchName,
      state: newState,
      failureCount: newState === 'closed' ? 0 : (current?.failureCount ?? 0),
      lastFailureTime: current?.lastFailureTime ?? 0,
      nextRetryTime: nextRetryTime ?? 0,
    };

    this.circuitBreakers.set(branchName, updated);
  }

  private calculateHealthStatus(
    current: BranchHealthMetrics,
    lastOperationSuccess: boolean
  ): boolean {
    const totalOps = current.successCount + current.errorCount + 1;
    const errorRate = (current.errorCount + (lastOperationSuccess ? 0 : 1)) / totalOps;
    return errorRate < 0.1; // Healthy if error rate < 10%
  }

  private updateAverage(currentAvg: number, newValue: number, count: number): number {
    return (currentAvg * count + newValue) / (count + 1);
  }

  private getMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed;
    }
    return 0;
  }

  private emitConfigChange(key: string, oldValue: unknown, newValue: unknown): void {
    const event: ConfigurationChangeEvent = {
      key,
      oldValue,
      newValue,
      timestamp: Date.now(),
    };

    for (const listener of this.changeListeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('Configuration change listener error:', error);
      }
    }
  }
}