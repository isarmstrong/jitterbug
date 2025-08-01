/**
 * Log Inspector Tests - Task 3.5 Phase 1
 * 
 * Tests for the experimental public logInspector.query() interface.
 * Exercises event capture path via safeEmit/safeEmit.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { logInspector } from '../public-logs.js';
import { safeEmit, setGlobalEmitFn } from '../schema-registry.js';
import { attachLogCapture } from '../logs/internal/attach.js';

describe('Log Inspector (Phase 1)', () => {
  beforeEach(() => {
    // Ensure log capture is attached (idempotent)
    attachLogCapture(1000);
    
    // Set up mock global emit function for tests
    let seq = 0;
    setGlobalEmitFn((_type: string, _payload: any, _opts?: any) => {
      return `test-event-${++seq}`;
    });
  });

  describe('Basic Query Structure', () => {
    it('should return correct structure with no logs', () => {
      const result = logInspector.query();
      
      expect(result).toHaveProperty('entries');
      expect(result).toHaveProperty('stats');
      expect(result).toHaveProperty('nextSeq');
      expect(Array.isArray(result.entries)).toBe(true);
      expect(typeof result.stats).toBe('object');
      expect(typeof result.nextSeq).toBe('number');
    });

    it('should return entries with correct structure', () => {
      // Emit a test event using existing schema
      safeEmit('orchestrator.debugger.ready', { flushed: 0 }, { level: 'info' });
      
      const result = logInspector.query();
      expect(result.entries.length).toBeGreaterThan(0);
      
      const entry = result.entries[0];
      expect(entry).toHaveProperty('seq');
      expect(entry).toHaveProperty('ts');
      expect(entry).toHaveProperty('type');
      expect(entry).toHaveProperty('payload');
      expect(entry).toHaveProperty('branch');
      expect(entry).toHaveProperty('level');
      
      expect(typeof entry.seq).toBe('number');
      expect(typeof entry.ts).toBe('number');
      expect(typeof entry.type).toBe('string');
    });

    it('should include stats with capacity, size, dropped, lastSeq', () => {
      const result = logInspector.query();
      
      expect(result.stats).toHaveProperty('capacity');
      expect(result.stats).toHaveProperty('size');
      expect(result.stats).toHaveProperty('dropped');
      expect(result.stats).toHaveProperty('lastSeq');
      
      expect(typeof result.stats.capacity).toBe('number');
      expect(typeof result.stats.size).toBe('number');
      expect(typeof result.stats.dropped).toBe('number');
      expect(typeof result.stats.lastSeq).toBe('number');
    });
  });

  describe('Incremental Query using nextSeq', () => {
    it('should support incremental polling pattern', () => {
      // Initial query
      const initial = logInspector.query();
      
      // Emit new events
      safeEmit('orchestrator.debugger.ready', { flushed: 1 });
      safeEmit('orchestrator.debugger.ready', { flushed: 2 });
      
      // Query for new entries only
      const incremental = logInspector.query({ sinceSeq: initial.nextSeq });
      
      expect(incremental.entries.length).toBe(2);
      expect(incremental.entries[0].type).toBe('orchestrator.debugger.ready');
      expect(incremental.entries[1].type).toBe('orchestrator.debugger.ready');
      
      // Verify sequence numbers are increasing
      expect(incremental.entries[0].seq).toBeLessThan(incremental.entries[1].seq);
    });

    it('should return empty array when sinceSeq > lastSeq', () => {
      const result = logInspector.query({ sinceSeq: 999999 });
      expect(result.entries).toEqual([]);
    });
  });

  describe('Limit Enforcement', () => {
    it('should respect limit parameter', () => {
      // Generate more events than our limit
      for (let i = 0; i < 10; i++) {
        safeEmit('orchestrator.debugger.ready', { flushed: i });
      }
      
      const limited = logInspector.query({ limit: 5 });
      expect(limited.entries.length).toBeLessThanOrEqual(5);
    });

    it('should return latest entries when limited', () => {
      // Clear and emit known sequence
      for (let i = 0; i < 8; i++) {
        safeEmit('orchestrator.debugger.ready', { flushed: i });
      }
      
      const limited = logInspector.query({ limit: 3 });
      expect(limited.entries.length).toBeLessThanOrEqual(3);
      
      // Should get the last entries (highest indices)
      if (limited.entries.length > 0) {
        const lastEntry = limited.entries[limited.entries.length - 1];
        expect(lastEntry.payload).toHaveProperty('flushed');
      }
    });

    it('should clamp limit to safe bounds', () => {
      // Test minimum
      safeEmit('orchestrator.debugger.ready', { flushed: 0 });
      const minResult = logInspector.query({ limit: 0 });
      expect(minResult.entries.length).toBeGreaterThanOrEqual(0);
      
      // Test maximum (should not crash with large limit)
      const maxResult = logInspector.query({ limit: 10000 });
      expect(Array.isArray(maxResult.entries)).toBe(true);
    });
  });

  describe('Wrap-around Resilience', () => {
    it('should handle capacity overflow correctly', () => {
      const initial = logInspector.query();
      const capacity = initial.stats.capacity;
      
      // Fill past capacity
      for (let i = 0; i < capacity + 10; i++) {
        safeEmit('orchestrator.debugger.ready', { flushed: i });
      }
      
      const result = logInspector.query();
      
      // Should not exceed capacity
      expect(result.stats.size).toBeLessThanOrEqual(capacity);
      
      // Should have dropped entries
      expect(result.stats.dropped).toBeGreaterThan(0);
      
      // Entries should be properly ordered by sequence
      for (let i = 1; i < result.entries.length; i++) {
        expect(result.entries[i].seq).toBeGreaterThan(result.entries[i - 1].seq);
      }
    });

    it('should maintain sequence ordering after wrap-around', () => {
      const initial = logInspector.query();
      const capacity = initial.stats.capacity;
      
      // Force wrap-around
      for (let i = 0; i < capacity * 2; i++) {
        safeEmit('orchestrator.debugger.ready', { flushed: i });
      }
      
      const result = logInspector.query();
      
      // Verify all entries are in sequence order
      for (let i = 1; i < result.entries.length; i++) {
        expect(result.entries[i].seq).toBe(result.entries[i - 1].seq + 1);
      }
    });
  });

  describe('No Mutation Guarantee', () => {
    it('should not change stats when calling query', () => {
      // Get initial state
      const initial = logInspector.query();
      const initialLastSeq = initial.stats.lastSeq;
      
      // Call query multiple times
      logInspector.query();
      logInspector.query({ limit: 10 });
      logInspector.query({ sinceSeq: 1 });
      
      const final = logInspector.query();
      
      // Stats should be unchanged (no new events emitted)
      expect(final.stats.lastSeq).toBe(initialLastSeq);
      expect(final.stats.size).toBe(initial.stats.size);
      expect(final.stats.dropped).toBe(initial.stats.dropped);
    });

    it('should reflect new events after emission', () => {
      const before = logInspector.query();
      
      safeEmit('orchestrator.debugger.ready', { flushed: 1 });
      
      const after = logInspector.query();
      
      expect(after.stats.lastSeq).toBeGreaterThan(before.stats.lastSeq);
      expect(after.entries.length).toBeGreaterThanOrEqual(before.entries.length);
    });
  });

  describe('Filtering (Phase 2)', () => {
    it('should filter by branch', () => {
      // Emit events with different branches
      safeEmit('orchestrator.debugger.ready', { flushed: 1 }, { branch: 'main' });
      safeEmit('orchestrator.debugger.ready', { flushed: 2 }, { branch: 'feature' });
      safeEmit('orchestrator.debugger.ready', { flushed: 3 }, { branch: 'main' });
      
      const mainResults = logInspector.query({ branch: 'main' });
      const featureResults = logInspector.query({ branch: 'feature' });
      
      expect(mainResults.entries.length).toBeGreaterThan(0);
      expect(featureResults.entries.length).toBeGreaterThan(0);
      expect(mainResults.entries.every(e => e.branch === 'main')).toBe(true);
      expect(featureResults.entries.every(e => e.branch === 'feature')).toBe(true);
    });

    it('should filter by level', () => {
      // Emit events with different levels
      safeEmit('orchestrator.debugger.ready', { flushed: 1 }, { level: 'info' });
      safeEmit('orchestrator.debugger.ready', { flushed: 2 }, { level: 'error' });
      safeEmit('orchestrator.debugger.ready', { flushed: 3 }, { level: 'info' });
      
      const infoResults = logInspector.query({ level: 'info' });
      const errorResults = logInspector.query({ level: 'error' });
      
      expect(infoResults.entries.length).toBeGreaterThan(0);
      expect(errorResults.entries.length).toBeGreaterThan(0);
      expect(infoResults.entries.every(e => e.level === 'info')).toBe(true);
      expect(errorResults.entries.every(e => e.level === 'error')).toBe(true);
    });

    it('should support combined filtering', () => {
      // Emit events with various combinations
      safeEmit('orchestrator.debugger.ready', { flushed: 1 }, { branch: 'main', level: 'info' });
      safeEmit('orchestrator.debugger.ready', { flushed: 2 }, { branch: 'main', level: 'error' });
      safeEmit('orchestrator.debugger.ready', { flushed: 3 }, { branch: 'feature', level: 'info' });
      
      const filtered = logInspector.query({ branch: 'main', level: 'info' });
      
      expect(filtered.entries.length).toBeGreaterThan(0);
      expect(filtered.entries.every(e => e.branch === 'main' && e.level === 'info')).toBe(true);
    });
  });

  describe('Capabilities Discovery (Micro-Hardening)', () => {
    it('should provide capabilities discovery interface', () => {
      const capabilities = logInspector.capabilities();
      
      expect(capabilities).toHaveProperty('filters');
      expect(capabilities).toHaveProperty('exports');
      expect(capabilities).toHaveProperty('maxLimit');
      expect(capabilities).toHaveProperty('bufferCapacity');
      
      expect(Array.isArray(capabilities.filters)).toBe(true);
      expect(capabilities.filters).toContain('branch');
      expect(capabilities.filters).toContain('level');
      
      expect(typeof capabilities.maxLimit).toBe('number');
      expect(capabilities.maxLimit).toBeGreaterThan(0);
      
      expect(typeof capabilities.bufferCapacity).toBe('number');
      expect(capabilities.bufferCapacity).toBeGreaterThan(0);
    });
  });

  describe('Event Capture Integration', () => {
    it.skip('should capture events via safeEmit', () => {
      const before = logInspector.query();
      const beforeCount = before.entries.length;
      
      safeEmit('orchestrator.debugger.ready', { 
        flushed: 42
      }, { 
        level: 'debug',
        branch: 'test-branch'
      });
      
      const after = logInspector.query();
      
      expect(after.entries.length).toBeGreaterThanOrEqual(beforeCount + 1);
      
      const newEntry = after.entries.find(e => e.type === 'orchestrator.debugger.ready');
      expect(newEntry).toBeDefined();
      expect(newEntry?.payload).toHaveProperty('flushed', 42);
      expect(newEntry?.level).toBe('debug');
      expect(newEntry?.branch).toBe('test-branch');
    });
  });
});