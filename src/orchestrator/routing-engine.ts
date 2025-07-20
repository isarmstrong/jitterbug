/**
 * Routing Engine - Intelligently routes log entries to appropriate branches
 */

import type {
  BranchName,
  LogEntry,
  RoutingStrategy,
  RoutingRule,
  RoutingCondition,
} from './types.js';
import { BUILTIN_BRANCHES } from './types.js';

export class RoutingEngineError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'RoutingEngineError';
  }
}

export interface RoutingDecision {
  readonly targetBranch: BranchName;
  readonly strategy: string;
  readonly confidence: number;
  readonly fallback: boolean;
}

export interface RoutingAnalytics {
  totalRoutes: number;
  routesByBranch: Record<string, number>;
  routesByStrategy: Record<string, number>;
  fallbackRoutes: number;
  failedRoutes: number;
}

export class RoutingEngine {
  private readonly strategies = new Map<string, RoutingStrategy>();
  private readonly rules: RoutingRule[] = [];
  private readonly analytics: RoutingAnalytics = {
    totalRoutes: 0,
    routesByBranch: {},
    routesByStrategy: {},
    fallbackRoutes: 0,
    failedRoutes: 0,
  };

  constructor() {
    this.registerBuiltinStrategies();
  }

  /**
   * Register a routing strategy
   */
  registerStrategy(strategy: RoutingStrategy): void {
    if (this.strategies.has(strategy.name)) {
      throw new RoutingEngineError(
        `Strategy ${strategy.name} already registered`,
        'DUPLICATE_STRATEGY'
      );
    }

    this.strategies.set(strategy.name, strategy);
  }

  /**
   * Unregister a routing strategy
   */
  unregisterStrategy(name: string): void {
    if (!this.strategies.delete(name)) {
      throw new RoutingEngineError(
        `Strategy ${name} not found`,
        'STRATEGY_NOT_FOUND'
      );
    }
  }

  /**
   * Add a routing rule
   */
  addRule(rule: RoutingRule): void {
    // Insert rule in priority order (higher priority first)
    const insertIndex = this.rules.findIndex(r => r.priority < rule.priority);
    if (insertIndex === -1) {
      this.rules.push(rule);
    } else {
      this.rules.splice(insertIndex, 0, rule);
    }
  }

