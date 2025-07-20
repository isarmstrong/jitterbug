/**
 * Public Log Inspector - Task 3.5 Phase 1
 * 
 * Experimental log inspection facade with query-only capabilities.
 * Adapter between internal ring buffer and public interface.
 */

import { queryLogs } from './logs/internal/attach.js';
import { logInspector as internalLogInspector } from './logs/index.js';

const coerceLimit = (n?: number): number | undefined =>
  !n ? undefined : Math.min(Math.max(n, 1), 5000);

/**
 * @experimental Log inspection query interface
 * Subject to API changes during Task 3.5 development
 */
export const logInspector = {
  /** 
   * Query logs with optional filtering and pagination
   * @experimental 
   */
  query(opts: { sinceSeq?: number; limit?: number; level?: string; branch?: string } = {}) {
    const { sinceSeq, limit, branch, level } = opts;
    const raw = queryLogs(sinceSeq);
    let entries = raw.entries;

    // Apply filtering
    if (branch) {
      entries = entries.filter(e => e.branch === branch);
    }
    if (level) {
      entries = entries.filter(e => e.level === level);
    }

    // Apply limit after filtering
    if (limit) {
      entries = entries.slice(-coerceLimit(limit)!);
    }

    return {
      entries: entries.map(entry => ({
        seq: entry.seq,
        ts: entry.ts,
        type: entry.type,
        payload: entry.payload,
        branch: entry.branch,
        level: entry.level
      })),
      stats: {
        capacity: raw.stats.capacity,
        size: raw.stats.size,
        dropped: raw.stats.dropped,
        lastSeq: raw.stats.lastSeq
      },
      nextSeq: raw.nextSeq
    };
  },

  /**
   * Export logs with filtering and format options
   * @experimental Phase B - Log export functionality
   */
  export(options?: {
    format?: 'jsonl' | 'raw';
    branches?: string[];
    levels?: ('debug' | 'info' | 'warn' | 'error' | 'trace')[];
    since?: number; // timestamp ms
    limit?: number; // cap number of entries
  }) {
    return internalLogInspector.export(options);
  },

  /**
   * Get current log inspector capabilities
   * @experimental Forward-compatibility discovery
   */
  capabilities() {
    const raw = queryLogs();
    return {
      filters: ['branch', 'level', 'time', 'type'] as const,
      exports: ['jsonl', 'raw'] as const, // Phase B implemented
      maxLimit: 5000,
      bufferCapacity: raw.stats.capacity
    };
  }
};