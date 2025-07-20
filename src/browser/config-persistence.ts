/**
 * Configuration Persistence - Task 3.4
 * 
 * Persistent debugger configuration across page reloads with:
 * - Deterministic schema versioning
 * - Integrity validation & fallback  
 * - Minimal write amplification
 * - Forward-compatible for Task 3.5 log buffer settings
 */

import { getDebugState, DebugLevels, type DebugLevel } from './debug-state.js';
import { experimentalBranches } from './branch-manager.js';
import { safeEmit } from './schema-registry.js';

type BranchName = string;
type ISODateString = string;

/** @internal */
export interface DebugConfigV1 {
  version: 1;
  updatedAt: ISODateString;
  debug: {
    enabled: boolean;
    level: DebugLevel;
  };
  branches: {
    active: BranchName | null;
  };
  logs?: {
    bufferSize?: number; // Forward-compatible for Task 3.5
  };
}

/** @internal */
export interface ConfigLoadResult {
  status: 'loaded' | 'defaulted' | 'migrated' | 'invalid';
  config: DebugConfigV1;
  migrated?: boolean;
  errors?: string[];
}

// Storage configuration
const CONFIG_KEY = '__jitterbug_config_v1';
const META_KEY = '__jitterbug_config_meta'; // Reserved for future migrations
const PERSIST_DEBOUNCE = 250; // ms
const MIN_BUFFER_SIZE = 100;
const MAX_BUFFER_SIZE = 10000;
const DEFAULT_BUFFER_SIZE = 1000;

// Default configuration
const DEFAULT_CONFIG: DebugConfigV1 = {
  version: 1,
  updatedAt: new Date().toISOString(),
  debug: { 
    enabled: true, 
    level: DebugLevels.INFO 
  },
  branches: { 
    active: null 
  },
  logs: { 
    bufferSize: DEFAULT_BUFFER_SIZE 
  },
};

// Debounced persistence state
let dirty = false;
let timer: any = null;
let flushInProgress = false;

/**
 * Validate configuration object against schema
 * @internal
 */
export function validateConfig(obj: unknown): { ok: true; value: DebugConfigV1 } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  
  if (!obj || typeof obj !== 'object') {
    errors.push('Config must be an object');
    return { ok: false, errors };
  }
  
  const config = obj as any;
  
  // Version check
  if (config.version !== 1) {
    errors.push(`Unknown config version: ${config.version}. Expected 1.`);
    return { ok: false, errors };
  }
  
  // updatedAt check
  if (typeof config.updatedAt !== 'string') {
    errors.push('updatedAt must be an ISO string');
  }
  
  // Debug section validation
  if (!config.debug || typeof config.debug !== 'object') {
    errors.push('debug section missing or invalid');
  } else {
    if (typeof config.debug.enabled !== 'boolean') {
      errors.push('debug.enabled must be boolean');
    }
    if (typeof config.debug.level !== 'number' || 
        config.debug.level < 0 || config.debug.level > 5 || 
        !Number.isInteger(config.debug.level)) {
      errors.push('debug.level must be integer 0-5');
    }
  }
  
  // Branches section validation
  if (!config.branches || typeof config.branches !== 'object') {
    errors.push('branches section missing or invalid');
  } else {
    if (config.branches.active !== null && typeof config.branches.active !== 'string') {
      errors.push('branches.active must be string or null');
    }
  }
  
  // Logs section validation (optional)
  if (config.logs !== undefined) {
    if (typeof config.logs !== 'object') {
      errors.push('logs section must be object if present');
    } else if (config.logs.bufferSize !== undefined) {
      if (typeof config.logs.bufferSize !== 'number' || 
          config.logs.bufferSize < MIN_BUFFER_SIZE || 
          config.logs.bufferSize > MAX_BUFFER_SIZE ||
          !Number.isInteger(config.logs.bufferSize)) {
        errors.push(`logs.bufferSize must be integer ${MIN_BUFFER_SIZE}-${MAX_BUFFER_SIZE}`);
      }
    }
  }
  
  return errors.length > 0 
    ? { ok: false, errors }
    : { ok: true, value: config as DebugConfigV1 };
}

/**
 * Create snapshot of current configuration state
 * @internal
 */
function currentConfigSnapshot(): DebugConfigV1 {
  const debugState = getDebugState();
  
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    debug: {
      enabled: debugState.enabled,
      level: debugState.level,
    },
    branches: { 
      active: experimentalBranches.getActive() 
    },
    logs: { 
      bufferSize: DEFAULT_BUFFER_SIZE // Stub for Task 3.5
    },
  };
}

/**
 * Mark configuration as dirty and schedule persistent save
 * @internal
 */
export function markDirty(reason: string): void {
  if (flushInProgress) return; // Prevent save loops
  
  dirty = true;
  if (!timer) {
    safeEmit('orchestrator.config.persist.scheduled' as any, { 
      debounceMs: PERSIST_DEBOUNCE,
      reason 
    });
    timer = setTimeout(() => flush(), PERSIST_DEBOUNCE);
  }
}

/**
 * Flush configuration to localStorage
 * @internal
 */
