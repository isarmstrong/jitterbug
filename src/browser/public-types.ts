/**
 * Public Type Facades - Task 3.4/3.5 Surface Control
 * 
 * Clean public interfaces that shield internal implementation details.
 * These types are referenced in public API signatures to prevent type leakage.
 */

import type { DebugLevel } from './debug-state.js';

/**
 * Public configuration shape returned by saveConfig/loadConfig operations.
 * 
 * @experimental Subject to schema evolution
 */
export interface DebugConfigPublic {
  /** Configuration format version */
  version: 1;
  
  /** Last update timestamp (ISO string) */
  updatedAt: string;
  
  /** Debug system settings */
  debug: {
    /** Whether debug emission is enabled */
    enabled: boolean;
    /** Current debug level (0-5) */
    level: DebugLevel;
  };
  
  /** Branch management state */
  branches: {
    /** Currently active branch name (null = main) */
    active: string | null;
  };
  
  /** Log system configuration (forward-compatible) */
  logs?: {
    /** Ring buffer capacity */
    bufferSize?: number;
  };
}

/**
 * Result of configuration load operations.
 * 
 * @experimental Subject to API changes
 */
export interface ConfigLoadResult {
  /** Load operation outcome */
  status: 'loaded' | 'defaulted' | 'migrated' | 'invalid';
  /** Resulting configuration */
  config: DebugConfigPublic;
  /** Migration flag (if config was auto-migrated) */
  migrated?: boolean;
  /** Validation errors (if status === 'invalid') */
  errors?: string[];
}

/**
 * Result of configuration save operations.
 * 
 * @experimental Subject to API changes  
 */
export interface ConfigSaveResult {
  /** Save operation success */
  ok: boolean;
  /** Bytes written to storage (if successful) */
  bytes?: number;
  /** Error message (if failed) */
  error?: string;
  /** Whether save was skipped (no changes) */
  skipped?: boolean;
}

/**
 * Log inspector capabilities discovery.
 * 
 * @experimental API under development
 */
export interface LogInspectorCapabilities {
  /** Supported filter keys */
  filters: Array<'branch' | 'level' | 'time' | 'text' | 'type'>;
  /** Supported export formats (future) */
  exports?: Array<'json' | 'ndjson' | 'csv'>;
  /** Maximum query limit */
  maxLimit: number;
  /** Ring buffer capacity */
  bufferCapacity: number;
}