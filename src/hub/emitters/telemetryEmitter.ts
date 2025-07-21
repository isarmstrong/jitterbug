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
  readonly privacySafeMode: boolean; // P4.3: Prevent leaking local machine stats
}

export const DEFAULT_TELEMETRY_CONFIG: TelemetryConfig = {
  collectCpuMetrics: true,
  collectMemoryMetrics: true,
  includeProcessInfo: false,
  privacySafeMode: true // P4.3: Default to privacy-safe mode
} as const;

export async function emitTelemetryUpdate(
  ctx: HubContext, 
  config: TelemetryConfig = DEFAULT_TELEMETRY_CONFIG
): Promise<void> {
  const memUsage = process.memoryUsage();
  
  // P4.3: Privacy-safe metrics to prevent leaking local machine stats
  const rawMemoryMB = Math.round(memUsage.rss / 1024 / 1024);
  const rawCpuUsage = config.collectCpuMetrics ? await getCpuUsage() : 0;
  
  const metrics: TelemetryMetrics = {
    timestamp: Date.now(),
    system: {
      memoryUsage: config.privacySafeMode 
        ? Math.min(100, Math.round(rawMemoryMB / 10)) // Normalized 0-100 range
        : rawMemoryMB,
      cpuUsage: config.privacySafeMode
        ? Math.round(rawCpuUsage / 10) * 10 // Rounded to nearest 10%
        : rawCpuUsage,
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