/**
 * Experimental introspection utilities
 * @experimental Subject to change without SemVer guarantees
 */

// Inlined required events constants (previously from internal/required-events.js)
const REQUIRED_CORE_EVENTS = [
  'orchestrator.plan.build.started',
  'orchestrator.plan.build.completed', 
  'orchestrator.plan.build.failed',
  'orchestrator.plan.execution.started',
  'orchestrator.plan.execution.completed',
  'orchestrator.plan.execution.failed'
] as const;

const REQUIRED_LIFECYCLE_EVENTS = [
  'orchestrator.core.initialization.started',
  'orchestrator.core.initialization.completed',
  'orchestrator.core.shutdown.started',
  'orchestrator.core.shutdown.completed'
] as const;

const ALL_REQUIRED_EVENTS = [...REQUIRED_CORE_EVENTS, ...REQUIRED_LIFECYCLE_EVENTS] as const;

/**
 * Introspection: list required events (core, lifecycle).
 * @experimental Subject to removal; not part of stable API.
 */
export function getRequiredEvents(scope?: 'core' | 'lifecycle'): readonly string[] {
  if (scope === 'core') return REQUIRED_CORE_EVENTS;
  if (scope === 'lifecycle') return REQUIRED_LIFECYCLE_EVENTS;
  return ALL_REQUIRED_EVENTS;
}