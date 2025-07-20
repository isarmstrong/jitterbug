/**
 * Internal required events definitions - not part of public API
 * @internal
 */

export const REQUIRED_CORE_EVENTS = [
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

export const REQUIRED_LIFECYCLE_EVENTS = [
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

export const ALL_REQUIRED_EVENTS = [...REQUIRED_CORE_EVENTS, ...REQUIRED_LIFECYCLE_EVENTS] as const;