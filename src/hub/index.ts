/**
 * Hub Infrastructure - Public API Surface
 * P4.3 Server Push Infrastructure
 * 
 * Controlled exports with deprecation path
 */

import { PushOrchestratorV2, type PushOrchestratorConfig as V2Config } from './core/push-orchestrator-v2.js';
import { getRegistry, sealRegistry } from './emitters/registry.js';
import { HeartbeatEmitter } from './emitters/heartbeat.js';
import { TelemetryEmitter } from './emitters/telemetry.js';
import { UserActivityEmitter } from './emitters/user-activity.js';

// === P4.3 Production-Grade Push (NEW) ===

// Factory functions (recommended API)
export function createPushOrchestrator(config?: Partial<V2Config>): PushOrchestratorV2 {
  return new PushOrchestratorV2(config);
}

export function createHeartbeatEmitter(config?: { intervalMs?: number }): HeartbeatEmitter {
  return new HeartbeatEmitter(config);
}

export function createTelemetryEmitter(config?: { intervalMs?: number }): TelemetryEmitter {
  return new TelemetryEmitter(config);
}

export function createUserActivityEmitter(config?: { intervalMs?: number; batchSize?: number }): UserActivityEmitter {
  return new UserActivityEmitter(config);
}

// Bootstrap function (auto-seals registry)
export function bootstrapPushSystem(): void {
  if (!getRegistry().isSealed()) {
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