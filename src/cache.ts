import type { LogEntry, LogLevel } from './types';

interface CacheKeyParams {
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  timestamp?: string;
}

interface CacheEntry<T> {
  value: T;
  timestamp: number;
  key: string;
}

// Declare the global property
declare global {
  interface GlobalThis {
    __JITTERBUG_CACHE__?: Map<string, CacheEntry<LogEntry<Record<string, unknown>>>>;
  }
}

// Create a typed alias for globalThis
const globalCache = globalThis as typeof globalThis & { __JITTERBUG_CACHE__?: Map<string, CacheEntry<LogEntry<Record<string, unknown>>>> };

// Initialize cache in global scope if it doesn't exist
if (!globalCache.__JITTERBUG_CACHE__) {
  const cache = new Map<string, CacheEntry<LogEntry<Record<string, unknown>>>>();
  globalCache.__JITTERBUG_CACHE__ = cache;
}

export async function set(keyParams: CacheKeyParams, value: LogEntry<Record<string, unknown>>): Promise<void> {
  const key = generateKey(keyParams);
  globalCache.__JITTERBUG_CACHE__!.set(key, {
    value,
    timestamp: Date.now(),
    key
  });
}

export async function get(keyParams: CacheKeyParams): Promise<LogEntry<Record<string, unknown>> | null> {
  const key = generateKey(keyParams);
  const entry = globalCache.__JITTERBUG_CACHE__!.get(key);
  return entry ? entry.value : null;
}

function generateKey(params: CacheKeyParams): string {
  return `${params.level}:${params.message}:${params.context ? JSON.stringify(params.context) : ''
    }:${params.timestamp || ''}`;
} 
