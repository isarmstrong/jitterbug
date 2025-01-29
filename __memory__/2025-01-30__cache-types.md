# Cache System Type Safety Improvements

## Current Issues

### 1. Global State Management
```typescript
// Current: Unsafe global state
var __JITTERBUG_CACHE__: Map<string, CacheEntry<...>>;

// Issues:
// - Uses var instead of const/let
// - Global state mutation
// - No type safety on initialization
```

### 2. False Async Boundaries
```typescript
// Current: Async without await
async function set(...): Promise<void> {
    // No async operations
}

async function get(...): Promise<...> {
    // No async operations
}
```

### 3. Type Safety Gaps
```typescript
// Unsafe type assertions
Record<string, unknown>  // Too permissive

// Missing discriminated unions
interface CacheEntry<T> {  // No type constraints
    value: T;
    timestamp: number;
    key: string;
}
```

## Proposed Improvements

### 1. Type-Safe Cache Manager
```typescript
/**
 * Type-safe cache manager with proper async boundaries
 */
export class CacheManager<T extends BaseTransportData> {
    private readonly cache: Map<string, CacheEntry<T>>;
    private readonly maxEntries: number;
    private readonly ttl: number;

    constructor(config: CacheConfig) {
        this.cache = new Map();
        this.maxEntries = config.maxEntries ?? 1000;
        this.ttl = config.ttl ?? 60000;
    }

    // Type-safe operations
    async set(key: CacheKey, value: T): Promise<void>;
    async get(key: CacheKey): Promise<T | null>;
}
```

### 2. Type-Safe Keys
```typescript
/**
 * Type-safe cache key generation
 */
export interface CacheKey {
    readonly level: LogLevel;
    readonly message: string;
    readonly context?: Readonly<Record<string, unknown>>;
    readonly timestamp?: string;
}

export function createCacheKey(params: CacheKeyParams): CacheKey;
```

### 3. Entry Type Safety
```typescript
/**
 * Type-safe cache entry with validation
 */
export interface CacheEntry<T extends BaseTransportData> {
    readonly value: T;
    readonly timestamp: number;
    readonly key: string;
    readonly ttl: number;
}
```

## Implementation Strategy

1. Cache Manager Class
   - Encapsulate cache logic
   - Proper async boundaries
   - Type-safe operations

2. Type System
   - Discriminated unions
   - Readonly types
   - Generic constraints

3. Memory Management
   - Entry TTL
   - Size limits
   - Cleanup strategy

4. Performance
   - Efficient key generation
   - Minimal type checking
   - Optimized storage

## Expected Benefits

1. Type Safety
   - No global state
   - Safe type assertions
   - Proper async boundaries

2. Performance
   - Controlled memory usage
   - Efficient cache operations
   - Reduced type checking

3. Maintainability
   - Clear ownership
   - Documented invariants
   - Testable boundaries 