/**
 * Emoji Console Transport Tests - Task 4
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createEmojiConsole, startEmojiConsole, stopEmojiConsole, getEmojiConsoleOptions } from '../transports/emoji-console.js';

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

  afterEach(() => {
    stopEmojiConsole();
  });

  describe('createEmojiConsole', () => {
    it('should create transport with default options', () => {
      const transport = createEmojiConsole();
      expect(transport).toBeDefined();
      expect(transport.getOptions().enabled).toBe(true); // Should auto-detect dev mode
      expect(transport.getOptions().minLevel).toBe('info');
      expect(transport.getOptions().useGroups).toBe(true);
      expect(transport.getOptions().showTimestamps).toBe(true);
      expect(transport.getOptions().useBugEmoji).toBe(true);
    });

    it('should create transport with custom options', () => {
      const transport = createEmojiConsole({
        enabled: false,
        minLevel: 'error',
        useGroups: false,
        showTimestamps: false,
        useBugEmoji: false
      });

      const options = transport.getOptions();
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
        const devTransport = createEmojiConsole();
        expect(devTransport.getOptions().enabled).toBe(true);
        
        process.env.NODE_ENV = 'production';
        const prodTransport = createEmojiConsole();
        expect(prodTransport.getOptions().enabled).toBe(false);
        
        // Test localhost detection
        process.env.NODE_ENV = 'production';
        (globalThis as any).window = {
          location: { hostname: 'localhost' }
        };
        const localhostTransport = createEmojiConsole();
        expect(localhostTransport.getOptions().enabled).toBe(true);
        
      } finally {
        process.env.NODE_ENV = originalEnv;
        (globalThis as any).window = originalWindow;
      }
    });
  });

  describe('global transport functions', () => {
    it('should start and stop global transport', () => {
      expect(getEmojiConsoleOptions()).toBeNull();
      
      startEmojiConsole({ minLevel: 'debug' });
      expect(getEmojiConsoleOptions()).not.toBeNull();
      expect(getEmojiConsoleOptions()?.minLevel).toBe('debug');
      
      stopEmojiConsole();
      expect(getEmojiConsoleOptions()).toBeNull();
    });

    it('should replace existing global transport', () => {
      startEmojiConsole({ minLevel: 'info' });
      expect(getEmojiConsoleOptions()?.minLevel).toBe('info');
      
      startEmojiConsole({ minLevel: 'error' });
      expect(getEmojiConsoleOptions()?.minLevel).toBe('error');
    });
  });

  describe('log event handling', () => {
    it('should register log tap when started', () => {
      const transport = createEmojiConsole();
      transport.start();
      
      expect((globalThis as any).__testLogTapHandler).toBeDefined();
      
      transport.stop();
      expect((globalThis as any).__testLogTapHandler).toBeUndefined();
    });

    it('should not register log tap when disabled', () => {
      const transport = createEmojiConsole({ enabled: false });
      transport.start();
      
      expect((globalThis as any).__testLogTapHandler).toBeUndefined();
    });

    it('should handle log events with appropriate console calls', () => {
      const transport = createEmojiConsole({ useGroups: false });
      transport.start();
      
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
      const transport = createEmojiConsole({ useGroups: true });
      transport.start();
      
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
      const transport = createEmojiConsole({ minLevel: 'warn' });
      transport.start();
      
      const handler = (globalThis as any).__testLogTapHandler;
      
      // Should not log debug events
      handler('orchestrator.step.started', { stepId: 'test' }, { level: 'debug' });
      expect(mockConsole.log).not.toHaveBeenCalled();
      
      // Should log warn events
      handler('orchestrator.error.unhandled', { msg: 'test error' }, { level: 'warn' });
      expect(mockConsole.log).toHaveBeenCalled();
    });

    it('should handle events without level metadata', () => {
      const transport = createEmojiConsole();
      transport.start();
      
      const handler = (globalThis as any).__testLogTapHandler;
      
      // Should handle events without level (defaults to info level filtering)
      handler('orchestrator.debugger.ready', { flushed: 5 });
      expect(mockConsole.log).toHaveBeenCalled();
    });

    it('should handle emoji mapping correctly', () => {
      const transport = createEmojiConsole({ useGroups: false });
      transport.start();
      
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
      const transport = createEmojiConsole({ useGroups: false });
      transport.start();
      
      const handler = (globalThis as any).__testLogTapHandler;
      
      handler('orchestrator.step.started', { stepId: 'test' }, { 
        level: 'info', 
        branch: 'feature-test' 
      });
      
      const logCall = mockConsole.log.mock.calls[0];
      expect(logCall[0]).toContain('@feature-test');
    });

    it('should handle format errors gracefully', () => {
      const transport = createEmojiConsole();
      transport.start();
      
      const handler = (globalThis as any).__testLogTapHandler;
      
      // Simulate formatting error by passing invalid data
      handler('orchestrator.step.started', { stepId: null }, { level: 'info' });
      
      // Should still log something (fallback behavior)
      expect(mockConsole.log).toHaveBeenCalled();
    });
  });

  describe('updateOptions', () => {
    it('should update transport options', () => {
      const transport = createEmojiConsole({ minLevel: 'info' });
      expect(transport.getOptions().minLevel).toBe('info');
      
      transport.updateOptions({ minLevel: 'error' });
      expect(transport.getOptions().minLevel).toBe('error');
      
      // Should preserve other options
      expect(transport.getOptions().useGroups).toBe(true);
    });
  });
});