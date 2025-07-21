/**
 * Heartbeat Emitter - P4.3 Built-in Emitter v1
 */

import type { PushEmitter, HeartbeatFrame } from './registry.js';

export interface HeartbeatConfig {
  intervalMs: number;
  includeTimestamp: boolean;
}

export const DEFAULT_HEARTBEAT_CONFIG: HeartbeatConfig = {
  intervalMs: 30_000,
  includeTimestamp: true
};

export class HeartbeatEmitter implements PushEmitter<HeartbeatFrame> {
  readonly id = 'jitterbug.heartbeat';
  readonly minIntervalMs: number;
  
  private readonly config: HeartbeatConfig;
  private lastHeartbeat = 0;

  constructor(config: Partial<HeartbeatConfig> = {}) {
    this.config = { ...DEFAULT_HEARTBEAT_CONFIG, ...config };
    this.minIntervalMs = this.config.intervalMs;
    
    if (this.minIntervalMs < 1000 || this.minIntervalMs > 300_000) {
      throw new Error('Heartbeat interval must be 1000-300,000ms');
    }
  }

  shouldEmit(): boolean {
    const now = Date.now();
    return (now - this.lastHeartbeat) >= this.minIntervalMs;
  }

  createFrame(): HeartbeatFrame {
    const now = Date.now();
    this.lastHeartbeat = now;
    
    return {
      t: 'hb',
      ts: now
    };
  }

  serialize(): string {
    const frame = this.createFrame();
    return JSON.stringify(frame);
  }
}