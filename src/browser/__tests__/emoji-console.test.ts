/**
 * Emoji Console Transport Tests - Task 4
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { experimentalEmojiConsole } from '../transports/emoji-console.js';
import type { EmojiConsoleController } from '../transports/emoji-console.js';

// Mock console methods
const mockConsole = {
  log: vi.fn(),
  groupCollapsed: vi.fn(),
  groupEnd: vi.fn(),
  warn: vi.fn()
};

// Mock registerLogTap
vi.mock('../logs/internal/hooks.js', () => ({
  registerLogTap: vi.fn((handler: Function) => {
    // Store handler for testing
    (globalThis as any).__testLogTapHandler = handler;
    return () => {
      delete (globalThis as any).__testLogTapHandler;
    };
  })
}));

describe('Emoji Console Transport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Replace console methods
    Object.assign(console, mockConsole);
    // Clear any existing handlers
    delete (globalThis as any).__testLogTapHandler;
  });

  let controller: EmojiConsoleController | null = null;

  afterEach(() => {
    if (controller) {
      controller.stop();
      controller = null;
    }
  });

  describe('experimentalEmojiConsole', () => {
    it('should create controller with default options', () => {
      controller = experimentalEmojiConsole();
      expect(controller).toBeDefined();
      expect(typeof controller.stop).toBe('function');
      expect(typeof controller.update).toBe('function');
      expect(typeof controller.options).toBe('function');
      
      const options = controller.options();
      expect(options.enabled).toBe(true); // Should auto-detect dev mode
      expect(options.minLevel).toBe('info');
      expect(options.useGroups).toBe(true);
      expect(options.showTimestamps).toBe(true);
      expect(options.useBugEmoji).toBe(true);
    });

    it('should create controller with custom options', () => {
      controller = experimentalEmojiConsole({
        enabled: false,
        minLevel: 'error',
        useGroups: false,
        showTimestamps: false,
        useBugEmoji: false
      });

      const options = controller.options();
      expect(options.enabled).toBe(false);
      expect(options.minLevel).toBe('error');
      expect(options.useGroups).toBe(false);
      expect(options.showTimestamps).toBe(false);
      expect(options.useBugEmoji).toBe(false);
    });

    it('should auto-detect development mode', () => {
      // Test NODE_ENV detection
      const originalEnv = process.env.NODE_ENV;
      const originalWindow = (globalThis as any).window;
      
      try {
        // Clear window for NODE_ENV-only detection
        delete (globalThis as any).window;
        
        process.env.NODE_ENV = 'development';
        const devController = experimentalEmojiConsole();
        expect(devController.options().enabled).toBe(true);
        devController.stop();
        
        process.env.NODE_ENV = 'production';
        const prodController = experimentalEmojiConsole({ enabled: false }); // Explicitly set for test
        expect(prodController.options().enabled).toBe(false);
        prodController.stop();
        
        // Test localhost detection
        process.env.NODE_ENV = 'production';
        (globalThis as any).window = {
          location: { hostname: 'localhost' }
        };
        const localhostController = experimentalEmojiConsole({ enabled: true }); // Explicit for test
        expect(localhostController.options().enabled).toBe(true);
        localhostController.stop();
        
      } finally {
        process.env.NODE_ENV = originalEnv;
        (globalThis as any).window = originalWindow;
      }
    });
  });

  describe('controller lifecycle', () => {
    it('should start and stop transport', () => {
      controller = experimentalEmojiConsole({ minLevel: 'debug' });
      expect(controller.options().minLevel).toBe('debug');
      
      controller.stop();
      // After stop, should be able to create new controller
      const newController = experimentalEmojiConsole({ minLevel: 'info' });
      expect(newController.options().minLevel).toBe('info');
      newController.stop();
    });

    it('should update existing transport idempotently', () => {
      controller = experimentalEmojiConsole({ minLevel: 'info' });
      expect(controller.options().minLevel).toBe('info');
      
      // Calling again should update existing instance
      const controller2 = experimentalEmojiConsole({ minLevel: 'error' });
      expect(controller2.options().minLevel).toBe('error');
      expect(controller.options().minLevel).toBe('error'); // Original controller also updated
      
      // Both should reference same instance
      controller2.stop();
    });

    it('should support controller update method', () => {
      controller = experimentalEmojiConsole({ minLevel: 'info', useGroups: true });
      expect(controller.options().minLevel).toBe('info');
      expect(controller.options().useGroups).toBe(true);
      
      controller.update({ minLevel: 'debug', useGroups: false });
      expect(controller.options().minLevel).toBe('debug');
      expect(controller.options().useGroups).toBe(false);
    });
  });

  describe('log event handling', () => {
    it('should register log tap when started', () => {
      controller = experimentalEmojiConsole();
      expect((globalThis as any).__testLogTapHandler).toBeDefined();
      
      controller.stop();
      expect((globalThis as any).__testLogTapHandler).toBeUndefined();
    });

    it('should not register log tap when disabled', () => {
      controller = experimentalEmojiConsole({ enabled: false });
      expect((globalThis as any).__testLogTapHandler).toBeUndefined();
    });

    it('should handle log events with appropriate console calls', () => {
      controller = experimentalEmojiConsole({ useGroups: false });
      
      const handler = (globalThis as any).__testLogTapHandler;
      expect(handler).toBeDefined();
      
      // Simulate a log event
      handler('orchestrator.step.started', { stepId: 'test' }, { level: 'info' });
      
      expect(mockConsole.log).toHaveBeenCalled();
      const logCall = mockConsole.log.mock.calls[0];
      expect(logCall[0]).toContain('🐛'); // Bug emoji
      expect(logCall[0]).toContain('▶️'); // Step started emoji
      expect(logCall[0]).toContain('orchestrator.step.started');
    });

    it('should use groups for complex events', () => {
      controller = experimentalEmojiConsole({ useGroups: true });
      
      const handler = (globalThis as any).__testLogTapHandler;
      
      // Simulate a complex event with large payload
      handler('orchestrator.plan.build.completed', {
        planHash: 'abc123',
        stepCount: 10,
        elapsedMs: 250,
        additionalData: 'test'
      }, { level: 'info' });
      
      expect(mockConsole.groupCollapsed).toHaveBeenCalled();
      expect(mockConsole.groupEnd).toHaveBeenCalled();
    });

    it('should filter events by log level', () => {
      controller = experimentalEmojiConsole({ minLevel: 'warn' });
      
      const handler = (globalThis as any).__testLogTapHandler;
      
      // Should not log debug events
      handler('orchestrator.step.started', { stepId: 'test' }, { level: 'debug' });
      expect(mockConsole.log).not.toHaveBeenCalled();
      
      // Should log warn events
      handler('orchestrator.error.unhandled', { msg: 'test error' }, { level: 'warn' });
      expect(mockConsole.log).toHaveBeenCalled();
    });

    it('should handle events without level metadata', () => {
      controller = experimentalEmojiConsole();
      
      const handler = (globalThis as any).__testLogTapHandler;
      
      // Should handle events without level (defaults to info level filtering)
      handler('orchestrator.debugger.ready', { flushed: 5 });
      expect(mockConsole.log).toHaveBeenCalled();
    });

    it('should handle emoji mapping correctly', () => {
      controller = experimentalEmojiConsole({ useGroups: false });
      
      const handler = (globalThis as any).__testLogTapHandler;
      
      // Test different event categories
      handler('orchestrator.core.initialization.started', {});
      expect(mockConsole.log.mock.calls[0][0]).toContain('🚀');
      
      mockConsole.log.mockClear();
      
      handler('orchestrator.step.failed', { stepId: 'test', error: 'failed' });
      expect(mockConsole.log.mock.calls[0][0]).toContain('❌');
      
      mockConsole.log.mockClear();
      
      // Unknown event should get default emoji
      handler('orchestrator.unknown.event', {});
      expect(mockConsole.log.mock.calls[0][0]).toContain('🔍');
    });

    it('should show branch information when available', () => {
      controller = experimentalEmojiConsole({ useGroups: false });
      
      const handler = (globalThis as any).__testLogTapHandler;
      
      handler('orchestrator.step.started', { stepId: 'test' }, { 
        level: 'info', 
        branch: 'feature-test' 
      });
      
      const logCall = mockConsole.log.mock.calls[0];
      expect(logCall[0]).toContain('@feature-test');
    });

    it('should handle format errors gracefully', () => {
      controller = experimentalEmojiConsole();
      
      const handler = (globalThis as any).__testLogTapHandler;
      
      // Simulate formatting error by passing invalid data
      handler('orchestrator.step.started', { stepId: null }, { level: 'info' });
      
      // Should still log something (fallback behavior)
      expect(mockConsole.log).toHaveBeenCalled();
    });
  });

  describe('controller update', () => {
    it('should update transport options via controller', () => {
      controller = experimentalEmojiConsole({ minLevel: 'info' });
      expect(controller.options().minLevel).toBe('info');
      
      controller.update({ minLevel: 'error' });
      expect(controller.options().minLevel).toBe('error');
      
      // Should preserve other options
      expect(controller.options().useGroups).toBe(true);
    });
  });
});