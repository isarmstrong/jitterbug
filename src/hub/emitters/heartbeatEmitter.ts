/**
 * Heartbeat Emitter - P4.3 Server Push Infrastructure
 * Provides periodic keepalive signals to maintain connection health
 */

import type { HubContext } from '../types.js';

export interface HeartbeatConfig {
  readonly intervalMs: number;
  readonly includeStats: boolean;
}

export const DEFAULT_HEARTBEAT_CONFIG: HeartbeatConfig = {
  intervalMs: 10_000,
  includeStats: false
} as const;

export async function emitHeartbeat(ctx: HubContext, config: HeartbeatConfig = DEFAULT_HEARTBEAT_CONFIG): Promise<void> {
  const payload = {
    ts: Date.now(),
    serverUptime: process.uptime(),
    ...(config.includeStats && {
      stats: {
        activeConnections: ctx.connectionCount || 0,
        memoryUsage: Math.round(process.memoryUsage().rss / 1024 / 1024)
      }
    })
  };

  await ctx.emit({
    type: 'server.heartbeat',
    payload,
    metadata: {
      emitter: 'heartbeat',
      version: '1.0.0'
    }
  });
}

export function createHeartbeatEmitter(config: Partial<HeartbeatConfig> = {}) {
  const finalConfig = { ...DEFAULT_HEARTBEAT_CONFIG, ...config };
  
  return {
    config: finalConfig,
    emit: (ctx: HubContext) => emitHeartbeat(ctx, finalConfig),
    type: 'server.heartbeat' as const
  };
}