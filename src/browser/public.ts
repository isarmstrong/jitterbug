/**
 * Public API Barrel - Curated Browser Console API Surface
 * 
 * POLICY: Only exports listed here are considered public and stable.
 * All other exports are internal implementation details.
 * 
 * Target: ≤10 public exports total
 */

// Primary integration entry point
export { initializeJitterbug } from './bootstrap.js';

// Utility functions for programmatic use (minimal set)
export { ensureJitterbugReady, emitJitterbugEvent } from './utils.js';

// Experimental features (Task 3.4)
export { configPersistence } from './config-persistence.js';

// Re-export experimental helpers for backwards compatibility
export { safeEmit as experimentalSafeEmit } from './schema-registry.js';

// Task 3.5 - Log Inspection (placeholder - will be uncommented when implementing)
// export { logInspector } from './logs/index.js';

// Essential type definitions for TypeScript consumers
export type {
  JitterbugEvent,
  JitterbugGlobal,
  JitterbugDiagnostics,
  EmitOptions,
  EventFilter
} from './types.js';

// Internal types NOT exported:
// - All branded types (PlanHash, StepId, etc.) - internal only
// - Schema registry types - internal validation details  
// - Quarantine utilities - internal error handling
// - Validators - use schema validation instead
// - HelpEntry - internal help system detail