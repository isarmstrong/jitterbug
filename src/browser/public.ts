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
/** @deprecated Use debug.config */
export { configPersistence } from './config-persistence.js';

// Experimental emission utilities  
/** @deprecated Use debug.emit */
export { safeEmit as experimentalSafeEmit } from './schema-registry.js';

// Task 3.5 - Log Inspection Phase 1  
/** @deprecated Use debug.logs */
export { logInspector } from './public-logs.js';

// Task 4 - Emoji Console Transport
/** @deprecated Use debug.emojiConsole */
export { experimentalEmojiConsole } from './transports/emoji-console.js';

// Public type facades (surface control)
export type {
  DebugConfigPublic,
  ConfigIOResult
} from './public-types.js';

// Essential type definitions for TypeScript consumers
export type {
  JitterbugEvent,
  JitterbugGlobal,
  JitterbugDiagnostics,
  EmitOptions,
  EventFilter
} from './types.js';

import { logInspector } from './public-logs.js';
import { experimentalEmojiConsole } from './transports/emoji-console.js';
import { configPersistence } from './config-persistence.js';
import { safeEmit } from './schema-registry.js';

// Phase C: Debug Umbrella Consolidation
/** @experimental Unified debug interface - consolidates logs, console, config, and emit */
export const debug = {
  /** @experimental Log inspection and export interface */
  logs: logInspector,
  /** @experimental Beautiful emoji console transport */
  emojiConsole: experimentalEmojiConsole,
  /** @experimental Configuration persistence interface */
  config: {
    load: configPersistence.load.bind(configPersistence),
    save: configPersistence.save.bind(configPersistence),
    reset: configPersistence.reset.bind(configPersistence),
    snapshot: configPersistence.snapshot.bind(configPersistence),
  },
  /** @experimental Safe event emission utility */
  emit: safeEmit
} as const;

// Internal types NOT exported:
// - All branded types (PlanHash, StepId, etc.) - internal only
// - Schema registry types - internal validation details  
// - Quarantine utilities - internal error handling
// - Validators - use schema validation instead
// - HelpEntry - internal help system detail