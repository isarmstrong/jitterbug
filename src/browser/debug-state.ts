/**
 * Debug State Management
 * 
 * Central state for debug level and enabled/disabled status.
 * Designed for integration with persistence layer (Task 3.4).
 */

/** @internal */
export type DebugLevel = 0 | 1 | 2 | 3 | 4 | 5;

/** @internal - Use experimentalDebug.levels instead */
export const DebugLevels = {
  OFF: 0,
  ERROR: 1,
  WARN: 2,
  INFO: 3,
  DEBUG: 4,
  TRACE: 5
} as const;

interface DebugState {
  enabled: boolean;
  level: DebugLevel;
  changedAt: string;   // ISO timestamp
  changedBy: 'system' | 'api' | 'config';
  version: 1;
}

const state: DebugState = {
  enabled: true,
  level: DebugLevels.INFO,
  changedAt: new Date().toISOString(),
  changedBy: 'system',
  version: 1
};

// Persistence hook placeholder for Task 3.4
let onConfigDirty: (() => void) | undefined;

/** @internal - For Task 3.4 persistence only */
export function setConfigDirtyHook(fn: () => void): void {
  onConfigDirty = fn;
}

function markConfigDirty(): void {
  onConfigDirty?.();
}

/** @internal */
export function getDebugState(): Readonly<DebugState> {
  return state;
}

/** @internal */
export function updateDebugEnabled(next: boolean, by: DebugState['changedBy']): { changed: boolean; prev: boolean; } {
  if (state.enabled === next) return { changed: false, prev: state.enabled };
  
  const prev = state.enabled;
  state.enabled = next;
  state.changedAt = new Date().toISOString();
  state.changedBy = by;
  
  markConfigDirty();
  return { changed: true, prev };
}

/** @internal */
export function updateDebugLevel(next: DebugLevel, by: DebugState['changedBy']): { changed: boolean; prev: DebugLevel } {
  if (state.level === next) return { changed: false, prev: state.level };
  
  const prev = state.level;
  state.level = next;
  state.changedAt = new Date().toISOString();
  state.changedBy = by;
  
  markConfigDirty();
  return { changed: true, prev };
}

/** @internal */
export function validateLevel(raw: unknown): raw is DebugLevel {
  return typeof raw === 'number' && raw >= 0 && raw <= 5 && Number.isInteger(raw);
}

/**
 * Reset debug state to defaults (testing only)
 * @internal
 */
/** @internal - Testing only */
export function __resetDebugState(): void {
  state.enabled = true;
  state.level = DebugLevels.INFO;
  state.changedAt = new Date().toISOString();
  state.changedBy = 'system';
}