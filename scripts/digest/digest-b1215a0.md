# Jitterbug Semantic Digest – 2025-07-20

## Commit Context
- **Current commit:** `b1215a0abf525311e10ad64be9404ef5bf01e19f`
- **Branch:** `main`
- **Comparing since:** `HEAD~1`
- **Generated:** 2025-07-20T01:03:53.870Z
- **Last commit:** feat(architecture): implement governance and error taxonomy framework

## Summary
- **9 files changed** (+1209 / -5 lines, net +1204)
- **1 new modules:** src/orchestrator/errors.ts
- **Public surface:** +11 exports

## Risk Flags
- **⚠️ High LOC delta:** +1204 lines (foundation/refactor?)
- **⚠️ API surface inflation:** +11 exports in single commit

## API Surface Drift
**Impact:** +11 / -0 exports

| Symbol | Status | File | Change Type |
|--------|--------|------|-------------|
| `DigestGenerator` | added | scripts/generate-digest.ts | Additive |
| `DomainSnapshotGenerator` | added | scripts/generate-domain-snapshot.ts | Additive |
| `ConfigurationError` | added | src/orchestrator/errors.ts | Additive |
| `DependencyError` | added | src/orchestrator/errors.ts | Additive |
| `TransientError` | added | src/orchestrator/errors.ts | Additive |
| `InvariantError` | added | src/orchestrator/errors.ts | Additive |
| `CancelledError` | added | src/orchestrator/errors.ts | Additive |
| `ValidationError` | added | src/orchestrator/errors.ts | Additive |
| `isOrchestratorError` | added | src/orchestrator/errors.ts | Additive |
| `isRetryableError` | added | src/orchestrator/errors.ts | Additive |
| ... | ... | ... | +1 more changes |

## Export Changes
**Added (11):**
- `DigestGenerator` in scripts/generate-digest.ts
- `DomainSnapshotGenerator` in scripts/generate-domain-snapshot.ts
- `ConfigurationError` in src/orchestrator/errors.ts
- `DependencyError` in src/orchestrator/errors.ts
- `TransientError` in src/orchestrator/errors.ts
- ... and 6 more

## Health Metrics
- **TypeScript:** 0 errors
- **ESLint:** 0 errors
- **TODOs:** 0 items
- **Dependency graph:** 1cfa10e3...

## 🔒 Locked Decisions (v0.2)
| Decision | Value | Notes |
|----------|-------|---------|
| Hash Algorithm | xxhash64 (plan + domain signatures) | Fast, low collision; upgrade path documented |
| Core Type Names | Plan, Step, Adapter, ExecutionContext | Do not rename without version bump |
| Event Namespace | `orchestrator.<entity>.<verb>` | Examples: `orchestrator.step.started` |
| Error Base Class | `BaseOrchestratorError` | All internal throws extend this |
| Cycle Policy | Fail CI on any new cycle | Introduced cycles require explicit waiver |
| Adapter Registry | Static map with capability metadata | Future DI layer wraps map, not replace |

<details><summary>Machine Data</summary>

```json
{
  "timestamp": "2025-07-20T01:03:53.870Z",
  "tsErrors": 0,
  "eslintErrors": 0,
  "cycles": [],
  "graphHash": "1cfa10e3",
  "netLines": 1204,
  "filesChanged": 9
}
```

</details>
