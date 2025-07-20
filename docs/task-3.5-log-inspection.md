# Task 3.5 – Log Inspection & Export Utilities

## Objectives
1. Capture & retain a bounded in-memory log/event buffer (debug + orchestrator events) with minimal overhead.
2. Provide a single experimental facade for querying, filtering, summarizing, and exporting.
3. Avoid public type explosion (≤ +3 exports; target +1).
4. Zero instrumentation regression—reuse existing safeEmit pipeline; only add new event types if they materially help observability (e.g., orchestrator.log.buffer.rotated).

## Proposed Public Surface (Additive)

| Symbol | Tier | Description |
|--------|------|-------------|
| `logInspector` | `@experimental` | Facade object exposing query/export/stats. (Single export target) |

**Do not export shape interfaces** (LogEntry, LogQueryOptions, etc). Return plain objects with documented fields; tests enforce shape.

## Internal Architecture

```
src/browser/logs/
  buffer.ts        (ring buffer implementation)
  filters.ts       (predicate builders + normalization)
  export.ts        (serializer: json, ndjson, text)
  index.ts         (constructs logInspector facade)
  types.internal.ts (internal TS-only types)
```

Digest ignore pattern already supports internal dirs—place helpers under `logs/` and only export the facade from a thin file.

## Ring Buffer Implementation

- **Config Key**: Reuse `configPersistence.snapshot().logs.bufferSize` (already future-proofed).
- **Default size**: 1000 (from persistence defaults).
- **Keep two counters**:
  - `seq` (monotonic ever-incrementing; not modulo) for stable ordering & pagination.
  - `dropped` (count of overwritten entries) to report data loss in stats.

### Structure:

```typescript
interface InternalEntry {
  seq: number;
  ts: number;              // epoch ms
  type: string;            // event type
  level?: DebugLevel;      // if debug event
  branch?: string | null;
  payload?: unknown;
}
```

Ring array of length N; insert index = `seq % N`.

## Ingestion Hook

Wrap existing safeEmit (or attach to event bus). Pseudocode:

```typescript
function onEvent(type, payload) {
  const now = Date.now();
  push({
    seq: ++seq,
    ts: now,
    type,
    level: inferLevel(type, payload), // cheap or optional
    branch: payload?.branch ?? activeBranchOrNull(),
    payload: capture? maybeShallowClone(payload) : undefined
  });
}
```

**Optimization**: Provide a `capturePayload` flag (default false) to avoid retaining large objects by default. When disabled, store only a truncated summary (e.g., first 120 chars of JSON.stringify).

## Facade API (Public)

```typescript
export const logInspector = {
  query(options?: {
    sinceSeq?: number;
    limit?: number;          // default 100
    level?: DebugLevel | DebugLevel[];
    types?: string[];        // exact matches
    branch?: string;
    text?: string;           // substring search (case-insensitive) on JSON payload summary
  }): { entries: PublicEntry[]; nextSinceSeq: number; dropped: number; total: number };

  stats(): {
    size: number;            // configured buffer size
    used: number;
    dropped: number;
    firstSeq: number | null;
    lastSeq: number | null;
    levels: Record<DebugLevel, number>;
    typesTop: Array<{ type: string; count: number }>;
  };

  export(format: 'json' | 'ndjson' | 'text', options?: ExportOptions): string | BlobLike;

  clear(options?: { preserveLast?: number }): void; // optional; might keep internal only initially
};
```

### PublicEntry (implicit shape):

```typescript
{
  seq: number
  ts: string (ISO)
  type: string
  level?: string
  branch?: string | null
  payload?: unknown  // only if capture enabled
  summary?: string   // if payload omitted
}
```

## Filtering Strategy

Apply in order for efficiency:
1. `sinceSeq`: early cut by sequence (fast numeric compare).
2. `level/types/branch`: direct comparisons.
3. `text`: only on summary/payload JSON string (skip if large > threshold).
4. Slice to `limit`.

Return `nextSinceSeq = (lastReturnedSeq + 1)` to enable simple polling.

## Export Formats

| Format | Implementation | Notes |
|--------|----------------|-------|
| `json` | `JSON.stringify(entries)` | Entire current selection. |
| `ndjson` | Join `JSON.stringify(entry)` lines | Stream-friendly. |
| `text` | Human readable table-ish lines | For quick copy. |

Add future support for streaming without expanding surface: keep an internal `createReader()`.

## Performance Guardrails

- **Query target**: O(k) where k = returned entries (no full sort; ring already in insertion order).
- **Avoid re-allocating full array** on each query: iterate ring once with conditional inclusion.
- **stats() caches heavy aggregations** (typesTop) behind a dirty flag updated on ingestion.

## Instrumentation (Optional)

Emit these only if they add value for diagnostics:

| Event | When |
|-------|------|
| `orchestrator.log.buffer.rotated` | On first overwrite after wrap. Payload: { dropped, capacity }. |
| `orchestrator.log.export.requested` | On export call (maybe future). |

**Don't add per-ingest events** (circular).

## Tests (Add ~8–10)

1. **Ingestion & Capacity**: Fill buffer > capacity; ensure dropped increments and oldest replaced.
2. **Query Sequential**: sinceSeq pagination returns correct nextSinceSeq.
3. **Filters**: level, branch, type, combined.
4. **Text Search**: substring match in summary.
5. **Export Formats**: json, ndjson, text snapshot shape (stable sanitized payload).
6. **Stats Accuracy**: After mixed events.
7. **Payload Capture Off vs On**: Ensure omission vs presence.
8. **Performance (Optional)**: Generate 10k synthetic ingest (still only stores N) and ensure query under threshold (e.g., <5ms). Skip in CI if flaky—use a high-level expectation.

Use a test-only helper to inject synthetic events rather than reaching into internals; e.g.:

```typescript
import { experimentalDebug } from '../debug-control';
experimentalDebug.emitTestEvent?.('test.event', { ... });
```

Or temporarily expose an internal `__pushTestLog` guarded by `/** @internal */`.

## Export Budget Control

Only add the facade:

```typescript
/** @experimental */
export const logInspector = { ... };
```

All helper types remain internal. If your digest parser still auto-detects internal types, ensure those files reside in an ignored directory or are wrapped in an IIFE returning the facade (pattern explored earlier, but cleaner now that detection logic improved).

## Failure / Edge Behavior

| Situation | Behavior |
|-----------|----------|
| `sinceSeq` greater than `lastSeq` | Return empty entries, `nextSinceSeq = lastSeq + 1`. |
| Buffer empty | `stats()` returns zeros, `firstSeq = null`. |
| `limit > capacity` | Clamp to capacity. |
| Invalid filters | Throw only for programmer errors (e.g., negative limit); otherwise coerce silently. |

## Quick Implementation Order

1. `buffer.ts` (ring + push + iteration).
2. `logInspector` facade scaffold (no filters; just raw dump).
3. Add filters + tests.
4. Add export serializers.
5. Integrate ingestion hook (wrap safeEmit or add bus listener).
6. Add stats & tests.
7. Tier annotation + digest verify.

## Guard Against Regressions

Add a public surface snapshot test enumerating allowed exports (excluding tier metadata). If something new appears, test fails before digest noise.

Example (pseudo):

```typescript
import * as pkg from '../src';
expect(Object.keys(pkg).sort()).toEqual([
  'initializeJitterbug',
  'ensureJitterbugReady',
  'experimentalSafeEmit',
  'emitJitterbugEvent',
  'logInspector', // after Task 3.5
]);
```

(Adjust to actual stable + experimental.)