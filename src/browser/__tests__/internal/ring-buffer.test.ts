/**
 * Ring Buffer Internal Tests - Task 3.5
 * 
 * Tests for high-performance bounded circular buffer.
 * These are internal tests - public API tests will go in logs/
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createRing } from '../../logs/internal/ring-buffer.js';

describe('Ring Buffer (Internal)', () => {
  let buffer: ReturnType<typeof createRing>;
  
  beforeEach(() => {
    buffer = createRing(5); // Small capacity for testing wrap-around
  });

  describe('Basic Operations', () => {
    it('should start empty', () => {
      const stats = buffer.stats();
      expect(stats.size).toBe(0);
      expect(stats.dropped).toBe(0);
      expect(stats.lastSeq).toBe(0);
      expect(stats.firstSeq).toBeNull();
      expect(buffer.toArray()).toEqual([]);
    });

    it('should add entries with monotonic sequence numbers', () => {
      buffer.push({ ts: 1000, type: 'test.event.1', payload: { data: 1 } });
      buffer.push({ ts: 2000, type: 'test.event.2', payload: { data: 2 } });
      
      const entries = buffer.toArray();
      expect(entries).toHaveLength(2);
      expect(entries[0].seq).toBe(1);
      expect(entries[1].seq).toBe(2);
      expect(entries[0].type).toBe('test.event.1');
      expect(entries[1].type).toBe('test.event.2');
    });

    it('should maintain correct stats', () => {
      buffer.push({ ts: 1000, type: 'test', payload: {} });
      buffer.push({ ts: 2000, type: 'test', payload: {} });
      
      const stats = buffer.stats();
      expect(stats.size).toBe(2);
      expect(stats.capacity).toBe(5);
      expect(stats.dropped).toBe(0);
      expect(stats.lastSeq).toBe(2);
      expect(stats.firstSeq).toBe(1);
    });
  });

  describe('Wrap-around Behavior', () => {
    it('should handle capacity overflow correctly', () => {
      // Fill buffer to capacity
      for (let i = 1; i <= 5; i++) {
        buffer.push({ ts: i * 1000, type: `test.${i}`, payload: { i } });
      }
      
      let stats = buffer.stats();
      expect(stats.size).toBe(5);
      expect(stats.dropped).toBe(0);
      expect(stats.lastSeq).toBe(5);
      expect(stats.firstSeq).toBe(1);
      
      // Add more entries to trigger wrap-around
      buffer.push({ ts: 6000, type: 'test.6', payload: { i: 6 } });
      buffer.push({ ts: 7000, type: 'test.7', payload: { i: 7 } });
      
      stats = buffer.stats();
      expect(stats.size).toBe(5); // Size stays at capacity
      expect(stats.dropped).toBe(2); // Two entries dropped
      expect(stats.lastSeq).toBe(7);
      
      const entries = buffer.toArray();
      expect(entries).toHaveLength(5);
      expect(entries[0].seq).toBe(3); // Earliest remaining
      expect(entries[4].seq).toBe(7); // Latest
    });

    it('should maintain sequence ordering after wrap-around', () => {
      // Fill past capacity
      for (let i = 1; i <= 10; i++) {
        buffer.push({ ts: i * 1000, type: `test.${i}`, payload: { i } });
      }
      
      const entries = buffer.toArray();
      expect(entries).toHaveLength(5);
      
      // Verify entries are in sequence order
      for (let i = 0; i < entries.length - 1; i++) {
        expect(entries[i + 1].seq).toBe(entries[i].seq + 1);
      }
      
      expect(entries[0].seq).toBe(6); // First remaining: 6,7,8,9,10
      expect(entries[4].seq).toBe(10);
    });
  });

  describe('Incremental Querying', () => {
    beforeEach(() => {
      // Add test data
      for (let i = 1; i <= 8; i++) {
        buffer.push({ ts: i * 1000, type: `test.${i}`, payload: { i } });
      }
    });

    it('should return only entries >= sinceSeq', () => {
      const entries = buffer.toArray(6);
      expect(entries).toHaveLength(3); // seq 6,7,8
      expect(entries[0].seq).toBe(6);
      expect(entries[2].seq).toBe(8);
    });

    it('should return empty array when sinceSeq > lastSeq', () => {
      const entries = buffer.toArray(100);
      expect(entries).toEqual([]);
    });

    it('should handle sinceSeq = 0 correctly', () => {
      const allEntries = buffer.toArray();
      const fromZero = buffer.toArray(0);
      expect(fromZero).toEqual(allEntries);
    });

    it('should support pagination pattern', () => {
      const page1 = buffer.toArray(1);
      expect(page1).toHaveLength(5); // Limited by capacity after wrap-around
      
      const lastSeq = page1[page1.length - 1].seq;
      const page2 = buffer.toArray(lastSeq + 1);
      expect(page2).toEqual([]); // No more entries
    });
  });

  describe('Clear Operations', () => {
    beforeEach(() => {
      for (let i = 1; i <= 7; i++) {
        buffer.push({ ts: i * 1000, type: `test.${i}`, payload: { i } });
      }
    });

    it('should clear all entries when called without arguments', () => {
      buffer.clear();
      
      const stats = buffer.stats();
      expect(stats.size).toBe(0);
      expect(stats.dropped).toBe(0);
      expect(stats.lastSeq).toBe(0);
      expect(stats.firstSeq).toBeNull();
      expect(buffer.toArray()).toEqual([]);
    });

    it('should preserve last N entries when specified', () => {
      buffer.clear(3);
      
      const entries = buffer.toArray();
      expect(entries).toHaveLength(3);
      expect(entries[0].seq).toBe(5); // Last 3: seq 5,6,7
      expect(entries[2].seq).toBe(7);
      
      const stats = buffer.stats();
      expect(stats.size).toBe(3);
      expect(stats.dropped).toBe(0); // Reset after clear
    });

    it('should handle preserveLast > current size', () => {
      buffer.clear(10); // More than current size
      
      const entries = buffer.toArray();
      expect(entries).toHaveLength(5); // Only what we had (after wrap-around)
    });
  });

  describe('Edge Cases', () => {
    it('should enforce minimum capacity', () => {
      const tiny = createRing(2); // Below minimum
      const stats = tiny.stats();
      expect(stats.capacity).toBe(5); // Clamped to minimum
    });

    it('should enforce maximum capacity', () => {
      const huge = createRing(20000); // Above maximum
      const stats = huge.stats();
      expect(stats.capacity).toBe(10000); // Clamped to maximum
    });

    it('should handle metadata fields correctly', () => {
      buffer.push({ 
        ts: 1000, 
        type: 'test', 
        payload: { data: 'test' },
        level: 'info',
        branch: 'main'
      });
      
      const entries = buffer.toArray();
      expect(entries[0].level).toBe('info');
      expect(entries[0].branch).toBe('main');
    });
  });

  describe('Performance Characteristics', () => {
    it('should maintain O(1) insertion time under load', () => {
      const start = performance.now();
      
      // Insert many entries
      for (let i = 0; i < 10000; i++) {
        buffer.push({ ts: i, type: 'perf.test', payload: { i } });
      }
      
      const duration = performance.now() - start;
      
      // Should complete quickly even with many insertions
      expect(duration).toBeLessThan(100); // 100ms threshold
      
      // Buffer should still respect capacity
      const stats = buffer.stats();
      expect(stats.size).toBe(5); // Original capacity
      expect(stats.dropped).toBe(9995); // 10000 - 5
    });
  });
});