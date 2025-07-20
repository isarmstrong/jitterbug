/**
 * Public Log Inspector - Task 3.5 Phase 1
 * 
 * Experimental log inspection facade with query-only capabilities.
 * Adapter between internal ring buffer and public interface.
 */

import { queryLogs } from './logs/internal/attach.js';

const coerceLimit = (n?: number): number | undefined =>
  !n ? undefined : Math.min(Math.max(n, 1), 5000);

export const logInspector = {
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
  }
};