/**
 * Built-in Emitters Tests - P4.3 Micro-Task C
 * Tests HeartbeatEmitter, TelemetryEmitter, and UserActivityEmitter
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HeartbeatEmitter } from '../heartbeat.js';
import { TelemetryEmitter } from '../telemetry.js';
import { UserActivityEmitter } from '../user-activity.js';

describe('Built-in Emitters - P4.3 Micro-Task C', () => {
  describe('HeartbeatEmitter', () => {
    let emitter: HeartbeatEmitter;

    beforeEach(() => {
      emitter = new HeartbeatEmitter();
    });

    it('should create heartbeat frames', () => {
      const frame = emitter.createFrame();
      expect(frame.t).toBe('hb');
      expect(frame.ts).toBeGreaterThan(0);
    });

    it('should validate interval bounds', () => {
      expect(() => new HeartbeatEmitter({ intervalMs: 500 }))
        .toThrow('Heartbeat interval must be 1000-300,000ms');
      
      expect(() => new HeartbeatEmitter({ intervalMs: 400_000 }))
        .toThrow('Heartbeat interval must be 1000-300,000ms');
    });

    it('should respect emission intervals', () => {
      expect(emitter.shouldEmit()).toBe(true);
      
      emitter.createFrame();
      expect(emitter.shouldEmit()).toBe(false);
      
      // Advance time
      vi.setSystemTime(Date.now() + 1100);
      expect(emitter.shouldEmit()).toBe(true);
    });

    it('should serialize within size limits', () => {
      const serialized = emitter.serialize();
      expect(serialized.length).toBeLessThanOrEqual(1024);
      expect(() => JSON.parse(serialized)).not.toThrow();
    });

  });

  describe('TelemetryEmitter', () => {
    let emitter: TelemetryEmitter;

    beforeEach(() => {
      emitter = new TelemetryEmitter();
    });

    it('should create telemetry frames', () => {
      const frame = emitter.createFrame();
      expect(frame.t).toBe('tm');
      expect(frame.ts).toBeGreaterThan(0);
      expect(frame.cpu).toBeGreaterThanOrEqual(0);
      expect(frame.mem).toBeGreaterThanOrEqual(0);
    });

    it('should validate interval bounds', () => {
      expect(() => new TelemetryEmitter({ intervalMs: 500 }))
        .toThrow('Telemetry interval must be 1000-60,000ms');
      
      expect(() => new TelemetryEmitter({ intervalMs: 70_000 }))
        .toThrow('Telemetry interval must be 1000-60,000ms');
    });

    it('should include memory stats when available', () => {
      const frame = emitter.createFrame();
      if (typeof process !== 'undefined') {
        expect(frame.mem).toBeGreaterThanOrEqual(0);
        expect(frame.cpu).toBeGreaterThanOrEqual(0);
      }
    });

    it('should handle serialization size limits', () => {
      const serialized = emitter.serialize();
      expect(() => JSON.parse(serialized)).not.toThrow();
      
      const largeEmitter = new TelemetryEmitter({ maxPayloadSize: 50 });
      const largeSerialized = largeEmitter.serialize();
      expect(largeSerialized.length).toBeLessThanOrEqual(200);
    });

    it('should respect emission intervals', () => {
      expect(emitter.shouldEmit()).toBe(true);
      
      emitter.createFrame();
      expect(emitter.shouldEmit()).toBe(false);
      
      vi.setSystemTime(Date.now() + 2100);
      expect(emitter.shouldEmit()).toBe(true);
    });
  });

  describe('UserActivityEmitter', () => {
    let emitter: UserActivityEmitter;

    beforeEach(() => {
      emitter = new UserActivityEmitter();
    });

    it('should create user activity frames', () => {
      emitter.addActivity({ type: 'click', userId: 'user1' });
      
      const frame = emitter.createFrame();
      expect(frame.t).toBe('ua');
      expect(frame.ts).toBeGreaterThan(0);
      expect(frame.meta.total).toBe(1);
      expect(frame.meta.unique_users).toBe(1);
    });

    it('should validate configuration bounds', () => {
      expect(() => new UserActivityEmitter({ intervalMs: 1000 }))
        .toThrow('User activity interval must be 5000-300,000ms');
      
      expect(() => new UserActivityEmitter({ intervalMs: 400_000 }))
        .toThrow('User activity interval must be 5000-300,000ms');
      
      expect(() => new UserActivityEmitter({ batchSize: 150 }))
        .toThrow('Batch size cannot exceed 100 activities');
    });

    it('should aggregate activities correctly', () => {
      emitter.addActivity({ type: 'click', userId: 'user1' });
      emitter.addActivity({ type: 'click', userId: 'user2' });
      emitter.addActivity({ type: 'scroll', userId: 'user1' });
      
      const frame = emitter.createFrame();
      expect(frame.meta.total).toBe(3);
      expect(frame.meta.unique_users).toBe(2);
      expect(frame.meta.top_activities).toHaveLength(2);
      expect(frame.meta.top_activities[0]).toEqual({ type: 'click', count: 2 });
    });

    it('should clean up old activities', () => {
      const now = Date.now();
      vi.setSystemTime(now);
      
      emitter.addActivity({ type: 'old', userId: 'user1' });
      
      // Advance time beyond maxAgeMs
      vi.setSystemTime(now + 15000);
      emitter.addActivity({ type: 'new', userId: 'user2' });
      
      const frame = emitter.createFrame();
      expect(frame.meta.total).toBe(1);
      expect(frame.meta.top_activities[0].type).toBe('new');
    });

    it('should enforce batch size limits', () => {
      const smallEmitter = new UserActivityEmitter({ batchSize: 3 });
      
      for (let i = 0; i < 10; i++) {
        smallEmitter.addActivity({ type: 'test', userId: `user${i}` });
      }
      
      const frame = smallEmitter.createFrame();
      expect(frame.meta.total).toBe(3);
    });

    it('should only emit when activities exist', () => {
      expect(emitter.shouldEmit()).toBe(false);
      
      emitter.addActivity({ type: 'test' });
      expect(emitter.shouldEmit()).toBe(true);
      
      emitter.createFrame(); // Clears activities
      expect(emitter.shouldEmit()).toBe(false);
    });

    it('should handle serialization size limits', () => {
      for (let i = 0; i < 50; i++) {
        emitter.addActivity({ 
          type: `very_long_activity_type_name_${i}`, 
          userId: `user_with_very_long_id_${i}`
        });
      }
      
      const serialized = emitter.serialize();
      expect(() => JSON.parse(serialized)).not.toThrow();
    });

  });
});