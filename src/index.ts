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

// Stable API (≤5 exports)
export { initializeJitterbug } from './browser/bootstrap.js';
export { ensureJitterbugReady, emitJitterbugEvent } from './browser/utils.js';

// Core types
export type { JitterbugEvent, JitterbugGlobal, JitterbugDiagnostics } from './browser/types.js';

// Experimental APIs (≤2 exports)
/** @experimental Subject to change without SemVer guarantees */
export { safeEmit as experimentalSafeEmit } from './browser/schema-registry.js';