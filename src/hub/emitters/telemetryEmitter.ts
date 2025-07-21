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
  try {
    const memUsage = process.memoryUsage();
    
    // RT-5: Safely collect CPU metrics with error handling
    let rawCpuUsage = 0;
    if (config.collectCpuMetrics) {
      try {
        rawCpuUsage = await getCpuUsage();
      } catch (error) {
        console.warn('Failed to collect CPU metrics:', error);
        // Continue with rawCpuUsage = 0
      }
    }
    
    // RT-3: Enhanced privacy-safe metrics to prevent device fingerprinting
    const rawMemoryMB = Math.round(memUsage.rss / 1024 / 1024);
    const rawUptime = Math.round(process.uptime());
  
    const metrics: TelemetryMetrics = {
      timestamp: Date.now(),
      system: {
        memoryUsage: config.privacySafeMode 
          ? Math.floor(rawMemoryMB / 50) * 25 // Coarse quartiles: 0, 25, 50, 75, 100+
          : rawMemoryMB,
        cpuUsage: config.privacySafeMode
          ? 0 // RT-3: Drop CPU entirely in privacy mode to prevent fingerprinting
          : rawCpuUsage,
        uptime: config.privacySafeMode
          ? (rawUptime < 3600 ? 0 : rawUptime < 43200 ? 1 : 2) // Coarse buckets: <1h, 1-12h, >12h
          : rawUptime
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
  } catch (error) {
    // RT-5: Handle telemetry emission failures gracefully
    console.error('Failed to emit telemetry update:', error);
    // Don't re-throw - telemetry failures shouldn't crash the orchestrator
  }
}

async function getCpuUsage(): Promise<number> {
  // Simple CPU usage approximation
  const start = process.cpuUsage();
  await new Promise(resolve => setTimeout(resolve, 100));
  const end = process.cpuUsage(start);
  
  const totalUsage = (end.user + end.system) / 1000; // Convert to milliseconds
  return Math.min(100, (totalUsage / 100) * 100); // Normalize to percentage
}

/** @deprecated Use bootstrapPushSystem() instead */
export function createTelemetryEmitter(config: Partial<TelemetryConfig> = {}) {
  const finalConfig = { ...DEFAULT_TELEMETRY_CONFIG, ...config };
  
  return {
    config: finalConfig,
    emit: (ctx: HubContext) => emitTelemetryUpdate(ctx, finalConfig),
    type: 'telemetry.update' as const
  };
}