export async function flush(force = false): Promise<{ ok: boolean; bytes?: number; error?: string; skipped?: boolean }> {
  if (!dirty && !force) {
    return { ok: true, skipped: true };
  }
  
  if (flushInProgress) {
    return { ok: false, error: 'Flush already in progress' };
  }
  
  flushInProgress = true;
  const start = performance.now();
  
  try {
    const payload = currentConfigSnapshot();
    const json = JSON.stringify(payload);
    
    // Feature detect localStorage
    if (typeof localStorage === 'undefined') {
      safeEmit('orchestrator.config.persist.failed' as any, { 
        reason: 'localStorage unavailable' 
      });
      return { ok: false, error: 'localStorage unavailable' };
    }
    
    localStorage.setItem(CONFIG_KEY, json);
    dirty = false;
    
    const durationMs = Math.round(performance.now() - start);
    safeEmit('orchestrator.config.persist.completed' as any, {
      bytes: json.length,
      durationMs,
    });
    
    return { ok: true, bytes: json.length };
    
  } catch (e) {
    const error = (e as Error).message;
    safeEmit('orchestrator.config.persist.failed' as any, { reason: error });
    return { ok: false, error };
    
  } finally {
    flushInProgress = false;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  }
}

/**
 * Load configuration from localStorage with validation
 * @internal
 */
export function loadConfig(): ConfigLoadResult {
  const start = performance.now();
  
  safeEmit('orchestrator.config.load.started' as any, { 
    source: 'storage' 
  });
  
  try {
    // Feature detect localStorage
    if (typeof localStorage === 'undefined') {
      const result: ConfigLoadResult = {
        status: 'defaulted',
        config: { ...DEFAULT_CONFIG },
        errors: ['localStorage unavailable']
      };
      
      safeEmit('orchestrator.config.load.failed' as any, { 
        reason: 'localStorage unavailable',
        durationMs: Math.round(performance.now() - start)
      });
      
      return result;
    }
    
    const stored = localStorage.getItem(CONFIG_KEY);
    
    if (!stored) {
      // No config found - use defaults
      const result: ConfigLoadResult = {
        status: 'defaulted',
        config: { ...DEFAULT_CONFIG }
      };
      
      safeEmit('orchestrator.config.load.completed' as any, {
        source: 'default',
        migrated: false,
        durationMs: Math.round(performance.now() - start)
      });
      
      return result;
    }
    
    // Parse and validate stored config
    let parsed: unknown;
    try {
      parsed = JSON.parse(stored);
    } catch (parseError) {
      const result: ConfigLoadResult = {
        status: 'invalid',
        config: { ...DEFAULT_CONFIG },
        errors: ['Invalid JSON format']
      };
      
      safeEmit('orchestrator.config.load.failed' as any, { 
        reason: 'Invalid JSON format',
        durationMs: Math.round(performance.now() - start)
      });
      
      return result;
    }
    
    const validation = validateConfig(parsed);
    
    if (!validation.ok) {
      const result: ConfigLoadResult = {
        status: 'invalid',
        config: { ...DEFAULT_CONFIG },
        errors: validation.errors
      };
      
      safeEmit('orchestrator.config.load.failed' as any, { 
        reason: `Validation failed: ${validation.errors.join(', ')}`,
        durationMs: Math.round(performance.now() - start)
      });
      
      return result;
    }
    
    // Successfully loaded and validated
    const result: ConfigLoadResult = {
      status: 'loaded',
      config: validation.value
    };
    
    safeEmit('orchestrator.config.load.completed' as any, {
      source: 'storage',
      migrated: false,
      durationMs: Math.round(performance.now() - start)
    });
    
    return result;
    
  } catch (error) {
    const result: ConfigLoadResult = {
      status: 'invalid',
      config: { ...DEFAULT_CONFIG },
      errors: [(error as Error).message]
    };
    
    safeEmit('orchestrator.config.load.failed' as any, { 
      reason: (error as Error).message,
      durationMs: Math.round(performance.now() - start)
    });
    
    return result;
  }
}

/**
 * Reset configuration to defaults and clear storage
 * @internal
 */
export function resetConfig(): ConfigLoadResult {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(CONFIG_KEY);
      localStorage.removeItem(META_KEY); // Clean up meta key if present
    }
    
    const result: ConfigLoadResult = {
      status: 'defaulted',
      config: { ...DEFAULT_CONFIG }
    };
    
    safeEmit('orchestrator.config.reset' as any, { 
      previousVersion: 1,
      newVersion: 1,
      timestamp: new Date().toISOString()
    });
    
    // Force immediate save of defaults
    markDirty('reset');
    flush(true);
    
    return result;
    
  } catch (error) {
    const result: ConfigLoadResult = {
      status: 'invalid',
      config: { ...DEFAULT_CONFIG },
      errors: [(error as Error).message]
    };
    
    return result;
  }
}

/**
 * Public API for configuration persistence
 * @experimental
 */
export const configPersistence = {
  /**
   * Force immediate save of current configuration
   * @experimental
   */
  save: () => flush(true),
  
  /**
   * Load configuration from storage (idempotent)
   * @experimental  
   */
  load: loadConfig,
  
  /**
   * Reset to defaults and clear storage
   * @experimental
   */
  reset: resetConfig,
  
  /**
   * Get current configuration snapshot without saving
   * @experimental
   */
  snapshot: currentConfigSnapshot
};