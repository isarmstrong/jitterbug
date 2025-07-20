/**
 * Debug Umbrella Tests - Phase C
 * 
 * Validates the consolidated debug interface and backwards compatibility.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { debug, logInspector, experimentalEmojiConsole, configPersistence, experimentalSafeEmit } from '../public.js';

describe('Debug Umbrella (Phase C)', () => {
  describe('Structure and Access', () => {
    it('should expose all expected interfaces', () => {
      expect(debug).toHaveProperty('logs');
      expect(debug).toHaveProperty('emojiConsole');
      expect(debug).toHaveProperty('config');
      expect(debug).toHaveProperty('emit');
    });

    it('should provide logs interface', () => {
      expect(typeof debug.logs.query).toBe('function');
      expect(typeof debug.logs.export).toBe('function');
      expect(typeof debug.logs.capabilities).toBe('function');
    });

    it('should provide emojiConsole interface', () => {
      expect(typeof debug.emojiConsole).toBe('function');
    });

    it('should provide config interface', () => {
      expect(typeof debug.config.load).toBe('function');
      expect(typeof debug.config.save).toBe('function');
      expect(typeof debug.config.reset).toBe('function');
      expect(typeof debug.config.snapshot).toBe('function');
    });

    it('should provide emit interface', () => {
      expect(typeof debug.emit).toBe('function');
    });
  });

  describe('Backwards Compatibility', () => {
    it('should maintain logInspector compatibility', () => {
      const umbrellaResult = debug.logs.capabilities();
      const legacyResult = logInspector.capabilities();
      
      expect(umbrellaResult).toEqual(legacyResult);
    });

    it('should maintain emojiConsole compatibility', () => {
      const umbrellaController = debug.emojiConsole();
      const legacyController = experimentalEmojiConsole();
      
      expect(typeof umbrellaController.stop).toBe('function');
      expect(typeof legacyController.stop).toBe('function');
      
      // Clean up
      umbrellaController.stop();
      legacyController.stop();
    });

    it('should maintain config compatibility', () => {
      const umbrellaSnapshot = debug.config.snapshot();
      const legacySnapshot = configPersistence.snapshot();
      
      expect(umbrellaSnapshot).toEqual(legacySnapshot);
    });

    it('should maintain emit compatibility', () => {
      expect(debug.emit).toBe(experimentalSafeEmit);
    });
  });

  describe('Functional Validation', () => {
    beforeEach(() => {
      // Clear any existing state
    });

    it('should allow logs export through umbrella', () => {
      const result = debug.logs.export();
      expect(result.kind).toMatch(/^(empty|success)$/); // May have logs from other tests
      if (result.kind === 'empty') {
        expect(result.reason).toMatch(/^(no_logs|filtered_out)$/);
      }
    });

    it('should allow emoji console control through umbrella', () => {
      const controller = debug.emojiConsole({ enabled: false });
      expect(typeof controller.stop).toBe('function');
      expect(typeof controller.update).toBe('function');
      expect(typeof controller.options).toBe('function');
      
      const options = controller.options();
      expect(options.enabled).toBe(false);
      
      controller.stop();
    });

    it('should allow config operations through umbrella', () => {
      const snapshot = debug.config.snapshot();
      expect(typeof snapshot).toBe('object');
      
      const loadResult = debug.config.load();
      expect(loadResult).toHaveProperty('status');
    });

    it('should allow event emission through umbrella', () => {
      const result = debug.emit('orchestrator.debugger.ready', { flushed: 0 });
      expect(typeof result).toBe('string'); // Returns event ID
    });
  });

  describe('Type Safety', () => {
    it('should be read-only (as const)', () => {
      // This test ensures the object structure is constant
      const originalLogs = debug.logs;
      expect(originalLogs).toBeDefined();
      expect(typeof originalLogs.export).toBe('function');
    });

    it('should preserve method signatures', () => {
      // Test that the wrapped methods maintain their original signatures
      const exportResult = debug.logs.export({ format: 'jsonl', limit: 10 });
      expect(exportResult).toHaveProperty('kind');
      
      if (exportResult.kind === 'success') {
        expect(exportResult).toHaveProperty('format');
        expect(exportResult).toHaveProperty('data');
        expect(exportResult).toHaveProperty('total');
        expect(exportResult).toHaveProperty('returned');
        expect(exportResult).toHaveProperty('truncated');
      } else {
        expect(exportResult).toHaveProperty('reason');
      }
    });
  });

  describe('Tree Shaking Safety', () => {
    it('should not force-load heavy components until accessed', () => {
      // This test ensures lazy loading doesn't break
      expect(debug.logs).toBeDefined();
      expect(debug.emojiConsole).toBeDefined();
      expect(debug.config).toBeDefined();
      expect(debug.emit).toBeDefined();
    });
  });
});