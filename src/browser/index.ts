/**
 * Browser Console API Module
 * 
 * Exports for the window.jitterbug interface and related browser debugging utilities.
 */

// Bootstrap should auto-initialize, but export for manual control
export { initializeJitterbug } from './bootstrap.js';

// Export types for TypeScript consumers
export type {
  JitterbugEvent,
  JitterbugGlobal,
  JitterbugDiagnostics,
  EmitOptions,
  EventFilter,
  HelpEntry
} from './types.js';

// Utility function to ensure jitterbug is ready
export function ensureJitterbugReady(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      console.warn('Jitterbug: Not in browser environment');
      resolve();
      return;
    }

    if (!window.jitterbug) {
      console.warn('Jitterbug: API not initialized');
      resolve();
      return;
    }

    if (window.jitterbug.diagnostics().ready) {
      resolve();
      return;
    }

    // Wait for ready event
    const unsubscribe = window.jitterbug.subscribe((event) => {
      if (event.type === 'orchestrator.debugger.ready') {
        unsubscribe();
        resolve();
      }
    });
  });
}

// Utility to emit from TypeScript code with proper typing
export function emitJitterbugEvent<T extends string, P extends Record<string, unknown>>(
  type: T,
  payload?: P,
  opts?: EmitOptions
): string | null {
  if (typeof window === 'undefined' || !window.jitterbug) {
    return null;
  }

  return window.jitterbug.emit(type, payload, opts);
}

// Re-export for convenience
import type { EmitOptions } from './types.js';