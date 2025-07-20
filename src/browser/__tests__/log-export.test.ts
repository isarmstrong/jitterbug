/**
 * Log Export Tests - Phase B
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { logInspector } from '../public-logs.js';
import { attachLogCapture } from '../logs/internal/attach.js';
import { safeEmit, setGlobalEmitFn } from '../schema-registry.js';

describe('Log Export (Phase B)', () => {
  beforeEach(() => {
    attachLogCapture(100); // Small buffer for testing
    
    // Set up mock global emit function for tests
    let seq = 0;
    setGlobalEmitFn((_type: string, _payload: any, _opts?: any) => {
      return `test-event-${++seq}`;
    });
  });

  describe('Basic Export Functionality', () => {
    it('should return empty result when no logs exist', () => {
      const result = logInspector.export();
      
      expect(result).toEqual({
        kind: 'empty',
        reason: 'no_logs'
      });
    });

    it('should export logs in JSONL format by default', () => {
      // Generate some test logs
      safeEmit('orchestrator.step.started', { stepId: 'test1' }, { level: 'info' });
      safeEmit('orchestrator.step.completed', { stepId: 'test1', durationMs: 100 }, { level: 'info' });
      
      const result = logInspector.export();
      
      expect(result.kind).toBe('success');
      if (result.kind === 'success') {
        expect(result.format).toBe('jsonl');
        expect(result.data).toContain('orchestrator.step.started');
        expect(result.data).toContain('orchestrator.step.completed');
        expect(result.returned).toBe(2);
        expect(result.total).toBe(2);
        expect(result.truncated).toBe(false);
      }
    });

    it('should export logs in raw format', () => {
      safeEmit('orchestrator.step.started', { stepId: 'test1' }, { level: 'info' });
      
      const result = logInspector.export({ format: 'raw' });
      
      expect(result.kind).toBe('success');
      if (result.kind === 'success') {
        expect(result.format).toBe('raw');
        expect(result.data).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z \[INFO\] orchestrator\.step\.started/);
        expect(result.data).toContain('{"stepId":"test1"}');
      }
    });
  });

  describe('Filtering Options', () => {
    beforeEach(() => {
      // Generate test data with different levels
      safeEmit('orchestrator.debugger.ready', { flushed: 1 }, { level: 'info' });
      safeEmit('orchestrator.debugger.ready', { flushed: 2 }, { level: 'error' });
      safeEmit('orchestrator.debugger.ready', { flushed: 3 }, { level: 'debug' });
      safeEmit('orchestrator.debugger.ready', { flushed: 4 }, { level: 'info' });
    });

    it('should filter by level', () => {
      const result = logInspector.export({ levels: ['error'] });
      
      expect(result.kind).toBe('success');
      if (result.kind === 'success') {
        expect(result.returned).toBe(1);
        expect(result.data).toContain('"level":"error"');
      }
    });

    it('should filter by multiple levels', () => {
      const result = logInspector.export({ levels: ['info', 'error'] });
      
      expect(result.kind).toBe('success');
      if (result.kind === 'success') {
        expect(result.returned).toBeGreaterThanOrEqual(3); // At least our test events
        // Verify filtered content contains our test events
        expect(result.data).toContain('"level":"info"');
        expect(result.data).toContain('"level":"error"');
        expect(result.data).not.toContain('"level":"debug"');
      }
    });

    it('should apply limit', () => {
      const result = logInspector.export({ limit: 2 });
      
      expect(result.kind).toBe('success');
      if (result.kind === 'success') {
        expect(result.returned).toBe(2);
        expect(result.truncated).toBe(true);
        expect(result.total).toBeGreaterThanOrEqual(4); // At least our test events
      }
    });

    it('should return empty when filters exclude all logs', () => {
      const result = logInspector.export({ branches: ['nonexistent'] });
      
      expect(result).toEqual({
        kind: 'empty',
        reason: 'filtered_out'
      });
    });
  });

  describe('Format Validation', () => {
    it('should handle invalid format gracefully', () => {
      safeEmit('orchestrator.debugger.ready', { flushed: 1 }, { level: 'info' });
      
      expect(() => {
        logInspector.export({ format: 'invalid' as any });
      }).toThrow('Unsupported format: invalid');
    });
  });

  describe('Data Integrity', () => {
    it('should include all required fields in JSONL format', () => {
      safeEmit('orchestrator.debugger.ready', { flushed: 999 }, { level: 'info' });
      
      const result = logInspector.export({ format: 'jsonl' });
      
      expect(result.kind).toBe('success');
      if (result.kind === 'success') {
        const lines = result.data.split('\n');
        // Find our specific event
        const testEvent = lines.find(line => line.includes('"flushed":999'));
        expect(testEvent).toBeDefined();
        
        const parsed = JSON.parse(testEvent!);
        
        expect(parsed).toHaveProperty('seq');
        expect(parsed).toHaveProperty('ts');
        expect(parsed).toHaveProperty('type');
        expect(parsed).toHaveProperty('level');
        expect(parsed).toHaveProperty('branch');
        expect(parsed).toHaveProperty('payload');
        
        expect(parsed.type).toBe('orchestrator.debugger.ready');
        expect(parsed.level).toBe('info');
        expect(parsed.payload).toEqual({ flushed: 999 });
      }
    });

    it('should format timestamps correctly in raw format', () => {
      safeEmit('orchestrator.debugger.ready', { flushed: 1 }, { level: 'info' });
      
      const result = logInspector.export({ format: 'raw' });
      
      expect(result.kind).toBe('success');
      if (result.kind === 'success') {
        // Should contain ISO timestamp format
        expect(result.data).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/);
      }
    });
  });

  describe('Capabilities Update', () => {
    it('should reflect export formats in capabilities', () => {
      const capabilities = logInspector.capabilities();
      
      expect(capabilities.exports).toEqual(['jsonl', 'raw']);
    });
  });
});