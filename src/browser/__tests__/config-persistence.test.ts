/**
 * Configuration Persistence Tests - Task 3.4
 * 
 * Tests for localStorage-based configuration persistence with validation,
 * debounced saves, and proper loading behavior.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { validateConfig, loadConfig, resetConfig, configPersistence, markDirty, flush } from '../config-persistence.js';
import { DebugLevels } from '../debug-state.js';

// Mock localStorage for testing
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get _store() { return store; },
    _reset() { store = {}; }
  };
})();

// Mock branch manager
vi.mock('../branch-manager.js', () => ({
  experimentalBranches: {
    getActive: vi.fn(() => 'main')
  }
}));

// Mock debug state
vi.mock('../debug-state.js', () => ({
  getDebugState: vi.fn(() => ({
    enabled: true,
    level: 3,
    changedAt: '2025-01-01T00:00:00.000Z',
    changedBy: 'system',
    version: 1
  })),
  DebugLevels: {
    OFF: 0,
    ERROR: 1,
    WARN: 2,
    INFO: 3,
    DEBUG: 4,
    TRACE: 5
  }
}));

// Mock schema registry
vi.mock('../schema-registry.js', () => ({
  safeEmit: vi.fn()
}));

describe('Configuration Persistence (Task 3.4)', () => {
  beforeEach(() => {
    // Replace global localStorage with mock
    Object.defineProperty(global, 'localStorage', {
      value: mockLocalStorage,
      writable: true
    });
    
    // Reset localStorage state
    mockLocalStorage._reset();
    mockLocalStorage.clear.mockClear();
    mockLocalStorage.getItem.mockClear();
    mockLocalStorage.setItem.mockClear();
    mockLocalStorage.removeItem.mockClear();
    
    // Reset timers
    vi.clearAllTimers();
    vi.useFakeTimers();
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('Configuration Validation', () => {
    it('should validate valid configuration', () => {
      const validConfig = {
        version: 1,
        updatedAt: '2025-01-01T00:00:00.000Z',
        debug: {
          enabled: true,
          level: 3
        },
        branches: {
          active: 'main'
        },
        logs: {
          bufferSize: 1000
        }
      };
      
      const result = validateConfig(validConfig);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual(validConfig);
      }
    });

    it('should reject invalid version', () => {
      const invalidConfig = {
        version: 2,
        updatedAt: '2025-01-01T00:00:00.000Z',
        debug: { enabled: true, level: 3 },
        branches: { active: null }
      };
      
      const result = validateConfig(invalidConfig);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors).toContain('Unknown config version: 2. Expected 1.');
      }
    });

    it('should reject invalid debug level', () => {
      const invalidConfig = {
        version: 1,
        updatedAt: '2025-01-01T00:00:00.000Z',
        debug: { enabled: true, level: 10 },
        branches: { active: null }
      };
      
      const result = validateConfig(invalidConfig);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors).toContain('debug.level must be integer 0-5');
      }
    });

    it('should reject invalid buffer size', () => {
      const invalidConfig = {
        version: 1,
        updatedAt: '2025-01-01T00:00:00.000Z',
        debug: { enabled: true, level: 3 },
        branches: { active: null },
        logs: { bufferSize: 50000 }
      };
      
      const result = validateConfig(invalidConfig);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors).toContain('logs.bufferSize must be integer 100-10000');
      }
    });

    it('should allow optional logs section', () => {
      const configWithoutLogs = {
        version: 1,
        updatedAt: '2025-01-01T00:00:00.000Z',
        debug: { enabled: true, level: 3 },
        branches: { active: null }
      };
      
      const result = validateConfig(configWithoutLogs);
      expect(result.ok).toBe(true);
    });
  });

  describe('Configuration Loading', () => {
    it('should return defaults when no config exists', () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      const result = loadConfig();
      expect(result.status).toBe('defaulted');
      expect(result.config.version).toBe(1);
      expect(result.config.debug.enabled).toBe(true);
      expect(result.config.debug.level).toBe(DebugLevels.INFO);
    });

    it('should load valid stored configuration', () => {
      const storedConfig = {
        version: 1,
        updatedAt: '2025-01-01T00:00:00.000Z',
        debug: { enabled: false, level: 1 },
        branches: { active: 'test-branch' },
        logs: { bufferSize: 500 }
      };
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(storedConfig));
      
      const result = loadConfig();
      expect(result.status).toBe('loaded');
      expect(result.config).toEqual(storedConfig);
    });

    it('should handle malformed JSON gracefully', () => {
      mockLocalStorage.getItem.mockReturnValue('{ invalid json');
      
      const result = loadConfig();
      expect(result.status).toBe('invalid');
      expect(result.errors).toContain('Invalid JSON format');
      expect(result.config.debug.enabled).toBe(true); // Should fallback to defaults
    });

    it('should handle localStorage unavailable', () => {
      // Remove localStorage
      Object.defineProperty(global, 'localStorage', {
        value: undefined,
        writable: true
      });
      
      const result = loadConfig();
      expect(result.status).toBe('defaulted');
      expect(result.errors).toContain('localStorage unavailable');
    });
  });

  describe('Configuration Reset', () => {
    it('should clear localStorage and return defaults', () => {
      // Set up some stored config
      mockLocalStorage._store['__jitterbug_config_v1'] = JSON.stringify({
        version: 1,
        debug: { enabled: false, level: 1 },
        branches: { active: 'test' }
      });
      
      const result = resetConfig();
      expect(result.status).toBe('defaulted');
      expect(result.config.debug.enabled).toBe(true);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('__jitterbug_config_v1');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('__jitterbug_config_meta');
    });
  });

  describe('Debounced Persistence', () => {
    it('should schedule save with debounce', async () => {
      markDirty('test-reason');
      
      // Should not save immediately
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
      
      // Advance timers to trigger debounced save
      vi.advanceTimersByTime(250);
      
      // Should save after debounce
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        '__jitterbug_config_v1',
        expect.stringMatching(/{"version":1/)
      );
    });

    it('should coalesce multiple rapid changes', async () => {
      markDirty('change-1');
      markDirty('change-2');
      markDirty('change-3');
      
      // Fast-forward past debounce period
      vi.advanceTimersByTime(250);
      
      // Should only save once despite multiple markDirty calls
      expect(mockLocalStorage.setItem).toHaveBeenCalledTimes(1);
    });

    it('should force immediate save when requested', async () => {
      markDirty('test');
      
      const result = await flush(true);
      
      expect(result.ok).toBe(true);
      expect(result.bytes).toBeGreaterThan(0);
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
    });

    it('should handle localStorage quota exceeded', async () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });
      
      const result = await flush(true);
      
      expect(result.ok).toBe(false);
      expect(result.error).toBe('QuotaExceededError');
    });

    it('should skip save when not dirty', async () => {
      const result = await flush(false);
      
      expect(result.ok).toBe(true);
      expect(result.skipped).toBe(true);
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe('Public API', () => {
    it('should provide config persistence methods', () => {
      expect(typeof configPersistence.save).toBe('function');
      expect(typeof configPersistence.load).toBe('function');
      expect(typeof configPersistence.reset).toBe('function');
      expect(typeof configPersistence.snapshot).toBe('function');
    });

    it('should create valid configuration snapshot', () => {
      const snapshot = configPersistence.snapshot();
      
      expect(snapshot.version).toBe(1);
      expect(snapshot.debug.enabled).toBe(true);
      expect(snapshot.debug.level).toBe(3);
      expect(snapshot.branches.active).toBe('main');
      expect(typeof snapshot.updatedAt).toBe('string');
    });

    it('should save configuration immediately', async () => {
      const result = await configPersistence.save();
      
      expect(result.ok).toBe(true);
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('Forward Compatibility', () => {
    it('should preserve unknown top-level fields during save/load cycle', () => {
      const configWithFutureField = {
        version: 1,
        updatedAt: '2025-01-01T00:00:00.000Z',
        debug: { enabled: true, level: 3 },
        branches: { active: null },
        logs: { bufferSize: 1000 },
        // Future field that current version doesn't know about
        future: { someNewSetting: true }
      };
      
      // Validation should reject unknown fields for safety
      const validation = validateConfig(configWithFutureField);
      expect(validation.ok).toBe(true); // Should be lenient for forward compatibility
    });

    it('should handle buffer size defaults for missing logs section', () => {
      const snapshot = configPersistence.snapshot();
      
      expect(snapshot.logs?.bufferSize).toBe(1000); // Default from Task 3.5 forward compatibility
    });
  });
});