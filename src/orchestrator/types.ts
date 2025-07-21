/**
 * Core type definitions for the Jitterbug orchestrator system
 */

// Branded types following POCMA patterns
export type BranchName = string & { readonly __brand: 'BranchName' };
export type EventType = string & { readonly __brand: 'EventType' };
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

// Core log entry interface
export interface LogEntry {
  readonly id: string;
  readonly timestamp: number;
  readonly level: LogLevel;
  readonly message: string;
  readonly context?: Record<string, unknown>;
  readonly metadata?: LogMetadata;
  readonly stack?: string;
}

// Metadata for routing decisions
export interface LogMetadata {
  readonly branch?: BranchName;
  readonly tags?: readonly string[];
  readonly source?: string;
  readonly errorType?: string;
  readonly userId?: string;
  readonly sessionId?: string;
}

// Branch lifecycle states
export type BranchState = 'initializing' | 'active' | 'suspended' | 'failed' | 'destroyed';

// Debug branch interface
export interface DebugBranch {
  readonly name: BranchName;
  readonly version: string;
  readonly capabilities: readonly string[];
  
  // Lifecycle methods
  initialize(config?: Record<string, unknown>): Promise<void>;
  cleanup(): Promise<void>;
  suspend(): Promise<void>;
  resume(): Promise<void>;
  
  // Core functionality
  processLog(entry: LogEntry): Promise<void>;
  handleEvent(event: BranchEvent): Promise<void>;
  
  // State management
  getState(): BranchState;
  getConfig(): Record<string, unknown>;
}

// Branch metadata for registry
export interface BranchMetadata {
  readonly name: BranchName;
  readonly version: string;
  readonly capabilities: readonly string[];
  readonly state: BranchState;
  readonly registeredAt: number;
  readonly config: Record<string, unknown>;
}

// Routing strategy interface
export interface RoutingStrategy {
  readonly name: string;
  readonly priority: number;
  shouldRoute(entry: LogEntry): boolean;
  selectBranch(entry: LogEntry, availableBranches: readonly BranchName[]): BranchName | null;
}

// Event system interfaces
export interface BranchEvent {
  readonly type: EventType;
  readonly source: BranchName;
  readonly timestamp: number;
  readonly data?: Record<string, unknown>;
}

export interface EventSubscription {
  readonly id: string;
  readonly eventType: EventType;
  readonly namespace?: string;
  readonly handler: EventHandler;
}

export type EventHandler = (event: BranchEvent) => Promise<void> | void;

// Configuration interfaces
export interface OrchestratorConfig {
  readonly enabledBranches?: readonly BranchName[];
  readonly defaultLogLevel?: LogLevel;
  readonly routingRules?: readonly RoutingRule[];
  readonly eventBusConfig?: EventBusConfig;
  readonly errorHandling?: ErrorHandlingConfig;
}

export interface RoutingRule {
  readonly name: string;
  readonly priority: number;
  readonly condition: RoutingCondition;
  readonly targetBranch: BranchName;
}

export interface RoutingCondition {
  readonly tags?: readonly string[];
  readonly errorTypes?: readonly string[];
  readonly sources?: readonly string[];
  readonly pattern?: string;
}

export interface EventBusConfig {
  readonly maxListeners?: number;
  readonly enableHistory?: boolean;
  readonly historySize?: number;
}

export interface ErrorHandlingConfig {
  readonly circuitBreakerThreshold?: number;
  readonly circuitBreakerTimeout?: number;
  readonly enableGracefulDegradation?: boolean;
  readonly fallbackBranch?: BranchName;
}

// Utility type helpers
export function createBranchName(name: string): BranchName {
  return name as BranchName;
}

export function createEventType(type: string): EventType {
  return type as EventType;
}

// Server push event interfaces - P4.3
export interface ServerHeartbeatEvent {
  readonly type: 'server.heartbeat';
  readonly payload: {
    readonly ts: number;
    readonly serverUptime: number;
    readonly stats?: {
      readonly activeConnections: number;
      readonly memoryUsage: number;
    };
  };
  readonly metadata: {
    readonly emitter: 'heartbeat';
    readonly version: string;
  };
}

export interface TelemetryUpdateEvent {
  readonly type: 'telemetry.update';
  readonly payload: {
    readonly timestamp: number;
    readonly system: {
      readonly memoryUsage: number;
      readonly cpuUsage: number;
      readonly uptime: number;
    };
    readonly application: {
      readonly activeConnections: number;
      readonly totalEvents: number;
      readonly errorCount: number;
    };
  };
  readonly metadata: {
    readonly emitter: 'telemetry';
    readonly version: string;
    readonly process?: {
      readonly pid: number;
      readonly nodeVersion: string;
    };
  };
}

export interface UserActivityUpdateEvent {
  readonly type: 'user_activity.update';
  readonly payload: {
    readonly totalUsers: number;
    readonly activeConnections: number;
    readonly recentActivity: readonly UserActivity[];
    readonly topActions: readonly { action: string; count: number }[];
  };
  readonly metadata: {
    readonly emitter: 'user_activity';
    readonly version: string;
    readonly generatedAt: number;
    readonly detailed?: {
      readonly sessionCount: number;
      readonly totalActivityRecords: number;
    };
  };
}

export interface UserActivity {
  readonly sessionId: string;
  readonly activityType: 'page_view' | 'filter_change' | 'debug_toggle' | 'connection_event';
  readonly timestamp: number;
  readonly metadata: Record<string, unknown>;
}

export type ServerPushEvent = 
  | ServerHeartbeatEvent 
  | TelemetryUpdateEvent 
  | UserActivityUpdateEvent;

// Built-in event types
export const BUILTIN_EVENTS = {
  BRANCH_REGISTERED: createEventType('branch:registered'),
  BRANCH_UNREGISTERED: createEventType('branch:unregistered'),
  BRANCH_STATE_CHANGED: createEventType('branch:state_changed'),
  ORCHESTRATOR_ERROR: createEventType('orchestrator:error'),
  ROUTING_FAILED: createEventType('routing:failed'),
  // P4.3 server push events
  SERVER_HEARTBEAT: createEventType('server.heartbeat'),
  TELEMETRY_UPDATE: createEventType('telemetry.update'),
  USER_ACTIVITY_UPDATE: createEventType('user_activity.update'),
} as const;

// Built-in branch names
export const BUILTIN_BRANCHES = {
  AUTH: createBranchName('auth'),
  API: createBranchName('api'),
  UI: createBranchName('ui'),
  DATABASE: createBranchName('database'),
  CONSOLE: createBranchName('console'),
  FALLBACK: createBranchName('fallback'),
} as const;