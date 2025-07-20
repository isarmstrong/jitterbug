/**
 * Debug Control Tests - Task 3.3
 * 
 * Comprehensive testing of debug level gating, enable/disable controls,
 * validation, idempotence, and integration with event emission.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { experimentalDebug } from '../debug-control.js';
import { __resetDebugState, DebugLevels } from '../debug-state.js';
import { initializeJitterbug } from '../bootstrap.js';
import type { JitterbugGlobal } from '../types.js';

// Mock window for testing
let mockWindow: any;
let api: JitterbugGlobal;

describe('Debug Control (Task 3.3)', () => {
  beforeEach(() => {
    // Reset debug state to defaults before each test
    __resetDebugState();
    
    // Create fresh mock window and initialize
    mockWindow = {
      onerror: null,
      onunhandledrejection: null
    };
    
    initializeJitterbug(mockWindow);
    api = mockWindow.jitterbug;
    
    // Note initial event count for comparison (getEvents returns readonly array)
    // We'll use slice() and length comparisons instead of clearing events
  });

  describe('Initial State', () => {
    it('should start with debug enabled and INFO level', () => {
      expect(api.debug.isEnabled()).toBe(true);
      expect(api.debug.getLevel()).toBe(DebugLevels.INFO);
      
      const state = api.debug.getState();
      expect(state.enabled).toBe(true);
      expect(state.level).toBe(3);
      expect(state.changedBy).toBe('system');
    });

    it('should provide debug level constants', () => {
      const levels = api.debug.levels;
      expect(levels.OFF).toBe(0);
      expect(levels.ERROR).toBe(1);
      expect(levels.WARN).toBe(2);
      expect(levels.INFO).toBe(3);
      expect(levels.DEBUG).toBe(4);
      expect(levels.TRACE).toBe(5);
    });
  });

  describe('Enable/Disable Controls', () => {
    it('should disable and enable debug emission', () => {
      // Initially enabled
      expect(api.debug.isEnabled()).toBe(true);
      
      // Disable
      const disableResult = api.debug.disable();
      expect(api.debug.isEnabled()).toBe(false);
      expect(disableResult.enabled).toBe(false);
      expect(disableResult.changedBy).toBe('api');
      
      // Re-enable
      const enableResult = api.debug.enable();
      expect(api.debug.isEnabled()).toBe(true);
      expect(enableResult.enabled).toBe(true);
      expect(enableResult.changedBy).toBe('api');
    });

    it('should emit events for enable/disable changes', () => {
      // Clear initial events
      const initialEventCount = api.getEvents().length;
      
      // Disable should emit event
      api.debug.disable();
      let events = api.getEvents().slice(initialEventCount);
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('orchestrator.debug.disabled');
      expect(events[0].payload.prev).toBe(true);
      expect(events[0].payload.by).toBe('api');
      
      // Enable should emit event
      api.debug.enable();
      events = api.getEvents().slice(initialEventCount + 1);
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('orchestrator.debug.enabled');
      expect(events[0].payload.prev).toBe(false);
      expect(events[0].payload.by).toBe('api');
    });

    it('should be idempotent - no duplicate events on no-op changes', () => {
      const initialEventCount = api.getEvents().length;
      
      // Enable when already enabled - should not emit
      api.debug.enable();
      expect(api.getEvents()).toHaveLength(initialEventCount);
      
      // Disable then disable again
      api.debug.disable();
      expect(api.getEvents()).toHaveLength(initialEventCount + 1);
      
      api.debug.disable(); // Second disable
      expect(api.getEvents()).toHaveLength(initialEventCount + 1); // No new event
    });

    it('should support different change sources', () => {
      api.debug.disable('config');
      const events = api.getEvents();
      const disableEvent = events.find(e => e.type === 'orchestrator.debug.disabled');
      expect(disableEvent?.payload.by).toBe('config');
    });
  });

  describe('Level Controls', () => {
    it('should set and get debug levels', () => {
      // Set to ERROR level
      const result = api.debug.setLevel(DebugLevels.ERROR);
      expect(api.debug.getLevel()).toBe(DebugLevels.ERROR);
      expect(result.level).toBe(1);
      expect(result.changedBy).toBe('api');
      
      // Set to TRACE level
      api.debug.setLevel(DebugLevels.TRACE);
      expect(api.debug.getLevel()).toBe(DebugLevels.TRACE);
    });

    it('should emit events for level changes', () => {
      const initialEventCount = api.getEvents().length;
      
      api.debug.setLevel(DebugLevels.ERROR);
      const events = api.getEvents().slice(initialEventCount);
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('orchestrator.debug.level.changed');
      expect(events[0].payload.prev).toBe(3); // INFO
      expect(events[0].payload.next).toBe(1); // ERROR
      expect(events[0].payload.by).toBe('api');
    });

    it('should be idempotent for level changes', () => {
      const initialEventCount = api.getEvents().length;
      
      // Set to same level - should not emit
      api.debug.setLevel(DebugLevels.INFO); // Already INFO
      expect(api.getEvents()).toHaveLength(initialEventCount);
      
      // Change level then set to same level
      api.debug.setLevel(DebugLevels.DEBUG);
      expect(api.getEvents()).toHaveLength(initialEventCount + 1);
      
      api.debug.setLevel(DebugLevels.DEBUG); // Same level again
      expect(api.getEvents()).toHaveLength(initialEventCount + 1); // No new event
    });

    it('should validate level inputs', () => {
      expect(() => api.debug.setLevel(-1)).toThrow('Invalid debug level: -1');
      expect(() => api.debug.setLevel(6)).toThrow('Invalid debug level: 6');
      expect(() => api.debug.setLevel('invalid')).toThrow('Invalid debug level: invalid');
      expect(() => api.debug.setLevel(3.5)).toThrow('Invalid debug level: 3.5');
      expect(() => api.debug.setLevel(null)).toThrow('Invalid debug level: null');
    });

    it('should emit validation failed events for invalid inputs', () => {
      const initialEventCount = api.getEvents().length;
      
      try {
        api.debug.setLevel('invalid');
      } catch {
        // Expected to throw
      }
      
      const events = api.getEvents().slice(initialEventCount);
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('orchestrator.debug.validation.failed');
      expect(events[0].payload.reason).toBe('INVALID_LEVEL');
      expect(events[0].payload.received).toBe('invalid');
      expect(events[0].payload.expected).toBe('integer 0-5');
    });

    it('should allow level changes while disabled', () => {
      api.debug.disable();
      expect(api.debug.isEnabled()).toBe(false);
      
      // Should allow level change
      api.debug.setLevel(DebugLevels.ERROR);
      expect(api.debug.getLevel()).toBe(DebugLevels.ERROR);
      
      const state = api.debug.getState();
      expect(state.enabled).toBe(false);
      expect(state.level).toBe(1);
    });
  });

  describe('Event Gating', () => {
    it('should gate events above current level', () => {
      // Set to ERROR level (1)
      api.debug.setLevel(DebugLevels.ERROR);
      const initialEventCount = api.getEvents().length;
      
      // Try to emit DEBUG level event (4) - should be gated
      experimentalDebug.__testing.emitWithAutoLevel('orchestrator.step.dispatch.started', {
        stepId: 'test-step',
        adapter: 'test-adapter',
        attempt: 1
      });
      
      // Try to emit ERROR level event (1) - should pass
      experimentalDebug.__testing.emitWithAutoLevel('orchestrator.core.initialization.failed', {
        error: 'test error',
        durationMs: 100
      });
      
      const newEvents = api.getEvents().slice(initialEventCount);
      expect(newEvents).toHaveLength(1);
      expect(newEvents[0].type).toBe('orchestrator.core.initialization.failed');
    });

    it('should suppress all events when disabled except debug control events', () => {
      api.debug.disable();
      const initialEventCount = api.getEvents().length;
      
      // Try to emit INFO level event - should be suppressed
      experimentalDebug.__testing.emitWithAutoLevel('orchestrator.core.initialization.completed', {
        durationMs: 100,
        rulesCount: 5
      });
      
      // Try to emit ERROR level event - should be suppressed
      experimentalDebug.__testing.emitWithAutoLevel('orchestrator.core.initialization.failed', {
        error: 'test error',
        durationMs: 100
      });
      
      // Re-enable - this should emit debug control event
      api.debug.enable();
      
      const newEvents = api.getEvents().slice(initialEventCount);
      expect(newEvents).toHaveLength(1);
      expect(newEvents[0].type).toBe('orchestrator.debug.enabled');
    });

    it('should always emit validation failures regardless of debug state', () => {
      api.debug.disable();
      api.debug.setLevel(DebugLevels.OFF);
      const initialEventCount = api.getEvents().length;
      
      try {
        api.debug.setLevel('invalid');
      } catch {
        // Expected to throw
      }
      
      const newEvents = api.getEvents().slice(initialEventCount);
      expect(newEvents.some(e => e.type === 'orchestrator.debug.validation.failed')).toBe(true);
    });

    it('should use correct default levels for event types', () => {
      const getEventLevel = experimentalDebug.__testing.getEventLevel;
      
      // Core lifecycle should be INFO (3)
      expect(getEventLevel('orchestrator.core.initialization.completed')).toBe(3);
      
      // Failures should be ERROR (1)  
      expect(getEventLevel('orchestrator.core.initialization.failed')).toBe(1);
      
      // Step operations should be DEBUG (4)
      expect(getEventLevel('orchestrator.step.dispatch.started')).toBe(4);
      
      // Branch operations should be INFO (3)
      expect(getEventLevel('orchestrator.branch.lifecycle.created')).toBe(3);
      
      // Unknown events should default to INFO (3)
      expect(getEventLevel('unknown.event.type')).toBe(3);
    });
  });

  describe('Integration with Bootstrap API', () => {
    it('should be accessible via window.jitterbug.debug', () => {
      expect(mockWindow.jitterbug.debug).toBeDefined();
      expect(typeof mockWindow.jitterbug.debug.enable).toBe('function');
      expect(typeof mockWindow.jitterbug.debug.disable).toBe('function');
      expect(typeof mockWindow.jitterbug.debug.isEnabled).toBe('function');
      expect(typeof mockWindow.jitterbug.debug.setLevel).toBe('function');
      expect(typeof mockWindow.jitterbug.debug.getLevel).toBe('function');
    });

    it('should include debug methods in help system', () => {
      const generalHelp = api.help();
      expect(generalHelp).toContain('Debug: debug.enable()');
      expect(generalHelp).toContain('debug.disable()');
      expect(generalHelp).toContain('debug.setLevel(n)');
      
      const debugEnableHelp = api.help('debug.enable');
      expect(debugEnableHelp).toContain('Enable debug event emission');
      expect(debugEnableHelp).toContain('debug.enable(by?: "api" | "config")');
    });

    it('should update diagnostics with debug state', () => {
      const diagnostics = api.diagnostics();
      expect(diagnostics.enabled).toBe(true); // Main API enabled
      
      // Debug state should be accessible through debug API
      const debugState = api.debug.getState();
      expect(debugState.enabled).toBe(true);
      expect(debugState.level).toBe(3);
    });
  });

  describe('State Isolation and Cleanup', () => {
    it('should maintain independent state between test runs', () => {
      api.debug.setLevel(DebugLevels.TRACE);
      api.debug.disable();
      
      expect(api.debug.getLevel()).toBe(DebugLevels.TRACE);
      expect(api.debug.isEnabled()).toBe(false);
    });

    it('should handle rapid state changes gracefully', () => {
      // Rapid enable/disable cycles
      for (let i = 0; i < 10; i++) {
        api.debug.disable();
        api.debug.enable();
      }
      
      expect(api.debug.isEnabled()).toBe(true);
      
      // Rapid level changes
      const levels = [0, 1, 2, 3, 4, 5];
      for (const level of levels) {
        api.debug.setLevel(level);
        expect(api.debug.getLevel()).toBe(level);
      }
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle concurrent state access correctly', () => {
      // Simulate concurrent access patterns
      const results: any[] = [];
      
      // Multiple enable calls
      results.push(api.debug.enable());
      results.push(api.debug.enable());
      results.push(api.debug.enable());
      
      expect(results.every(r => r.enabled === true)).toBe(true);
      expect(api.debug.isEnabled()).toBe(true);
    });

    it('should preserve state consistency during error conditions', () => {
      const initialState = api.debug.getState();
      
      // Invalid operations should not change state
      try {
        api.debug.setLevel(999);
      } catch {
        // Expected
      }
      
      const afterErrorState = api.debug.getState();
      expect(afterErrorState.enabled).toBe(initialState.enabled);
      expect(afterErrorState.level).toBe(initialState.level);
    });
  });

  describe('Forward Compatibility', () => {
    it('should provide hooks for persistence layer (Task 3.4)', async () => {
      // Test that config dirty hook can be set (simulating Task 3.4)
      let configDirtyCalled = false;
      
      // Access internal debug state module for hook testing
      const { setConfigDirtyHook } = await import('../debug-state.js');
      setConfigDirtyHook(() => {
        configDirtyCalled = true;
      });
      
      // Changes should trigger dirty hook
      api.debug.setLevel(DebugLevels.ERROR);
      expect(configDirtyCalled).toBe(true);
      
      configDirtyCalled = false;
      api.debug.disable();
      expect(configDirtyCalled).toBe(true);
    });

    it('should maintain version consistency in state object', () => {
      const state = api.debug.getState();
      expect(state.version).toBe(1);
      expect(typeof state.changedAt).toBe('string');
      expect(['system', 'api', 'config'].includes(state.changedBy)).toBe(true);
    });
  });
});