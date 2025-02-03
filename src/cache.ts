import type { LogLevel, ProcessedLogEntry } from './types';

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

// Extend globalThis with our cache type
declare global {
  var __JITTERBUG_CACHE__: Map<string, CacheEntry<ProcessedLogEntry<Record<string, unknown>>>>;
}

// Initialize cache in global scope if it doesn't exist
if (!globalThis.__JITTERBUG_CACHE__) {
  globalThis.__JITTERBUG_CACHE__ = new Map<string, CacheEntry<ProcessedLogEntry<Record<string, unknown>>>>();
}

export async function set(keyParams: CacheKeyParams, value: ProcessedLogEntry<Record<string, unknown>>): Promise<void> {
  const key = generateKey(keyParams);
  globalThis.__JITTERBUG_CACHE__.set(key, {
    value,
    timestamp: Date.now(),
    key
  });
}

export async function get(keyParams: CacheKeyParams): Promise<ProcessedLogEntry<Record<string, unknown>> | null> {
  const key = generateKey(keyParams);
  const entry = globalThis.__JITTERBUG_CACHE__.get(key);
  return entry ? entry.value : null;
}

function generateKey(params: CacheKeyParams): string {
  return `${params.level}:${params.message}:${params.context ? JSON.stringify(params.context) : ''
    }:${params.timestamp || ''}`;
} 
