/**
 * Internal Log Types - Task 3.5
 * 
 * Internal-only types for log inspection implementation.
 * These types are NOT exported from the public API.
 */

import type { DebugLevel } from '../debug-state.js';

// String log levels for filtering
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'trace';

export interface InternalEntry {
  seq: number;
  ts: number;              // epoch ms
  type: string;            // event type
  level?: DebugLevel;      // if debug event
  branch?: string | null;
  payload?: unknown;
}

export interface PublicEntry {
  seq: number;
  ts: string;              // ISO string
  type: string;
  level?: string;
  branch?: string | null;
  payload?: unknown;       // only if capture enabled
  summary?: string;        // if payload omitted
}

export interface QueryOptions {
  sinceSeq?: number;
  limit?: number;          // default 100
  level?: DebugLevel | DebugLevel[];
  types?: string[];        // exact matches
  branch?: string;
  text?: string;           // substring search (case-insensitive)
}

export interface QueryResult {
  entries: PublicEntry[];
  nextSinceSeq: number;
  dropped: number;
  total: number;
}

export interface LogStats {
  size: number;            // configured buffer size
  used: number;
  dropped: number;
  firstSeq: number | null;
  lastSeq: number | null;
  levels: Record<string, number>;
  typesTop: Array<{ type: string; count: number }>;
}

export interface ExportOptions {
  // Future: streaming, compression, etc.
}

// Phase B: Export types
export type LogExportFormat = 'jsonl' | 'raw';

export interface LogExportOptions {
  format?: LogExportFormat;
  branches?: string[];
  levels?: LogLevel[];
  since?: number; // timestamp ms
  limit?: number; // cap number of entries
}

export type LogExportResult =
  | { kind: 'success'; format: LogExportFormat; data: string; total: number; returned: number; truncated: boolean }
  | { kind: 'empty'; reason: 'no_logs' | 'filtered_out' };