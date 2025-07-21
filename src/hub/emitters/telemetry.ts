/**
 * Telemetry Emitter - P4.3 Built-in Emitter v1
 */

import type { PushEmitter, TelemetryFrame } from './registry.js';

export interface TelemetryConfig {
  intervalMs: number;
  includeMemory: boolean;
  includeConnections: boolean;
  maxPayloadSize: number;
}

export const DEFAULT_TELEMETRY_CONFIG: TelemetryConfig = {
  intervalMs: 5_000,
  includeMemory: true,
  includeConnections: true,
  maxPayloadSize: 800
};


export class TelemetryEmitter implements PushEmitter<TelemetryFrame> {
  readonly id = 'jitterbug.telemetry';
  readonly minIntervalMs: number;
  
  private readonly config: TelemetryConfig;
  private lastTelemetry = 0;

  constructor(config: Partial<TelemetryConfig> = {}) {
    this.config = { ...DEFAULT_TELEMETRY_CONFIG, ...config };
    this.minIntervalMs = this.config.intervalMs;
    
    if (this.minIntervalMs < 1000 || this.minIntervalMs > 60_000) {
      throw new Error('Telemetry interval must be 1000-60,000ms');
    }
  }

  shouldEmit(): boolean {
    const now = Date.now();
    return (now - this.lastTelemetry) >= this.minIntervalMs;
  }

  createFrame(): TelemetryFrame {
    const now = Date.now();
    this.lastTelemetry = now;
    
    let cpu = 0;
    let mem = 0;

    if (this.config.includeMemory && typeof process !== 'undefined') {
      try {
        const memUsage = process.memoryUsage();
        const totalMB = (memUsage.heapTotal + memUsage.external) / (1024 * 1024);
        const usedMB = (memUsage.heapUsed + memUsage.external) / (1024 * 1024);
        
        mem = Math.round((usedMB / totalMB) * 100);
        cpu = Math.round(Math.random() * 100); // Placeholder for CPU usage
      } catch {}
    }

    return { t: 'tm', ts: now, cpu, mem };
  }

  serialize(): string {
    const frame = this.createFrame();
    const serialized = JSON.stringify(frame);
    
    if (serialized.length > this.config.maxPayloadSize) {
      return JSON.stringify({
        t: 'tm',
        ts: frame.ts,
        cpu: 0,
        mem: 0
      });
    }
    
    return serialized;
  }
}