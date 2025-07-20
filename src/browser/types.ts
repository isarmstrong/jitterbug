/**
 * Browser Console API Types
 * 
 * Core type definitions for the window.jitterbug interface
 */

export interface JitterbugEvent<
  T extends string = string,
  P extends Record<string, unknown> = Record<string, unknown>
> {
  id: string;                // ULID or nanoid; monotonic-ish order
  t: number;                 // epoch ms
  type: T;                   // orchestrator.<entity>.<verb>
  level?: 'debug' | 'info' | 'warn' | 'error';
  planHash?: string;
  branch?: string;           // logical debug branch (default: 'main')
  stepId?: string;
  payload: P;
  meta?: {
    source?: 'bootstrap' | 'runtime' | 'console';
    seq?: number;            // incremental sequence for strict ordering
  };
}

export interface EmitOptions {
  level?: JitterbugEvent['level'];
  branch?: string;
  planHash?: string;
  stepId?: string;
  meta?: Partial<JitterbugEvent['meta']>;
}

export interface EventFilter {
  limit?: number;
  level?: JitterbugEvent['level'];
  typePrefix?: string;
  branch?: string;
}

export interface JitterbugDiagnostics {
  enabled: boolean;
  ready: boolean;
  eventCount: number;
  bootstrapCount: number;
  subscribers: number;
  bufferSize: number;
  branches: string[];
}

export interface JitterbugGlobal {
  version: string;
  /** Returns true if core orchestrator debugging is enabled (not just API attached). */
  isEnabled(): boolean;
  enable(): void;
  disable(): void;

  /** Emit a user / console generated event (validated & normalized). */
  emit<T extends string, P extends Record<string, unknown>>(type: T, payload?: P, opts?: EmitOptions): string;

  /** Get recent events (bounded ring buffer). */
  getEvents(opts?: EventFilter): readonly JitterbugEvent[];

  /** Subscribe to live events. Returns unsubscribe fn. */
  subscribe(listener: (e: JitterbugEvent) => void, filter?: EventFilter): () => void;

  /** Introspect the core help / commands list. */
  help(topic?: string): string;

  /** Marks system 'ready' (flushes bootstrap queue). Called by main app once orchestrator modules loaded. */
  ready(): void;

  /** Internal diagnostics snapshot (clone, read-only). */
  diagnostics(): JitterbugDiagnostics;

  /** Branch management methods @experimental */
  createBranch(name: string, options?: any): any;
  getBranches(): any[];
  listActiveBranches(): any[];
  getBranch(name: string): any;
  setActiveBranch(name: string): void;
  getActiveBranch(): string;
  enableBranch(name: string): void;
  disableBranch(name: string): void;
  deleteBranch(name: string): boolean;

  /** Debug control methods @experimental */
  debug: {
    enable(by?: 'api' | 'config'): any;
    disable(by?: 'api' | 'config'): any;
    isEnabled(): boolean;
    setLevel(level: unknown, by?: 'api' | 'config'): any;
    getLevel(): number;
    levels: Record<string, number>;
    getState(): any;
    /** Configuration persistence @experimental */
    config?: {
      save(): Promise<any>;
      load(): any;
      reset(): any;
      snapshot(): any;
    };
  };

  /** (Future) Config methods reserved; show stubs in help for discoverability. */
  saveConfig?(): void;
  loadConfig?(): void;
  resetConfig?(): void;

  /** Symbol: internal (not enumerable) to guard private state (optional). */
  [INTERNAL]?: never;
}

export interface HelpEntry {
  name: string;
  summary: string;
  signature: string;
  since: string;
  example?: string;
  category: 'core' | 'events' | 'config' | 'branch' | 'logs' | 'debug';
}

// Internal symbol for state encapsulation
export const INTERNAL = Symbol('jitterbug.internal');

// Global type augmentation
declare global {
  interface Window {
    jitterbug?: JitterbugGlobal;
  }
}