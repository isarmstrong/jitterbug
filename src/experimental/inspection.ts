/**
 * Experimental introspection utilities
 * @experimental Subject to change without SemVer guarantees
 */

import { REQUIRED_CORE_EVENTS, REQUIRED_LIFECYCLE_EVENTS, ALL_REQUIRED_EVENTS } from '../internal/required-events.js';

/**
 * Get required events for a given scope
 * @experimental Subject to change without SemVer guarantees
 */
export function getRequiredEvents(scope?: 'core' | 'lifecycle'): readonly string[] {
  if (scope === 'core') return REQUIRED_CORE_EVENTS;
  if (scope === 'lifecycle') return REQUIRED_LIFECYCLE_EVENTS;
  return ALL_REQUIRED_EVENTS;
}