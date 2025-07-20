# Jitterbug Semantic Digest – 2025-07-20

**Digest Format:** v1.2
**Integrity Hash:** 4c13adb7a _(compare next digest for unexpected baseline drift)_

## Commit Context
- **Current commit:** `6a19278366169d41a8b6deaaef362574a386ce7d`
- **Branch:** `main`
- **Comparing since:** `HEAD~1`
- **Generated:** 2025-07-20T05:42:38.960Z
- **Last commit:** feat(digest): enhance to exclude internal implementation directories

## Summary
- **9 files changed** (+467 / -627 lines, net -160)
- **Public surface:** +1 exports (DebugState)

## Risk Heuristics
⚠️  **Risk thresholds exceeded:**
- **TypeScript regression:** 2 errors

## API Surface Drift
**Impact:** +1 / -6 exports

| Symbol | Status | File | Change Type |
|--------|--------|------|-------------|
| `DebugConfigV1` | removed | src/browser/config-persistence.ts | Breaking |
| `ConfigLoadResult` | removed | src/browser/config-persistence.ts | Breaking |
| `validateConfig` | removed | src/browser/config-persistence.ts | Breaking |
| `markDirty` | removed | src/browser/config-persistence.ts | Breaking |
| `loadConfig` | removed | src/browser/config-persistence.ts | Breaking |
| `DebugState` | added | src/browser/debug-state.ts | Additive |
| ... | ... | ... | +1 more changes |

## Export Changes
**Added (1):**
- `DebugState` in src/browser/debug-state.ts
**Removed (6):**
- `DebugConfigV1` from src/browser/config-persistence.ts
- `ConfigLoadResult` from src/browser/config-persistence.ts
- `validateConfig` from src/browser/config-persistence.ts
- `markDirty` from src/browser/config-persistence.ts
- `loadConfig` from src/browser/config-persistence.ts

## Public API Drift
| Symbol | Status | Cat | Hash (old→new) | Notes |
|--------|--------|-----|----------------|-------|
| `configPersistence ` | new | util | 2fb4940 | — |
| `DebugState` | new | core | 6f1838f7 | — |
| `DebugConfigV1` | removed | core | 5684afc6 | Breaking removal |
| `ConfigLoadResult` | removed | core | 72633459 | Breaking removal |
| `validateConfig` | removed | core | 10a427d1 | Breaking removal |
| `markDirty` | removed | core | 37db06c3 | Breaking removal |
| `loadConfig` | removed | core | 7d1789af | Breaking removal |
| `resetConfig` | removed | core | 3a0b2078 | Breaking removal |
| `configPersistence` | removed | util | 62ba8c49 | Breaking removal |

## Stability Tier Summary

| Tier | Count | Δ | Gate | Notes |
|------|-------|---|---------|-------|
| stable | 2 | +0 | ✅ (≤5) | initializeJitterbug, ensureJitterbugReady |
| experimental | 2 | +0 | ✅ (≤5) | experimentalSafeEmit, emitJitterbugEvent |
| internal | 0 | +0 | — | Governance constants & registry internalized |

## Export Category Summary

| Category | Count | Δ | Notes |
|----------|-------|---|-------|
| core | 12 | +0 | Stable target ≤5 |
| util | 0 | -5 | Helper functions |
| tool | 0 | +0 | Dev-only (excluded from surface gate) |
| internalized (this commit) | 0 | +0 | Formerly public; now internal |

## Coverage Trend

| Scope | Prev | Current | Δ | Gate |
|-------|------|---------|---|------|
| runtime-core | 100% | 100% | +0% | ✅ Pass |
| debugger-lifecycle | 100% | 100% | +0% | ✅ Pass |

## Event Coverage
| Scope | Instrumented / Total | Percent |
|-------|----------------------|---------|
| runtime-core | 5 / 5 | 100% ✅ |
| debugger-lifecycle | 5 / 5 | 100% ✅ |
| **Overall (weighted)** | **100%** | ✅ |

