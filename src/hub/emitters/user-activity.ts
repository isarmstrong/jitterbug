/**
 * User Activity Emitter - P4.3 Built-in Emitter v1
 */

import type { PushEmitter, UserActivityFrame } from './registry.js';

export interface UserActivityConfig {
  intervalMs: number;
  batchSize: number;
  maxAgeMs: number;
}

export const DEFAULT_USER_ACTIVITY_CONFIG: UserActivityConfig = {
  intervalMs: 10_000,
  batchSize: 50,
  maxAgeMs: 30_000
};

export interface ActivityEvent {
  type: string;
  userId?: string;
  timestamp: number;
}

export class UserActivityEmitter implements PushEmitter<UserActivityFrame> {
  readonly id = 'jitterbug.user_activity';
  readonly minIntervalMs: number;
  
  private readonly config: UserActivityConfig;
  private readonly activities: ActivityEvent[] = [];
  private lastEmission = 0;

  constructor(config: Partial<UserActivityConfig> = {}) {
    this.config = { ...DEFAULT_USER_ACTIVITY_CONFIG, ...config };
    this.minIntervalMs = this.config.intervalMs;
    
    if (this.minIntervalMs < 5000 || this.minIntervalMs > 300_000) {
      throw new Error('User activity interval must be 5000-300,000ms');
    }
    if (this.config.batchSize > 100) {
      throw new Error('Batch size cannot exceed 100 activities');
    }
  }

  addActivity(activity: Omit<ActivityEvent, 'timestamp'>): void {
    const now = Date.now();
    
    this.activities.push({ ...activity, timestamp: now });
    this.cleanupActivities(now);
    
    if (this.activities.length > this.config.batchSize) {
      this.activities.splice(0, this.activities.length - this.config.batchSize);
    }
  }

  shouldEmit(): boolean {
    const now = Date.now();
    return (now - this.lastEmission) >= this.minIntervalMs && this.activities.length > 0;
  }

  createFrame(): UserActivityFrame {
    const now = Date.now();
    this.lastEmission = now;
    
    this.cleanupActivities(now);
    
    if (this.activities.length === 0) {
      return {
        t: 'ua',
        ts: now,
        meta: { total: 0, unique_users: 0, top_activities: [] }
      };
    }

    const uniqueUsers = new Set(this.activities.filter(a => a.userId).map(a => a.userId!));
    const activityCounts = new Map<string, number>();
    for (const activity of this.activities) {
      activityCounts.set(activity.type, (activityCounts.get(activity.type) || 0) + 1);
    }
    const topActivities = Array.from(activityCounts.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([type, count]) => ({ type, count }));
    const timestamps = this.activities.map(a => a.timestamp);
    const meta = {
      total: this.activities.length,
      unique_users: uniqueUsers.size,
      top_activities: topActivities,
      time_range: { start: Math.min(...timestamps), end: Math.max(...timestamps) }
    };
    this.activities.length = 0;
    return { t: 'ua', ts: now, meta };
  }

  serialize(): string {
    const frame = this.createFrame();
    const serialized = JSON.stringify(frame);
    
    if (serialized.length > 1024) {
      return JSON.stringify({
        t: 'ua',
        ts: frame.ts,
        meta: {
          total: frame.meta.total,
          unique_users: frame.meta.unique_users
        }
      });
    }
    
    return serialized;
  }
  private cleanupActivities(now: number): void {
    const cutoff = now - this.config.maxAgeMs;
    let i = 0;
    while (i < this.activities.length && this.activities[i].timestamp < cutoff) {
      i++;
    }
    if (i > 0) {
      this.activities.splice(0, i);
    }
  }
}