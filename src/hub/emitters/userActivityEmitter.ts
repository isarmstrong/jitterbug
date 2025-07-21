/**
 * User Activity Emitter - P4.3 Server Push Infrastructure
 * Tracks and broadcasts user interaction patterns for debugging insights
 */

import type { HubContext } from '../types.js';

export interface UserActivity {
  readonly sessionId: string;
  readonly activityType: 'page_view' | 'filter_change' | 'debug_toggle' | 'connection_event';
  readonly timestamp: number;
  readonly metadata: Record<string, unknown>;
}

export interface ActivitySummary {
  readonly totalUsers: number;
  readonly activeConnections: number;
  readonly recentActivity: UserActivity[];
  readonly topActions: Array<{ action: string; count: number }>;
}

export interface UserActivityConfig {
  readonly trackUserSessions: boolean;
  readonly maxRecentActivity: number;
  readonly includeDetailedMetadata: boolean;
}

export const DEFAULT_USER_ACTIVITY_CONFIG: UserActivityConfig = {
  trackUserSessions: true,
  maxRecentActivity: 10,
  includeDetailedMetadata: false
} as const;

// In-memory activity store (would be replaced with persistent storage in production)
const activityStore = new Map<string, UserActivity[]>();
const sessionStore = new Set<string>();

// RT-6: Schema validation for UserActivity to prevent malformed data injection
function validateUserActivity(activity: UserActivity): { valid: boolean; error?: string } {
  // Validate sessionId
  if (!activity.sessionId || typeof activity.sessionId !== 'string' || activity.sessionId.trim().length === 0) {
    return { valid: false, error: 'sessionId must be a non-empty string' };
  }
  
  // Validate activityType enum
  const validActivityTypes = ['page_view', 'filter_change', 'debug_toggle', 'connection_event'];
  if (!validActivityTypes.includes(activity.activityType)) {
    return { valid: false, error: `activityType must be one of: ${validActivityTypes.join(', ')}` };
  }
  
  // Validate timestamp
  if (!Number.isFinite(activity.timestamp) || activity.timestamp <= 0) {
    return { valid: false, error: 'timestamp must be a positive finite number' };
  }
  
  // Validate metadata is an object
  if (!activity.metadata || typeof activity.metadata !== 'object' || Array.isArray(activity.metadata)) {
    return { valid: false, error: 'metadata must be a non-array object' };
  }
  
  return { valid: true };
}

export function trackUserActivity(activity: UserActivity): void {
  // RT-6: Validate activity before processing
  const validation = validateUserActivity(activity);
  if (!validation.valid) {
    console.warn(`[UserActivityEmitter] Invalid UserActivity rejected: ${validation.error}`, activity);
    return; // Silently reject invalid activities
  }
  
  const { sessionId } = activity;
  
  if (!activityStore.has(sessionId)) {
    activityStore.set(sessionId, []);
    sessionStore.add(sessionId);
  }
  
  const activities = activityStore.get(sessionId)!;
  activities.push(activity);
  
  // Keep only recent activities to prevent memory leaks
  if (activities.length > DEFAULT_USER_ACTIVITY_CONFIG.maxRecentActivity * 2) {
    activities.splice(0, activities.length - DEFAULT_USER_ACTIVITY_CONFIG.maxRecentActivity);
  }
}

export async function emitUserActivityUpdate(
  ctx: HubContext,
  config: UserActivityConfig = DEFAULT_USER_ACTIVITY_CONFIG
): Promise<void> {
  const now = Date.now();
  const recentThreshold = now - (5 * 60 * 1000); // Last 5 minutes
  
  // Aggregate recent activity across all sessions
  const recentActivity: UserActivity[] = [];
  const actionCounts = new Map<string, number>();
  
  for (const activities of activityStore.values()) {
    const recent = activities
      .filter(activity => activity.timestamp > recentThreshold)
      .slice(-config.maxRecentActivity);
    
    recentActivity.push(...recent);
    
    // Count action types
    recent.forEach(activity => {
      const count = actionCounts.get(activity.activityType) || 0;
      actionCounts.set(activity.activityType, count + 1);
    });
  }
  
  const summary: ActivitySummary = {
    totalUsers: sessionStore.size,
    activeConnections: ctx.connectionCount || 0,
    recentActivity: recentActivity
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, config.maxRecentActivity),
    topActions: Array.from(actionCounts.entries())
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  };

  await ctx.emit({
    type: 'user_activity.update',
    payload: summary,
    metadata: {
      emitter: 'user_activity',
      version: '1.0.0',
      generatedAt: now,
      ...(config.includeDetailedMetadata && {
        detailed: {
          sessionCount: sessionStore.size,
          totalActivityRecords: Array.from(activityStore.values())
            .reduce((sum, activities) => sum + activities.length, 0)
        }
      })
    }
  });
}

export function createUserActivityEmitter(config: Partial<UserActivityConfig> = {}) {
  const finalConfig = { ...DEFAULT_USER_ACTIVITY_CONFIG, ...config };
  
  return {
    config: finalConfig,
    emit: (ctx: HubContext) => emitUserActivityUpdate(ctx, finalConfig),
    type: 'user_activity.update' as const,
    trackActivity: trackUserActivity
  };
}