**Scope Details:**
- **Runtime-core instrumented:** processLog, createExecutionPlan, executePlan, dispatchStep, finalizePlan
- **Debugger-lifecycle instrumented:** initialize, registerBranch, unregisterBranch, shutdown, processLog

## Event Schema Completeness
| Event | Required Fields Present? | Missing |
|-------|--------------------------|---------||
| `orchestrator.plan.build.started` | ✅ | — |
| `orchestrator.plan.build.completed` | ✅ | — |
| `orchestrator.plan.build.failed` | ✅ | — |
| `orchestrator.plan.execution.started` | ✅ | — |
| `orchestrator.plan.execution.completed` | ✅ | — |
| `orchestrator.plan.execution.failed` | ✅ | — |
| `orchestrator.plan.finalized` | ✅ | — |
| `orchestrator.step.started` | ✅ | — |
| `orchestrator.step.completed` | ✅ | — |
| `orchestrator.step.failed` | ✅ | — |

**Schema Completeness:** 10/10 (100%)

## Payload Field Completeness

| Event Class | Required Fields | Present % | Missing Fields (if any) |
|-------------|-----------------|-----------|-------------------------|
| step.* completed/failed | stepId, adapter, attempt, elapsedMs | 100% | — |
| plan.* completed/failed | planHash, elapsedMs, succeeded, failed | 75% | succeeded/failed missing on plan.build.* |

## Baseline Field Exceptions

| Event | Field | Reason |
|-------|-------|--------|
| orchestrator.plan.build.completed | succeeded/failed | Execution not started; counts undefined at build stage |
| orchestrator.plan.build.failed | succeeded/failed | Build failure occurs before execution; counts N/A |

## Digest Integrity

- **Coverage gates:** PASS (runtime-core 100%, lifecycle 100%)
- **Schema completeness:** PASS (28/28)
- **Unschema'd emissions:** 0
- **Stable export count:** 2 (≤5) – PASS
- **Experimental export count:** 2 (≤5) – PASS
- **Wildcard exports:** 0 – PASS
- **Symbol moves/internalizations:** None (baseline stable)
- **Exceptions acknowledged:** 2 (documented)

## Gates Summary

| Gate | Condition | Status |
|------|-----------|--------|
| Coverage Non-Regression | runtime-core == 100% | ✅ pass |
| Core Export Count | ≤8 stable exports | ✅ pass |
| Export Growth | Δ exports ≤ +3 per commit | ✅ pass |
| Internalization Justification | Each removed symbol mapped in Moves table | ❌ fail |
| Schema Required Set | ≥90% | ✅ pass |

## Action Queue (Auto-Generated)

1. Map 7 unmapped symbol removals

## Graph Delta
- **Nodes:** 32 (±0)
- **Edges:** +0 / -0
- **Max fan-in:** src/orchestrator/core-orchestrator.ts (5) (unchanged)
- **Cycles:** 0 (score 0)
- **Graph hash:** 2131ffdf...

## Health Metrics
- **TypeScript:** 2 errors
- **ESLint:** 0 errors
- **TODOs:** 0 items

## 🔒 Locked Decisions (v1.0)
| Decision | Value | Notes |
|----------|-------|---------|
| Hash Algorithm | xxhash64 (plan + domain signatures) | Fast, low collision; upgrade path documented |
| Core Type Names | Plan, Step, Adapter, ExecutionContext | Do not rename without version bump |
| Event Namespace | `orchestrator.<entity>.<verb>` | Examples: `orchestrator.step.started` |
| Error Base Class | `BaseOrchestratorError` | All internal throws extend this |
| Cycle Policy | Fail CI on any new cycle | Introduced cycles require explicit waiver |
| Adapter Registry | Static map with capability metadata | Future DI layer wraps map, not replace |
| Public API Drift Tracking | Deferred (manual review) | Enable when core module count > 15 |

<details><summary>Machine Data</summary>

```json
{
  "timestamp": "2025-07-20T05:42:38.960Z",
  "tsErrors": 2,
  "eslintErrors": 0,
  "cycles": [],
  "graphHash": "2131ffdf",
  "netLines": -160,
  "filesChanged": 9
}
```

</details>
