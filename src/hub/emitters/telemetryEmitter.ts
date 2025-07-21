/**
 * Telemetry Emitter - P4.3 Server Push Infrastructure
 * Provides real-time system and application metrics
 */

import type { HubContext } from '../types.js';

export interface TelemetryMetrics {
  readonly timestamp: number;
  readonly system: {
    readonly memoryUsage: number; // MB
    readonly cpuUsage: number;    // percentage
    readonly uptime: number;      // seconds
  };
  readonly application: {
    readonly activeConnections: number;
    readonly totalEvents: number;
    readonly errorCount: number;
  };
}

export interface TelemetryConfig {
  readonly collectCpuMetrics: boolean;
  readonly collectMemoryMetrics: boolean;
  readonly includeProcessInfo: boolean;
}

export const DEFAULT_TELEMETRY_CONFIG: TelemetryConfig = {
  collectCpuMetrics: true,
  collectMemoryMetrics: true,
  includeProcessInfo: false
} as const;

export async function emitTelemetryUpdate(
  ctx: HubContext, 
  config: TelemetryConfig = DEFAULT_TELEMETRY_CONFIG
): Promise<void> {
  const memUsage = process.memoryUsage();
  
  const metrics: TelemetryMetrics = {
    timestamp: Date.now(),
    system: {
      memoryUsage: Math.round(memUsage.rss / 1024 / 1024),
      cpuUsage: config.collectCpuMetrics ? await getCpuUsage() : 0,
      uptime: Math.round(process.uptime())
    },
    application: {
      activeConnections: ctx.connectionCount || 0,
      totalEvents: ctx.eventCount || 0,
      errorCount: ctx.errorCount || 0
    }
  };

  await ctx.emit({
    type: 'telemetry.update',
    payload: metrics,
    metadata: {
      emitter: 'telemetry',
      version: '1.0.0',
      ...(config.includeProcessInfo && {
        process: {
          pid: process.pid,
          nodeVersion: process.version
        }
      })
    }
  });
}

async function getCpuUsage(): Promise<number> {
  // Simple CPU usage approximation
  const start = process.cpuUsage();
  await new Promise(resolve => setTimeout(resolve, 100));
  const end = process.cpuUsage(start);
  
  const totalUsage = (end.user + end.system) / 1000; // Convert to milliseconds
  return Math.min(100, (totalUsage / 100) * 100); // Normalize to percentage
}

export function createTelemetryEmitter(config: Partial<TelemetryConfig> = {}) {
  const finalConfig = { ...DEFAULT_TELEMETRY_CONFIG, ...config };
  
  return {
    config: finalConfig,
    emit: (ctx: HubContext) => emitTelemetryUpdate(ctx, finalConfig),
    type: 'telemetry.update' as const
  };
}