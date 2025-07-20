/**
 * Debug Control API
 * 
 * Provides debug level gating and enable/disable controls for Task 3.3.
 * Integrates with existing event emission system.
 */

import { 
  updateDebugEnabled, 
  updateDebugLevel, 
  getDebugState, 
  validateLevel, 
  DebugLevels 
} from './debug-state.js';
import { safeEmit } from './schema-registry.js';

// Event level mapping for existing orchestrator events
const defaultEventLevels: Record<string, number> = {
  // Core lifecycle - INFO level
  'orchestrator.core.initialization.started': DebugLevels.INFO,
  'orchestrator.core.initialization.completed': DebugLevels.INFO,
  'orchestrator.core.shutdown.started': DebugLevels.INFO,
  'orchestrator.core.shutdown.completed': DebugLevels.INFO,
  
  // Failures - ERROR level
  'orchestrator.core.initialization.failed': DebugLevels.ERROR,
  'orchestrator.core.shutdown.failed': DebugLevels.ERROR,
  'orchestrator.plan.build.failed': DebugLevels.ERROR,
  'orchestrator.plan.execution.failed': DebugLevels.ERROR,
  'orchestrator.step.failed': DebugLevels.ERROR,
  'orchestrator.step.dispatch.failed': DebugLevels.ERROR,
  'orchestrator.log.processing.failed': DebugLevels.ERROR,
  'orchestrator.branch.registration.failed': DebugLevels.ERROR,
  'orchestrator.branch.unregistration.failed': DebugLevels.ERROR,
  
  // Plan operations - INFO level
  'orchestrator.plan.build.started': DebugLevels.INFO,
  'orchestrator.plan.build.completed': DebugLevels.INFO,
  'orchestrator.plan.execution.started': DebugLevels.INFO,
  'orchestrator.plan.execution.completed': DebugLevels.INFO,
  'orchestrator.plan.finalized': DebugLevels.INFO,
  
  // Step operations - DEBUG level
  'orchestrator.step.started': DebugLevels.DEBUG,
  'orchestrator.step.completed': DebugLevels.DEBUG,
  'orchestrator.step.dispatch.started': DebugLevels.DEBUG,
  'orchestrator.step.dispatch.completed': DebugLevels.DEBUG,
  
  // Branch operations - INFO level
  'orchestrator.branch.registration.started': DebugLevels.INFO,
  'orchestrator.branch.registration.completed': DebugLevels.INFO,
  'orchestrator.branch.unregistration.started': DebugLevels.INFO,
  'orchestrator.branch.unregistration.completed': DebugLevels.INFO,
  'orchestrator.branch.lifecycle.created': DebugLevels.INFO,
  'orchestrator.branch.lifecycle.activated': DebugLevels.INFO,
  'orchestrator.branch.lifecycle.deactivated': DebugLevels.INFO,
  'orchestrator.branch.lifecycle.enabled': DebugLevels.INFO,
  'orchestrator.branch.lifecycle.disabled': DebugLevels.INFO,
  'orchestrator.branch.lifecycle.deleted': DebugLevels.INFO,
  
  // Log processing - DEBUG level
  'orchestrator.log.processing.started': DebugLevels.DEBUG,
  'orchestrator.log.processing.completed': DebugLevels.DEBUG,
  
  // Debug control events - TRACE level (but bypass gating)
  'orchestrator.debug.enabled': DebugLevels.TRACE,
  'orchestrator.debug.disabled': DebugLevels.TRACE,
  'orchestrator.debug.level.changed': DebugLevels.TRACE,
  'orchestrator.debug.validation.failed': DebugLevels.ERROR // Always emit validation errors
};

/**
 * Emit event with automatic level assignment and gating
 */
/** @internal */
function emitWithAutoLevel(eventName: string, payload: any): void {
  const eventLevel = defaultEventLevels[eventName] ?? DebugLevels.INFO;
  guardedEmit(eventLevel, eventName, payload);
}

/**
 * Core gating function - checks if event should be emitted based on debug state
 */
/** @internal */
function guardedEmit(eventLevel: number, eventName: string, payload: any): void {
  const { enabled, level } = getDebugState();
  
  // Always emit validation failures and debug control events (bypass gating for diagnostics)
  const isDebugControl = eventName.startsWith('orchestrator.debug.');
  const isValidationError = eventName === 'orchestrator.debug.validation.failed';
  
  if (!enabled && !isDebugControl && !isValidationError) return;
  if (eventLevel > level && !isDebugControl && !isValidationError) return;
  
  safeEmit(eventName as any, payload);
}

/**
 * Direct emit bypass for critical diagnostic events
 */
function emitBypassGate(eventName: string, payload: any): void {
  safeEmit(eventName as any, payload);
}

/**
 * Experimental debug control API
 * @experimental Subject to change without SemVer guarantees
 */
/** @experimental Subject to change without SemVer guarantees */
export const experimentalDebug = {
  /**
   * Enable debug event emission
   * @experimental
   */
  enable(by: 'api' | 'config' = 'api') {
    const { changed, prev } = updateDebugEnabled(true, by);
    if (changed) {
      emitBypassGate('orchestrator.debug.enabled', { prev, by, timestamp: new Date().toISOString() });
    }
    return getDebugState();
  },

  /**
   * Disable debug event emission
   * @experimental
   */
  disable(by: 'api' | 'config' = 'api') {
    const { changed, prev } = updateDebugEnabled(false, by);
    if (changed) {
      emitBypassGate('orchestrator.debug.disabled', { prev, by, timestamp: new Date().toISOString() });
    }
    return getDebugState();
  },

  /**
   * Check if debug emission is enabled
   * @experimental
   */
  isEnabled(): boolean {
    return getDebugState().enabled;
  },

  /**
   * Set debug level (0-5)
   * @experimental
   */
  setLevel(level: unknown, by: 'api' | 'config' = 'api') {
    if (!validateLevel(level)) {
      emitBypassGate('orchestrator.debug.validation.failed', { 
        reason: 'INVALID_LEVEL', 
        received: level, 
        expected: 'integer 0-5',
        by,
        timestamp: new Date().toISOString() 
      });
      throw new Error(`Invalid debug level: ${level}. Expected integer 0-5.`);
    }
    
    const { changed, prev } = updateDebugLevel(level, by);
    if (changed) {
      emitBypassGate('orchestrator.debug.level.changed', { 
        prev, 
        next: level, 
        by, 
        timestamp: new Date().toISOString() 
      });
    }
    return getDebugState();
  },

  /**
   * Get current debug level
   * @experimental
   */
  getLevel(): number {
    return getDebugState().level;
  },

  /**
   * Debug level constants
   * @experimental
   */
  levels: DebugLevels,

  /**
   * Get current debug state (readonly)
   * @experimental
   */
  getState() {
    return getDebugState();
  },

  /**
   * Internal testing helpers
   * @internal
   */
  __testing: {
    guardedEmit,
    emitWithAutoLevel,
    getEventLevel: (eventName: string) => defaultEventLevels[eventName] ?? DebugLevels.INFO
  }
};