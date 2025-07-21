/**
 * Push Orchestrator - P4.3 Server Push Infrastructure
 * Central runtime for managing periodic and reactive server-originated events
 */

import { EmitterRegistry, type EmitterRegistryConfig, type EmitterType } from './emitters/emitterRegistry.js';
import type { HubContext } from './types.js';

export interface PushSchedule {
  readonly emitterType: EmitterType;
  readonly intervalMs: number;
  readonly immediate?: boolean; // Emit immediately on start
}

export interface PushOrchestratorConfig {
  readonly emitterConfig?: Partial<EmitterRegistryConfig>;
  readonly schedules?: PushSchedule[];
  readonly enableReactiveEvents?: boolean;
  readonly gracefulShutdownTimeoutMs?: number;
}

// P4.3: Runtime safety constants
const MIN_INTERVAL_MS = 1_000; // Minimum 1 second to prevent DoS
const MAX_INTERVAL_MS = 24 * 60 * 60 * 1_000; // Maximum 24 hours

export const DEFAULT_PUSH_SCHEDULES: PushSchedule[] = [
  { emitterType: 'heartbeat', intervalMs: 10_000, immediate: true },
  { emitterType: 'telemetry', intervalMs: 30_000, immediate: false },
  { emitterType: 'user_activity', intervalMs: 60_000, immediate: false }
] as const;

export const DEFAULT_ORCHESTRATOR_CONFIG: Required<PushOrchestratorConfig> = {
  emitterConfig: {},
  schedules: DEFAULT_PUSH_SCHEDULES,
  enableReactiveEvents: true,
  gracefulShutdownTimeoutMs: 5_000
} as const;

export class PushOrchestrator {
  private readonly registry: EmitterRegistry;
  private readonly config: Required<PushOrchestratorConfig>;
  private readonly intervals = new Map<EmitterType, NodeJS.Timeout>();
  private readonly hubContext: HubContext;
  private isRunning = false;

  // RT-7: Internal warning utility (low priority - infrastructure warnings)
  private logWarning(message: string, data?: unknown): void {
    // For hub infrastructure, console.warn is still appropriate
    // Future enhancement: could emit to hubContext if structured events are needed
    console.warn(`[PushOrchestrator] ${message}`, data);
  }

  constructor(hubContext: HubContext, config: Partial<PushOrchestratorConfig> = {}) {
    this.hubContext = hubContext;
    
    // RT-2: Freeze schedules to prevent runtime mutation DoS attacks
    const schedules = (config.schedules || DEFAULT_PUSH_SCHEDULES).map(schedule => Object.freeze({ ...schedule }));
    Object.freeze(schedules);
    
    this.config = { 
      ...DEFAULT_ORCHESTRATOR_CONFIG, 
      ...config,
      schedules
    };
    
    this.registry = new EmitterRegistry(this.config.emitterConfig);
  }

  public start(): void {
    if (this.isRunning) {
      this.logWarning('Already running - ignoring start() call');
      return;
    }

    this.isRunning = true;
    console.log('Starting PushOrchestrator with schedules:', this.config.schedules);

    // Start scheduled emitters
    for (const schedule of this.config.schedules) {
      this.startScheduledEmitter(schedule);
    }

    // Setup reactive event handlers if enabled
    if (this.config.enableReactiveEvents) {
      this.setupReactiveEvents();
    }
  }

  private startScheduledEmitter(schedule: PushSchedule): void {
    const { emitterType, immediate } = schedule;
    
    // RT-2: Copy interval to local variable to prevent mutation after clamping
    const originalInterval = schedule.intervalMs;
    const intervalMs = Math.max(MIN_INTERVAL_MS, Math.min(MAX_INTERVAL_MS, originalInterval));
    
    if (intervalMs !== originalInterval) {
      this.logWarning(`Clamped ${emitterType} interval from ${originalInterval}ms to ${intervalMs}ms for safety`);
    }

    if (!this.registry.hasEmitter(emitterType)) {
      this.logWarning(`Emitter type '${emitterType}' not found in registry, skipping schedule`);
      return;
    }

    // Emit immediately if requested
    if (immediate) {
      this.emitSafely(emitterType);
    }

    // Setup periodic emission
    const interval = setInterval(() => {
      if (this.isRunning) {
        this.emitSafely(emitterType);
      }
    }, intervalMs);

    this.intervals.set(emitterType, interval);
    console.log(`Scheduled ${emitterType} emitter every ${intervalMs}ms`);
  }

  private async emitSafely(emitterType: EmitterType): Promise<void> {
    try {
      const success = await this.registry.emitByType(emitterType, this.hubContext);
      if (!success) {
        console.warn(`Failed to emit ${emitterType}: emitter not found`);
      }
    } catch (error) {
      console.error(`Error during ${emitterType} emission:`, error);
    }
  }

  private setupReactiveEvents(): void {
    // Listen for connection events to trigger reactive updates
    if (this.hubContext.on) {
      this.hubContext.on('connection:added', () => {
        this.emitSafely('user_activity');
      });

      this.hubContext.on('connection:removed', () => {
        this.emitSafely('user_activity');
      });

      this.hubContext.on('filter:changed', () => {
        this.emitSafely('telemetry');
      });
    }
  }

  public async stop(): Promise<void> {
    if (!this.isRunning) {
      return; // RT-4: Idempotent - safe to call multiple times
    }

    console.log('Stopping PushOrchestrator...');
    this.isRunning = false;

    // RT-4: Clear all intervals and ensure Map is emptied for GC
    for (const [emitterType, interval] of this.intervals) {
      clearInterval(interval);
      console.log(`Stopped ${emitterType} schedule`);
    }
    this.intervals.clear(); // This already empties the Map properly

    // Final emission with a timeout
    try {
      await Promise.race([
        this.registry.emitAll(this.hubContext),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), this.config.gracefulShutdownTimeoutMs)
        )
      ]);
      console.log('Final emission completed');
    } catch (error) {
      console.warn('Final emission failed or timed out:', error);
    }
  }

  public getStatus(): Record<string, unknown> {
    return {
      isRunning: this.isRunning,
      activeSchedules: Array.from(this.intervals.keys()),
      registry: this.registry.getRegistryStats(),
      config: {
        schedules: this.config.schedules,
        enableReactiveEvents: this.config.enableReactiveEvents
      }
    };
  }

  public async emitNow(emitterType: EmitterType): Promise<boolean> {
    if (!this.isRunning) {
      console.warn('Cannot emit: PushOrchestrator is not running');
      return false;
    }

    return await this.registry.emitByType(emitterType, this.hubContext);
  }

  public async emitAllNow(): Promise<void> {
    if (!this.isRunning) {
      console.warn('Cannot emit: PushOrchestrator is not running');
      return;
    }

    await this.registry.emitAll(this.hubContext);
  }
}

// Convenience factory function
export function startPushOrchestrator(
  hubContext: HubContext,
  config?: Partial<PushOrchestratorConfig>
): () => Promise<void> {
  const orchestrator = new PushOrchestrator(hubContext, config);
  orchestrator.start();

  return async () => {
    await orchestrator.stop();
  };
}

// Export for direct class usage
export { PushOrchestrator as PushOrchestratorClass };