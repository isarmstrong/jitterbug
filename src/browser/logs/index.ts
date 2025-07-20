/**
 * Log Inspector - Task 3.5
 * 
 * Bounded ring buffer for log/event inspection and export.
 * Implementation follows Strategy A pattern: thin facade + internal implementation.
 */

import type { QueryOptions, QueryResult, LogStats, LogExportOptions, LogExportResult, LogLevel } from './types.internal.js';
import { queryLogs, getLogStats, clearLogs } from './internal/attach.js';

/**
 * Log inspection and export utilities
 * @experimental Subject to change without SemVer guarantees
 */
export const logInspector = {
  query(options?: QueryOptions): QueryResult {
    // TODO: Implement filtering in Task 3.5
    const result = queryLogs(options?.sinceSeq);
    
    // Convert to public format
    const entries = result.entries.map(entry => ({
      seq: entry.seq,
      ts: new Date(entry.ts).toISOString(),
      type: entry.type,
      level: entry.level,
      branch: entry.branch,
      payload: entry.payload
    }));
    
    return {
      entries,
      nextSinceSeq: result.nextSeq,
      dropped: result.dropped,
      total: result.stats.size
    };
  },

  stats(): LogStats {
    const stats = getLogStats();
    return {
      size: stats.capacity,
      used: stats.size,
      dropped: stats.dropped,
      firstSeq: stats.firstSeq,
      lastSeq: stats.lastSeq,
      levels: {}, // TODO: Implement level counting
      typesTop: [] // TODO: Implement type frequency
    };
  },

  export(options?: LogExportOptions): LogExportResult {
    const result = queryLogs();
    let entries = result.entries;
    
    // Apply filters
    if (options?.branches) {
      entries = entries.filter(e => 
        options.branches!.includes(e.branch || 'main')
      );
    }
    
    if (options?.levels) {
      entries = entries.filter(e => 
        options.levels!.includes(e.level as LogLevel)
      );
    }
    
    if (options?.since) {
      entries = entries.filter(e => e.ts >= options.since!);
    }
    
    if (options?.limit) {
      entries = entries.slice(-options.limit);
    }
    
    // Check if empty after filtering
    if (entries.length === 0) {
      return {
        kind: 'empty',
        reason: result.entries.length === 0 ? 'no_logs' : 'filtered_out'
      };
    }
    
    const format = options?.format || 'jsonl';
    const total = result.entries.length;
    const returned = entries.length;
    const truncated = options?.limit ? total > options.limit : false;
    
    let data: string;
    switch (format) {
      case 'jsonl':
        data = entries.map(entry => JSON.stringify({
          seq: entry.seq,
          ts: entry.ts,
          type: entry.type,
          level: entry.level,
          branch: entry.branch,
          payload: entry.payload
        })).join('\n');
        break;
        
      case 'raw':
        data = entries.map(entry => {
          const timestamp = new Date(entry.ts).toISOString();
          const level = entry.level ? `[${entry.level.toUpperCase()}]` : '';
          const branch = entry.branch ? `@${entry.branch}` : '';
          return `${timestamp} ${level} ${entry.type}${branch}${entry.payload ? ' ' + JSON.stringify(entry.payload) : ''}`;
        }).join('\n');
        break;
        
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
    
    return {
      kind: 'success',
      format,
      data,
      total,
      returned,
      truncated
    };
  },

  clear(options?: { preserveLast?: number }): void {
    clearLogs(options?.preserveLast);
  }
};