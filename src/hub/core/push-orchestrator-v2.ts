/**
 * Push Orchestrator V2 - P4.3 Production-Grade Core Loop
 */

import { RingBuffer } from '../internal/ring-buffer.js';
import { TokenBucket, DEFAULT_TOKEN_BUCKET_CONFIG, type TokenBucketConfig } from '../internal/token-bucket.js';
import { PushResult, type PushAdapter } from '../adapters/ssePushAdapter.js';
import { getRegistry, type AnyPushFrame } from '../emitters/registry.js';

export interface PushOrchestratorConfig {
  readonly fps: number;
  readonly frameCapacityPerConnection: number;
  readonly maxFramesPerTick: number;
  readonly backoffMultiplier: number;
  readonly maxBackoffMs: number;
  readonly tokenBucket: TokenBucketConfig;
}

export const DEFAULT_ORCHESTRATOR_CONFIG: PushOrchestratorConfig = {
  fps: 20,
  frameCapacityPerConnection: 100,
  maxFramesPerTick: 10,
  backoffMultiplier: 1.5,
  maxBackoffMs: 30_000,
  tokenBucket: DEFAULT_TOKEN_BUCKET_CONFIG
} as const;
interface ConnectionState {
  readonly adapter: PushAdapter;
  readonly buffer: RingBuffer<AnyPushFrame>;
  readonly rateLimiter: TokenBucket;
  backoffMs: number;
  lastFlushTime: number;
  nextFlushTime: number;
}

interface EmitterState {
  lastEmitTime: number;
  nextEmitTime: number;
}

interface PushMetrics {
  framesSent: number;
  framesDropped: number;
  backoffEvents: number;
  emissionErrors: number;
  rateLimitEvents: number;
}

export class PushOrchestratorV2 {
  private readonly config: PushOrchestratorConfig;
  private readonly connections = new Map<string, ConnectionState>();
  private readonly emitterStates = new Map<string, EmitterState>();
  private readonly metrics: PushMetrics = {
    framesSent: 0,
    framesDropped: 0,
    backoffEvents: 0,
    emissionErrors: 0,
    rateLimitEvents: 0
  };
  
  private tickInterval?: NodeJS.Timeout;
  private isRunning = false;

