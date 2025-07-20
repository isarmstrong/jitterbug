/**
 * Jitterbug - Edge-first debugging system for Next.js
 * Version 0.2.0
 * 
 * A clean orchestrator-based implementation for unified client/server logging
 * 
 * Node.js 20+ required (optimized for Node 22)
 * Compatible with React 18 & 19 (SSE implementation will need shimming)
 */

export const VERSION = '0.2.0';

// Core orchestrator exports
export {
  CoreOrchestrator,
  OrchestratorError,
  BranchRegistry,
  BranchRegistryError,
  RoutingEngine,
  RoutingEngineError,
  EventBus,
  NamespacedEventBus,
  EventBusError,
  ConfigurationManager,
  ConfigurationError,
  createBranchName,
  createEventType,
  BUILTIN_EVENTS,
  BUILTIN_BRANCHES,
} from './orchestrator/index.js';

// Error taxonomy exports
export {
  BaseOrchestratorError,
  OrchestratorConfigurationError,
  DependencyError,
  TransientError,
  InvariantError,
  CancelledError,
  ValidationError,
  isOrchestratorError,
  isRetryableError,
  getErrorMetrics
} from './orchestrator/index.js';

// Type exports
export type {
  BranchName,
  EventType,
  LogLevel,
  LogEntry,
  LogMetadata,
  BranchState,
  DebugBranch,
  BranchMetadata,
  RoutingStrategy,
  BranchEvent,
  EventSubscription,
  EventHandler,
  OrchestratorConfig,
  RoutingRule,
  RoutingCondition,
  EventBusConfig,
  ErrorHandlingConfig,
} from './orchestrator/index.js';

// Browser console API exports
export {
  initializeJitterbug as initializeBrowserAPI,
  ensureJitterbugReady,
  emitJitterbugEvent
} from './browser/index.js';

export type {
  JitterbugEvent,
  JitterbugGlobal,
  JitterbugDiagnostics,
  EmitOptions,
  EventFilter
} from './browser/index.js';

/**
 * Initialize Jitterbug orchestrator with the provided configuration
 */
export async function initializeJitterbug(config?: import('./orchestrator/index.js').OrchestratorConfig): Promise<import('./orchestrator/index.js').CoreOrchestrator> {
  const { CoreOrchestrator } = await import('./orchestrator/index.js');
  const orchestrator = new CoreOrchestrator(config);
  await orchestrator.initialize();
  
  // Mark browser API as ready if in browser environment
  if (typeof window !== 'undefined' && window.jitterbug) {
    window.jitterbug.ready();
  }
  
  return orchestrator;
}