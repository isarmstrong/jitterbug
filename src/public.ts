/**
 * Stable public API surface for Jitterbug
 * Core runtime exports only - target ≤8 exports
 */

// Core types for external consumption
export type { JitterbugEvent, JitterbugGlobal, JitterbugDiagnostics } from './browser/types.js';
export type { EmitOptions, EventFilter } from './browser/types.js';

// Core runtime functions  
export { initializeJitterbug } from './browser/bootstrap.js';
export { ensureJitterbugReady, emitJitterbugEvent } from './browser/utils.js';

// Experimental APIs (subject to change)
export { safeEmit as experimentalSafeEmit } from './browser/schema-registry.js';

/**
 * Initialize Jitterbug orchestrator with the provided configuration
 */
export async function initializeJitterbugOrchestrator(config?: import('./orchestrator/index.js').OrchestratorConfig): Promise<import('./orchestrator/index.js').CoreOrchestrator> {
  const { CoreOrchestrator } = await import('./orchestrator/index.js');
  const orchestrator = new CoreOrchestrator(config);
  await orchestrator.initialize();
  
  // Mark browser API as ready if in browser environment
  if (typeof window !== 'undefined' && window.jitterbug) {
    window.jitterbug.ready();
  }
  
  return orchestrator;
}

/**
 * @experimental Subject to change without SemVer guarantees.
 * Get required events for a given scope
 */
export function getRequiredEvents(scope?: 'core' | 'lifecycle'): readonly string[] {
  // Hardcoded frozen snapshot to avoid exposing internal arrays
  const core = [
    'orchestrator.plan.build.started',
    'orchestrator.plan.build.completed', 
    'orchestrator.plan.build.failed',
    'orchestrator.plan.execution.started',
    'orchestrator.plan.execution.completed',
    'orchestrator.plan.execution.failed',
    'orchestrator.plan.finalized',
    'orchestrator.step.started',
    'orchestrator.step.completed',
    'orchestrator.step.failed',
    'orchestrator.step.dispatch.started',
    'orchestrator.step.dispatch.completed',
    'orchestrator.step.dispatch.failed'
  ] as const;
  
  const lifecycle = [
    'orchestrator.core.initialization.started',
    'orchestrator.core.initialization.completed',
    'orchestrator.core.initialization.failed',
    'orchestrator.core.shutdown.started',
    'orchestrator.core.shutdown.completed',
    'orchestrator.core.shutdown.failed',
    'orchestrator.branch.registration.started',
    'orchestrator.branch.registration.completed',
    'orchestrator.branch.registration.failed',
    'orchestrator.branch.unregistration.started',
    'orchestrator.branch.unregistration.completed',
    'orchestrator.branch.unregistration.failed',
    'orchestrator.log.processing.started',
    'orchestrator.log.processing.completed',
    'orchestrator.log.processing.failed'
  ] as const;
  
  if (scope === 'core') return core;
  if (scope === 'lifecycle') return lifecycle;
  return [...core, ...lifecycle];
}