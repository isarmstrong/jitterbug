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
 * Unified result type for configuration load/save operations.
 * 
 * @experimental Subject to API changes
 */
export type ConfigIOResult =
  | {
      kind: 'load';
      status: 'loaded' | 'defaulted' | 'migrated' | 'invalid';
      config: DebugConfigPublic;
      migrated?: boolean;
      errors?: string[];
    }
  | {
      kind: 'save';
      status: 'saved' | 'skipped' | 'error';
      bytes?: number;
      error?: string;
    };

// LogInspectorCapabilities removed - use return type inference from logInspector.capabilities()