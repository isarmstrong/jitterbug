/**
 * Jitterbug - Edge-first debugging system for Next.js
 * Version 0.2.0
 * 
 * Stable public API surface - Curated exports only
 * 
 * Node.js 20+ required (optimized for Node 22)
 * Compatible with React 18 & 19 (SSE implementation will need shimming)
 */

export const VERSION = '0.2.0';

/**
 * Initialize the Jitterbug runtime.
 * @stable
 */
export { initializeJitterbug } from './browser/bootstrap.js';

/**
 * Wait until initialization completes.
 * @stable
 */
export { ensureJitterbugReady } from './browser/utils.js';

/**
 * Emit a jitterbug event (low-level).
 * @experimental Use timeline abstractions instead when available.
 */
export { emitJitterbugEvent } from './browser/utils.js';

// Core types
/** @stable */
export type { JitterbugEvent, JitterbugGlobal, JitterbugDiagnostics } from './browser/types.js';

/**
 * Event emission with schema validation.
 * @experimental
 */
export { safeEmit as experimentalSafeEmit } from './browser/schema-registry.js';