  constructor(config: Partial<PushOrchestratorConfig> = {}) {
    this.config = { ...DEFAULT_ORCHESTRATOR_CONFIG, ...config };
    
    if (this.config.fps <= 0 || this.config.fps > 60) {
      throw new Error('FPS must be between 1 and 60');
    }
    if (this.config.maxFramesPerTick > 50) {
      throw new Error('maxFramesPerTick cannot exceed 50 for DoS protection');
    }
  }
  start(): void {
    if (this.isRunning) {
      console.warn('[PushOrchestratorV2] Already running');
      return;
    }

    this.isRunning = true;
    const tickIntervalMs = Math.floor(1000 / this.config.fps);
    
    console.log(`[PushOrchestratorV2] Starting with ${this.config.fps} FPS (${tickIntervalMs}ms tick)`);
    
    this.tickInterval = setInterval(() => this.tick(), tickIntervalMs);
  }
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = undefined;
    }
    
    console.log('[PushOrchestratorV2] Stopped');
  }
  addConnection(connectionId: string, adapter: PushAdapter): void {
    if (this.connections.has(connectionId)) {
      console.warn(`[PushOrchestratorV2] Connection ${connectionId} already exists`);
      return;
    }

    const buffer = new RingBuffer<AnyPushFrame>(this.config.frameCapacityPerConnection);
    const rateLimiter = new TokenBucket(this.config.tokenBucket);
    const now = Date.now();
    
    this.connections.set(connectionId, {
      adapter,
      buffer,
      rateLimiter,
      backoffMs: 0,
      lastFlushTime: now,
      nextFlushTime: now
    });
    
    console.log(`[PushOrchestratorV2] Added connection: ${connectionId}`);
  }
  removeConnection(connectionId: string): void {
    const state = this.connections.get(connectionId);
    if (state) {
      state.buffer.clear();
      this.connections.delete(connectionId);
      console.log(`[PushOrchestratorV2] Removed connection: ${connectionId}`);
    }
  }
  private async tick(): Promise<void> {
    if (!this.isRunning) return;

    const now = Date.now();
    let framesProcessed = 0;

    try {
      this.checkEmitters(now);
      
      const disconnectedConnections: string[] = [];
      
      for (const [connectionId, state] of this.connections) {
        if (framesProcessed >= this.config.maxFramesPerTick) {
          break;
        }
        
        if (!state.adapter.isConnected()) {
          disconnectedConnections.push(connectionId);
          continue;
        }
        
        framesProcessed += await this.flushConnection(connectionId, state, now);
      }
      
      for (const connectionId of disconnectedConnections) {
        this.removeConnection(connectionId);
      }
      
    } catch (error) {
      console.error('[PushOrchestratorV2] Tick error:', error);
      this.metrics.emissionErrors++;
    }
  }

  private checkEmitters(now: number): void {
    const registry = getRegistry();
    if (registry.isSealed()) {
      const emitters = registry.getAll();
      
      for (const emitter of emitters) {
        const state = this.getEmitterState(emitter.id);
        
        if (now >= state.nextEmitTime && emitter.shouldEmit()) {
          try {
            const frame = emitter.createFrame();
            this.enqueueFrame(frame);
            
            state.lastEmitTime = now;
            state.nextEmitTime = now + emitter.minIntervalMs;
            
          } catch (error) {
            console.error(`[PushOrchestratorV2] Emitter ${emitter.id} failed:`, error);
            this.metrics.emissionErrors++;
          }
        }
      }
    }
  }

  private enqueueFrame(frame: AnyPushFrame): void {
    for (const [, state] of this.connections) {
      const stats = state.buffer.getStats();
      const wasDropped = stats.dropped;
      
      state.buffer.enqueue(frame);
      
      const newStats = state.buffer.getStats();
      if (newStats.dropped > wasDropped) {
        this.metrics.framesDropped++;
      }
    }
  }

  private async flushConnection(connectionId: string, state: ConnectionState, now: number): Promise<number> {
    if (now < state.nextFlushTime || state.buffer.isEmpty()) {
      return 0;
    }

    let framesSent = 0;
    let shouldBackoff = false;
    while (!state.buffer.isEmpty() && framesSent < this.config.maxFramesPerTick) {
      // Rate limiting check - consume token before sending
      if (!state.rateLimiter.consume()) {
        console.warn(`[PushOrchestratorV2] Rate limit exceeded for connection ${connectionId}`);
        this.metrics.rateLimitEvents++;
        break; // Skip this connection's remaining frames for this tick
      }

      const frame = state.buffer.dequeue();
      if (!frame) break;

      const result = await state.adapter.send(frame);
      
      switch (result) {
        case PushResult.SUCCESS:
          this.metrics.framesSent++;
          framesSent++;
          break;
          
        case PushResult.SLOW:
          this.metrics.framesSent++;
          framesSent++;
          shouldBackoff = true;
          break;
          
        case PushResult.ERROR:
          return framesSent;
      }
    }

    state.lastFlushTime = now;
    
    if (shouldBackoff) {
      state.backoffMs = Math.min(
        state.backoffMs * this.config.backoffMultiplier || 100,
        this.config.maxBackoffMs
      );
      state.nextFlushTime = now + state.backoffMs;
      this.metrics.backoffEvents++;
    } else {
      state.backoffMs = 0;
      state.nextFlushTime = now;
    }

    return framesSent;
  }

  private getEmitterState(emitterId: string): EmitterState {
    let state = this.emitterStates.get(emitterId);
    if (!state) {
      const now = Date.now();
      state = {
        lastEmitTime: 0,
        nextEmitTime: now
      };
      this.emitterStates.set(emitterId, state);
    }
    return state;
  }

  getMetrics(): PushMetrics & { connectionCount: number } {
    return {
      ...this.metrics,
      connectionCount: this.connections.size
    };
  }

  getConnectionStats(): Array<{ id: string; bufferStats: any; backoffMs: number; tokens: number }> {
    const stats = [];
    for (const [id, state] of this.connections) {
      stats.push({
        id,
        bufferStats: state.buffer.getStats(),
        backoffMs: state.backoffMs,
        tokens: state.rateLimiter.getTokens()
      });
    }
    return stats;
  }
}