/**
 * Orchestrator module exports
 */

// Core orchestrator
export { CoreOrchestrator, OrchestratorError } from './core-orchestrator.js';

// Component exports
export { BranchRegistry, BranchRegistryError } from './branch-registry.js';
export { RoutingEngine, RoutingEngineError } from './routing-engine.js';
export { EventBus, NamespacedEventBus, EventBusError } from './event-bus.js';
export { ConfigurationManager, ConfigurationError } from './config-manager.js';

// Type exports
export type * from './types.js';

// Re-export commonly used utilities
export {
  createBranchName,
  createEventType,
  BUILTIN_EVENTS,
  BUILTIN_BRANCHES,
} from './types.js';