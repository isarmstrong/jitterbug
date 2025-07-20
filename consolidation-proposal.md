# Export Consolidation Proposal

## Current State (11 exports)
- `initializeJitterbug` (core entry point)
- `ensureJitterbugReady`, `emitJitterbugEvent` (utils)
- `configPersistence` (experimental config)
- `experimentalSafeEmit` (experimental emission)
- `logInspector` (experimental logs)
- 5 type exports

## Proposed Consolidation (6 exports max)

### Option A: Namespace Consolidation
```typescript
// Single experimental namespace
export const experimental = {
  config: configPersistence,
  safeEmit: experimentalSafeEmit,
  logInspector: logInspector
};

// Core utilities remain top-level
export { initializeJitterbug, ensureJitterbugReady, emitJitterbugEvent };
```

### Option B: Feature-Based Namespaces
```typescript
// Diagnostic/introspection namespace
export const diagnostics = {
  config: configPersistence,
  logs: logInspector,
  // Future: metrics, profiling, etc.
};

// Emission utilities
export const emission = {
  safeEmit: experimentalSafeEmit,
  // Future: batch emit, scheduled emit, etc.
};

// Core remains top-level
export { initializeJitterbug, ensureJitterbugReady, emitJitterbugEvent };
```

### Option C: Single Debug Namespace (Recommended)
```typescript
// All debugging/introspection under one roof
export const debug = {
  config: configPersistence,
  logs: logInspector,
  safeEmit: experimentalSafeEmit,
  // Future slots reserved for:
  // metrics, profiling, export, import, etc.
};

// Minimal core surface
export { initializeJitterbug, ensureJitterbugReady, emitJitterbugEvent };
```

## Migration Strategy
1. Add namespaced exports alongside current exports
2. Mark old exports with `@deprecated` JSDoc
3. Add console warnings for deprecated usage
4. Remove deprecated exports in next minor version

## Surface Budget for Task 3.5
- **Reserved slots**: 0 new top-level exports
- **Expansion within `debug.logs`**: Add methods to existing `logInspector`
- **Target**: `debug.logs.query()`, `debug.logs.export()`, `debug.logs.stream()`

## Type Facade Strategy
```typescript
// Public config shape (narrow)
export interface PublicConfig {
  debug: { enabled: boolean; level: number };
  branches: { active: string | null };
  logs?: { bufferSize?: number };
  updatedAt: string;
}

// Internal config shape (rich) - not exported
interface InternalConfig extends PublicConfig {
  version: number;
  _metadata: { migrations: string[]; source: 'api' | 'storage' };
}
```