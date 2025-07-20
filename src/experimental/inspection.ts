/**
 * Experimental introspection utilities
 * @experimental Subject to change without SemVer guarantees
 */

import { REQUIRED_CORE_EVENTS, REQUIRED_LIFECYCLE_EVENTS, ALL_REQUIRED_EVENTS } from '../internal/required-events.js';

/**
 * Introspection: list required events (core, lifecycle).
 * @experimental Subject to removal; not part of stable API.
 */
export function getRequiredEvents(scope?: 'core' | 'lifecycle'): readonly string[] {
  if (scope === 'core') return REQUIRED_CORE_EVENTS;
  if (scope === 'lifecycle') return REQUIRED_LIFECYCLE_EVENTS;
  return ALL_REQUIRED_EVENTS;
}