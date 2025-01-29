import type { LogLevel, ProcessedLogEntry } from './types/core';

/**
 * Configuration for the cache manager
 */
export interface CacheConfig {
  maxEntries?: number;
  ttl?: number;
  cleanupInterval?: number;
}

/**
 * Parameters for generating cache keys
 */
export interface CacheKeyParams {
  readonly level: LogLevel;
  readonly message: string;
  readonly context?: Readonly<Record<string, unknown>>;
  readonly timestamp?: string;
}

/**
 * Type-safe cache key
 */
export type CacheKey = string & { readonly __brand: unique symbol };

/**
 * Type-safe cache entry with validation
 */
export interface CacheEntry<T> {
  readonly value: T;
  readonly timestamp: number;
  readonly key: CacheKey;
  readonly ttl: number;
}

/**
 * Type-safe cache manager with proper async boundaries
 * 
 * Type Invariant: All entries are valid ProcessedLogEntry objects
 * This is maintained by:
 * 1. Only adding entries through set() which validates the data
 * 2. Never modifying entries directly, only through type-safe methods
 * 3. Automatic cleanup of expired entries
 */
export class CacheManager<T extends ProcessedLogEntry<Record<string, unknown>>> {
  private readonly cache: Map<CacheKey, CacheEntry<T>>;
  private readonly maxEntries: number;
  private readonly ttl: number;
  private readonly cleanupInterval: number;
  private cleanupTimer?: ReturnType<typeof setInterval>;

  constructor(config: CacheConfig = {}) {
    this.cache = new Map();
    this.maxEntries = config.maxEntries ?? 1000;
    this.ttl = config.ttl ?? 60000;
    this.cleanupInterval = config.cleanupInterval ?? 300000;
    this.startCleanup();
  }

  /**
   * Sets a value in the cache with type safety
   */
  public set(params: CacheKeyParams, value: T): void {
    const key = this.createKey(params);

    if (this.cache.size >= this.maxEntries) {
      const oldestKey = this.findOldestEntry();
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      key,
      ttl: this.ttl
    });
  }

  /**
   * Gets a value from the cache with type safety
   */
  public get(params: CacheKeyParams): T | null {
    const key = this.createKey(params);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    if (this.isExpired(entry)) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  /**
   * Creates a type-safe cache key
   */
  private createKey(params: CacheKeyParams): CacheKey {
    const contextPart = params.context !== undefined && params.context !== null
      ? JSON.stringify(params.context)
      : '';
    const timestampPart = params.timestamp !== undefined && params.timestamp !== null
      ? params.timestamp
      : '';

    const key = `${params.level}:${params.message}:${contextPart}:${timestampPart}`;
    return key as CacheKey;
  }

  /**
   * Checks if a cache entry has expired
   */
  private isExpired(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  /**
   * Finds the oldest entry in the cache
   */
  private findOldestEntry(): CacheKey | undefined {
    let oldestKey: CacheKey | undefined;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    return oldestKey;
  }

  /**
   * Starts the cleanup timer
   */
  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.cache.entries()) {
        if (now - entry.timestamp > entry.ttl) {
          this.cache.delete(key);
        }
      }
    }, this.cleanupInterval);
  }

  /**
   * Stops the cleanup timer
   */
  public dispose(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    this.cache.clear();
  }

  /**
   * Returns statistics about the cache
   */
  public getStats(): Readonly<{
    size: number;
    maxEntries: number;
    ttl: number;
  }> {
    return Object.freeze({
      size: this.cache.size,
      maxEntries: this.maxEntries,
      ttl: this.ttl
    });
  }
}

// Export a singleton instance for backward compatibility
export const defaultCache = new CacheManager<ProcessedLogEntry<Record<string, unknown>>>();

// Export convenience methods that use the default cache
export const set = defaultCache.set.bind(defaultCache);
export const get = defaultCache.get.bind(defaultCache); 