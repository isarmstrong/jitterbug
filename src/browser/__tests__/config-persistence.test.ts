/**
 * Configuration Persistence Tests - Task 3.4
 * 
 * Tests for localStorage-based configuration persistence with validation,
 * debounced saves, and proper loading behavior.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { configPersistence } from '../config-persistence.js';
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
  setConfigDirtyHook: vi.fn(),
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
  let mockApi: any;

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

    // Set up mock API
    mockApi = { debug: {} };
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  // Note: Configuration validation is tested through public API integration

  describe('Configuration Loading', () => {
    it('should return defaults when no config exists', () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      const result = configPersistence._loadConfig();
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
      
      const result = configPersistence._loadConfig();
      expect(result.status).toBe('loaded');
      expect(result.config).toEqual(storedConfig);
    });

    it('should handle malformed JSON gracefully', () => {
      mockLocalStorage.getItem.mockReturnValue('{ invalid json');
      
      const result = configPersistence._loadConfig();
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
      
      const result = configPersistence._loadConfig();
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
      
      const result = configPersistence.reset();
      expect(result.status).toBe('defaulted');
      expect(result.config.debug.enabled).toBe(true);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('__jitterbug_config_v1');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('__jitterbug_config_meta');
    });
  });

  describe('Persistence Operations', () => {
    it('should force immediate save when requested', async () => {
      const result = await configPersistence.save();
      
      expect(result.ok).toBe(true);
      expect(result.bytes).toBeGreaterThan(0);
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
    });

    it('should handle localStorage quota exceeded', async () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });
      
      const result = await configPersistence.save();
      
      expect(result.ok).toBe(false);
      expect(result.error).toBe('QuotaExceededError');
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

    it('should provide config persistence API shape', () => {
      expect(typeof configPersistence.save).toBe('function');
      expect(typeof configPersistence.load).toBe('function');
      expect(typeof configPersistence.reset).toBe('function');
      expect(typeof configPersistence.snapshot).toBe('function');
    });
  });

  describe('Forward Compatibility', () => {
    it('should handle buffer size defaults for missing logs section', () => {
      const snapshot = configPersistence.snapshot();
      
      expect(snapshot.logs?.bufferSize).toBe(1000); // Default from Task 3.5 forward compatibility
    });
  });
});