/**
 * Timing wrapper utility for runtime-core instrumentation
 * @internal
 */

import { emitJitterbugEvent } from '../browser/utils.js';

/**
 * Error classification for structured error reporting
 */
function classifyError(error: unknown): string {
  if (error instanceof Error) {
    // Common error patterns
    if (error.message.includes('timeout')) return 'TIMEOUT';
    if (error.message.includes('network')) return 'NETWORK';
    if (error.message.includes('validation')) return 'VALIDATION';
    if (error.message.includes('permission')) return 'PERMISSION';
    if (error.message.includes('not found')) return 'NOT_FOUND';
    if (error.name === 'TypeError') return 'TYPE_ERROR';
    if (error.name === 'ReferenceError') return 'REFERENCE_ERROR';
    return 'GENERIC_ERROR';
  }
  return 'UNKNOWN_ERROR';
}

/**
 * Unified timing wrapper for instrumented operations
 * Handles both sync and async functions automatically
 * Emits started, completed/failed events with timing and error classification
 */
export function withTiming<T>(
  typeBase: string,
  context: Record<string, unknown>,
  fn: () => T | Promise<T>
): T extends Promise<infer U> ? Promise<U> : Promise<T> {
  // Emit started event
  emitJitterbugEvent(`${typeBase}.started`, context);
  
  const start = performance.now();
  
  try {
    const result = fn();
    
    // Handle both sync and async results
    if (result instanceof Promise) {
      return result
        .then((value) => {
          // Emit completed event with timing
          emitJitterbugEvent(`${typeBase}.completed`, {
            ...context,
            elapsedMs: Math.round(performance.now() - start)
          });
          return value;
        })
        .catch((err: unknown) => {
          // Emit failed event with timing and error classification
          emitJitterbugEvent(`${typeBase}.failed`, {
            ...context,
            elapsedMs: Math.round(performance.now() - start),
            errorCode: classifyError(err),
            message: err instanceof Error ? err.message : String(err)
          });
          throw err;
        }) as any;
    } else {
      // Synchronous path
      emitJitterbugEvent(`${typeBase}.completed`, {
        ...context,
        elapsedMs: Math.round(performance.now() - start)
      });
      return Promise.resolve(result) as any;
    }
  } catch (err: unknown) {
    // Synchronous error path
    emitJitterbugEvent(`${typeBase}.failed`, {
      ...context,
      elapsedMs: Math.round(performance.now() - start),
      errorCode: classifyError(err),
      message: err instanceof Error ? err.message : String(err)
    });
    throw err;
  }
}