  /**
   * Remove a routing rule
   */
  removeRule(name: string): boolean {
    const index = this.rules.findIndex(r => r.name === name);
    if (index !== -1) {
      this.rules.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Route a log entry to the appropriate branch
   */
  route(entry: LogEntry, availableBranches: readonly BranchName[]): RoutingDecision {
    this.analytics.totalRoutes++;

    try {
      // First, try rule-based routing
      const ruleDecision = this.tryRuleBasedRouting(entry, availableBranches);
      if (ruleDecision) {
        this.updateAnalytics(ruleDecision);
        return ruleDecision;
      }

      // Then try strategy-based routing
      const strategyDecision = this.tryStrategyBasedRouting(entry, availableBranches);
      if (strategyDecision) {
        this.updateAnalytics(strategyDecision);
        return strategyDecision;
      }

      // Finally, use fallback routing
      const fallbackDecision = this.getFallbackRouting(availableBranches);
      this.updateAnalytics(fallbackDecision);
      return fallbackDecision;

    } catch (error) {
      this.analytics.failedRoutes++;
      throw new RoutingEngineError(
        `Failed to route log entry: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'ROUTING_FAILED'
      );
    }
  }

  /**
   * Get routing analytics
   */
  getAnalytics(): Readonly<RoutingAnalytics> {
    return { ...this.analytics };
  }

  /**
   * Reset analytics
   */
  resetAnalytics(): void {
    Object.assign(this.analytics, {
      totalRoutes: 0,
      routesByBranch: {},
      routesByStrategy: {},
      fallbackRoutes: 0,
      failedRoutes: 0,
    });
  }

  /**
   * Get all registered strategies
   */
  getStrategies(): readonly RoutingStrategy[] {
    return Array.from(this.strategies.values());
  }

  /**
   * Get all routing rules
   */
  getRules(): readonly RoutingRule[] {
    return [...this.rules];
  }

  private tryRuleBasedRouting(
    entry: LogEntry,
    availableBranches: readonly BranchName[]
  ): RoutingDecision | null {
    for (const rule of this.rules) {
      if (this.matchesCondition(entry, rule.condition) && 
          availableBranches.includes(rule.targetBranch)) {
        return {
          targetBranch: rule.targetBranch,
          strategy: `rule:${rule.name}`,
          confidence: 0.9,
          fallback: false,
        };
      }
    }
    return null;
  }

  private tryStrategyBasedRouting(
    entry: LogEntry,
    availableBranches: readonly BranchName[]
  ): RoutingDecision | null {
    const applicableStrategies = Array.from(this.strategies.values())
      .filter(strategy => strategy.shouldRoute(entry))
      .sort((a, b) => b.priority - a.priority);

    for (const strategy of applicableStrategies) {
      const targetBranch = strategy.selectBranch(entry, availableBranches);
      if (targetBranch && availableBranches.includes(targetBranch)) {
        return {
          targetBranch,
          strategy: strategy.name,
          confidence: Math.max(0.1, 1.0 - (applicableStrategies.length * 0.1)),
          fallback: false,
        };
      }
    }

    return null;
  }

  private getFallbackRouting(availableBranches: readonly BranchName[]): RoutingDecision {
    this.analytics.fallbackRoutes++;

    // Prefer console branch for fallback
    if (availableBranches.includes(BUILTIN_BRANCHES.CONSOLE)) {
      return {
        targetBranch: BUILTIN_BRANCHES.CONSOLE,
        strategy: 'fallback:console',
        confidence: 0.1,
        fallback: true,
      };
    }

    // Use fallback branch if available
    if (availableBranches.includes(BUILTIN_BRANCHES.FALLBACK)) {
      return {
        targetBranch: BUILTIN_BRANCHES.FALLBACK,
        strategy: 'fallback:fallback',
        confidence: 0.1,
        fallback: true,
      };
    }

    // Use any available branch
    if (availableBranches.length > 0) {
      return {
        targetBranch: availableBranches[0],
        strategy: 'fallback:first',
        confidence: 0.05,
        fallback: true,
      };
    }

    throw new RoutingEngineError(
      'No available branches for routing',
      'NO_AVAILABLE_BRANCHES'
    );
  }

  private matchesCondition(entry: LogEntry, condition: RoutingCondition): boolean {
    // Check tag matching
    if (condition.tags) {
      const entryTags = entry.metadata?.tags ?? [];
      const hasMatchingTag = condition.tags.some(tag => entryTags.includes(tag));
      if (!hasMatchingTag) return false;
    }

    // Check error type matching
    if (condition.errorTypes && entry.metadata?.errorType) {
      if (!condition.errorTypes.includes(entry.metadata.errorType)) {
        return false;
      }
    }

    // Check source matching
    if (condition.sources && entry.metadata?.source) {
      if (!condition.sources.includes(entry.metadata.source)) {
        return false;
      }
    }

    // Check pattern matching
    if (condition.pattern) {
      const regex = new RegExp(condition.pattern, 'i');
      if (!regex.test(entry.message)) {
        return false;
      }
    }

    return true;
  }

  private updateAnalytics(decision: RoutingDecision): void {
    const branchKey = decision.targetBranch;
    this.analytics.routesByBranch[branchKey] = (this.analytics.routesByBranch[branchKey] ?? 0) + 1;
    this.analytics.routesByStrategy[decision.strategy] = (this.analytics.routesByStrategy[decision.strategy] ?? 0) + 1;
  }

  private registerBuiltinStrategies(): void {
    // Metadata-based routing strategy
    this.registerStrategy({
      name: 'metadata',
      priority: 100,
      shouldRoute: (entry) => !!entry.metadata?.branch,
      selectBranch: (entry, availableBranches) => {
        const targetBranch = entry.metadata?.branch;
        return targetBranch && availableBranches.includes(targetBranch) ? targetBranch : null;
      },
    });

    // Error type routing strategy
    this.registerStrategy({
      name: 'error-type',
      priority: 80,
      shouldRoute: (entry) => !!entry.metadata?.errorType,
      selectBranch: (entry, availableBranches) => {
        const errorType = entry.metadata?.errorType;
        if (!errorType) return null;

        // Map common error types to branches
        const errorBranchMap: Record<string, BranchName> = {
          'AuthenticationError': BUILTIN_BRANCHES.AUTH,
          'AuthorizationError': BUILTIN_BRANCHES.AUTH,
          'ValidationError': BUILTIN_BRANCHES.API,
          'NetworkError': BUILTIN_BRANCHES.API,
          'DatabaseError': BUILTIN_BRANCHES.DATABASE,
          'UIError': BUILTIN_BRANCHES.UI,
          'RenderError': BUILTIN_BRANCHES.UI,
        };

        const targetBranch = errorBranchMap[errorType];
        return targetBranch && availableBranches.includes(targetBranch) ? targetBranch : null;
      },
    });

    // Tag-based routing strategy
    this.registerStrategy({
      name: 'tag-based',
      priority: 60,
      shouldRoute: (entry) => !!(entry.metadata?.tags?.length),
      selectBranch: (entry, availableBranches) => {
        const tags = entry.metadata?.tags ?? [];
        
        // Map common tags to branches
        const tagBranchMap: Record<string, BranchName> = {
          'auth': BUILTIN_BRANCHES.AUTH,
          'authentication': BUILTIN_BRANCHES.AUTH,
          'login': BUILTIN_BRANCHES.AUTH,
          'api': BUILTIN_BRANCHES.API,
          'request': BUILTIN_BRANCHES.API,
          'response': BUILTIN_BRANCHES.API,
          'ui': BUILTIN_BRANCHES.UI,
          'component': BUILTIN_BRANCHES.UI,
          'render': BUILTIN_BRANCHES.UI,
          'database': BUILTIN_BRANCHES.DATABASE,
          'sql': BUILTIN_BRANCHES.DATABASE,
          'query': BUILTIN_BRANCHES.DATABASE,
        };

        for (const tag of tags) {
          const targetBranch = tagBranchMap[tag.toLowerCase()];
          if (targetBranch && availableBranches.includes(targetBranch)) {
            return targetBranch;
          }
        }

        return null;
      },
    });

    // Source-based routing strategy
    this.registerStrategy({
      name: 'source-based',
      priority: 40,
      shouldRoute: (entry) => !!entry.metadata?.source,
      selectBranch: (entry, availableBranches) => {
        const source = entry.metadata?.source;
        if (!source) return null;

        // Map source patterns to branches
        if (source.includes('auth') || source.includes('login')) {
          return availableBranches.includes(BUILTIN_BRANCHES.AUTH) ? BUILTIN_BRANCHES.AUTH : null;
        }
        if (source.includes('api') || source.includes('route')) {
          return availableBranches.includes(BUILTIN_BRANCHES.API) ? BUILTIN_BRANCHES.API : null;
        }
        if (source.includes('component') || source.includes('ui')) {
          return availableBranches.includes(BUILTIN_BRANCHES.UI) ? BUILTIN_BRANCHES.UI : null;
        }
        if (source.includes('db') || source.includes('database')) {
          return availableBranches.includes(BUILTIN_BRANCHES.DATABASE) ? BUILTIN_BRANCHES.DATABASE : null;
        }

        return null;
      },
    });
  }
}