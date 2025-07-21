/**
 * Hub Infrastructure - Public API Surface
 * P4.3 Server Push Infrastructure
 * 
 * Controlled exports with deprecation path
 */

import { PushOrchestratorV2, type PushOrchestratorConfig as V2Config } from './core/push-orchestrator-v2.js';
import { getRegistry, sealRegistry, registerEmitter } from './emitters/registry.js';
import { HeartbeatEmitter } from './emitters/heartbeat.js';
import { TelemetryEmitter } from './emitters/telemetry.js';
import { UserActivityEmitter } from './emitters/user-activity.js';

// === P4.3 Production-Grade Push (NEW) ===

// Main factory function (recommended API)
export function createPushOrchestrator(config?: Partial<V2Config>): PushOrchestratorV2 {
  return new PushOrchestratorV2(config);
}

/** @internal Low-level emitter factory */
function createHeartbeatEmitter(config?: { intervalMs?: number }): HeartbeatEmitter {
  return new HeartbeatEmitter(config);
}

/** @internal Low-level emitter factory */
function createTelemetryEmitter(config?: { intervalMs?: number }): TelemetryEmitter {
  return new TelemetryEmitter(config);
}

/** @internal Low-level emitter factory */
function createUserActivityEmitter(config?: { intervalMs?: number; batchSize?: number }): UserActivityEmitter {
  return new UserActivityEmitter(config);
}

// Bootstrap function with built-in emitters (auto-seals registry)
export function bootstrapPushSystem(options?: {
  enableHeartbeat?: boolean;
  enableTelemetry?: boolean; 
  enableUserActivity?: boolean;
}): void {
  const { enableHeartbeat = true, enableTelemetry = true, enableUserActivity = true } = options || {};
  
  if (!getRegistry().isSealed()) {
    // Register default emitters
    if (enableHeartbeat) {
      const heartbeat = createHeartbeatEmitter();
      registerEmitter(heartbeat);
    }
    if (enableTelemetry) {
      const telemetry = createTelemetryEmitter();
      registerEmitter(telemetry);
    }
    if (enableUserActivity) {
      const userActivity = createUserActivityEmitter();
      registerEmitter(userActivity);
    }
    
    sealRegistry();
  }
}

// Type exports (minimal)
export type { PushOrchestratorConfig } from './core/push-orchestrator-v2.js';

// === Legacy API (DEPRECATED) ===

/** @deprecated Use createPushOrchestrator() factory instead */
export { 
  startPushOrchestrator,
  type PushSchedule
} from './push-orchestrator.js';

/** @deprecated Use createHeartbeatEmitter() factory instead */
export { 
  EmitterRegistry,
  createEmitterRegistry,
  type EmitterRegistryConfig,
  type HeartbeatConfig,
  type TelemetryConfig,
  type UserActivityConfig
} from './emitters/index.js';

/** @deprecated Use new push system types */
export type { HubContext } from './types.js';