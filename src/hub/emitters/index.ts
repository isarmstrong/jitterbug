/**
 * Emitter Registry - Public API Surface
 * P4.3 Server Push Infrastructure
 * 
 * Only essential exports for external usage
 */

// Public registry interface (main API)
export { 
  EmitterRegistry, 
  createEmitterRegistry,
  type EmitterRegistryConfig,
  type EmitterInstance,
  type EmitterType
} from './emitterRegistry.js';

// Essential configuration types for users
export type { HeartbeatConfig } from './heartbeatEmitter.js';
export type { TelemetryConfig } from './telemetryEmitter.js';
export type { UserActivityConfig } from './userActivityEmitter.js';

// Mark all implementation details as internal
/** @internal */
export { createHeartbeatEmitter } from './heartbeatEmitter.js';
/** @internal */
export { createTelemetryEmitter } from './telemetryEmitter.js';
/** @internal */
export { createUserActivityEmitter } from './userActivityEmitter.js';