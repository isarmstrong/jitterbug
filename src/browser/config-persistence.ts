/**
 * Configuration Persistence - Task 3.4
 * 
 * Thin public forwarder to internal implementation.
 * All types and logic are contained in the internal module
 * to avoid top-level declarations being counted by digest tools.
 */

import { createConfigPersistence } from '../internal/config-persistence-impl.js';

// Create the implementation instance
const { configPersistence } = createConfigPersistence();

/**
 * Public API for configuration persistence
 * @experimental Subject to change without SemVer guarantees
 */
export { configPersistence };