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

// Implementation details are NOT exported (internalized)