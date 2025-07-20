/**
 * Public API Barrel - Single Source of Truth for Browser Module Exports
 * 
 * This file controls the public surface area of the browser console API.
 * Only exports listed here are considered public and stable.
 */

// Single authoritative initialization function
export { initializeJitterbug } from './bootstrap.js';

// Utility functions for programmatic use
export { ensureJitterbugReady, emitJitterbugEvent } from './utils.js';

// Type definitions needed by external consumers
export type {
  JitterbugEvent,
  JitterbugGlobal,
  JitterbugDiagnostics,
  EmitOptions,
  EventFilter,
  HelpEntry
} from './types.js';

// Branded types for type-safe payloads
export type {
  StepId,
  PlanHash,
  BranchName,
  EventId,
  QuarantinedPayload
} from './branded-types.js';

// Schema validation exports
export type {
  EventType,
  PayloadOf,
  StepStartedPayload,
  StepCompletedPayload,
  ErrorPayload,
  DebuggerReadyPayload
} from './schema-registry.js';

export {
  validateEventPayload,
  getQuarantinedCount
} from './schema-registry.js';