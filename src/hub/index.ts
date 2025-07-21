/**
 * Hub Infrastructure - Public API Surface
 * P4.3 Server Push Infrastructure
 * 
 * Minimal public exports for hub functionality
 */

// Main orchestrator (primary API)
export { 
  startPushOrchestrator,
  type PushOrchestratorConfig,
  type PushSchedule
} from './push-orchestrator.js';

// Emitter registry (for configuration)
export { 
  EmitterRegistry,
  createEmitterRegistry,
  type EmitterRegistryConfig,
  type HeartbeatConfig,
  type TelemetryConfig,
  type UserActivityConfig
} from './emitters/index.js';

// Core types
export type { HubContext } from './types.js';

// Mark internal implementation as such
/** @internal */
export { PushOrchestratorClass } from './push-orchestrator.js';