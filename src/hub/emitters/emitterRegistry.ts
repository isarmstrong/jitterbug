/**
 * Emitter Registry - P4.3 Server Push Infrastructure
 * Central registry for managing server-originated event emitters
 */

import { createHeartbeatEmitter, type HeartbeatConfig } from './heartbeatEmitter.js';
import { createTelemetryEmitter, type TelemetryConfig } from './telemetryEmitter.js';
import { createUserActivityEmitter, type UserActivityConfig } from './userActivityEmitter.js';
import type { HubContext } from '../types.js';

export type EmitterType = 'heartbeat' | 'telemetry' | 'user_activity';

export interface EmitterInstance {
  readonly type: string;
  readonly config: Record<string, unknown>;
  readonly emit: (ctx: HubContext) => Promise<void>;
}

export interface EmitterRegistryConfig {
  readonly heartbeat?: Partial<HeartbeatConfig> & { enabled?: boolean };
  readonly telemetry?: Partial<TelemetryConfig> & { enabled?: boolean };
  readonly userActivity?: Partial<UserActivityConfig> & { enabled?: boolean };
}

export const DEFAULT_REGISTRY_CONFIG: EmitterRegistryConfig = {
  heartbeat: { enabled: true, intervalMs: 10_000 },
  telemetry: { enabled: true, collectCpuMetrics: false }, // CPU collection off by default for performance
  userActivity: { enabled: true, maxRecentActivity: 5 }
} as const;

export class EmitterRegistry {
  private readonly emitters = new Map<EmitterType, EmitterInstance>();
  private readonly config: EmitterRegistryConfig;

  constructor(config: Partial<EmitterRegistryConfig> = {}) {
    this.config = this.mergeConfig(config);
    this.initializeEmitters();
  }

  private mergeConfig(userConfig: Partial<EmitterRegistryConfig>): EmitterRegistryConfig {
    return {
      heartbeat: { ...DEFAULT_REGISTRY_CONFIG.heartbeat, ...userConfig.heartbeat },
      telemetry: { ...DEFAULT_REGISTRY_CONFIG.telemetry, ...userConfig.telemetry },
      userActivity: { ...DEFAULT_REGISTRY_CONFIG.userActivity, ...userConfig.userActivity }
    };
  }

  private initializeEmitters(): void {
    // Register heartbeat emitter
    if (this.config.heartbeat?.enabled) {
      const { enabled, ...heartbeatConfig } = this.config.heartbeat;
      this.emitters.set('heartbeat', createHeartbeatEmitter(heartbeatConfig));
    }

    // Register telemetry emitter
    if (this.config.telemetry?.enabled) {
      const { enabled, ...telemetryConfig } = this.config.telemetry;
      this.emitters.set('telemetry', createTelemetryEmitter(telemetryConfig));
    }

    // Register user activity emitter
    if (this.config.userActivity?.enabled) {
      const { enabled, ...userActivityConfig } = this.config.userActivity;
      this.emitters.set('user_activity', createUserActivityEmitter(userActivityConfig));
    }
  }

  public getEmitter(type: EmitterType): EmitterInstance | undefined {
    return this.emitters.get(type);
  }

  public getAllEmitters(): EmitterInstance[] {
    return Array.from(this.emitters.values());
  }

  public getEnabledEmitters(): EmitterInstance[] {
    return this.getAllEmitters(); // All registered emitters are enabled by definition
  }

  public hasEmitter(type: EmitterType): boolean {
    return this.emitters.has(type);
  }

  public getEmitterTypes(): EmitterType[] {
    return Array.from(this.emitters.keys());
  }

  public async emitAll(ctx: HubContext): Promise<void> {
    const emitPromises = this.getAllEmitters().map(emitter => 
      emitter.emit(ctx).catch(error => {
        console.error(`Failed to emit ${emitter.type}:`, error);
      })
    );

    await Promise.allSettled(emitPromises);
  }

  public async emitByType(type: EmitterType, ctx: HubContext): Promise<boolean> {
    const emitter = this.getEmitter(type);
    if (!emitter) {
      return false;
    }

    try {
      await emitter.emit(ctx);
      return true;
    } catch (error) {
      console.error(`Failed to emit ${type}:`, error);
      return false;
    }
  }

  public getRegistryStats(): Record<string, unknown> {
    return {
      totalEmitters: this.emitters.size,
      enabledTypes: this.getEmitterTypes(),
      config: this.config
    };
  }
}

// Convenience factory function
export function createEmitterRegistry(config?: Partial<EmitterRegistryConfig>): EmitterRegistry {
  return new EmitterRegistry(config);
}