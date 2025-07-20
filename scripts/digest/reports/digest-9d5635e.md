# Jitterbug Semantic Digest – 2025-07-20

**Digest Format:** v1.2
**Integrity Hash:** 4c13adb7a _(compare next digest for unexpected baseline drift)_

## Commit Context
- **Current commit:** `9d5635eb534760669677c81839ae9da6dca78ef9`
- **Branch:** `main`
- **Comparing since:** `HEAD~1`
- **Generated:** 2025-07-20T04:51:19.707Z
- **Last commit:** feat(debug): Complete Task 3.3 - Debug Mode Control Methods

## Summary
- **9 files changed** (+1064 / -13 lines, net +1051)
- **3 new modules:** src/browser/__tests__/debug-control.test.ts, src/browser/debug-control.ts, src/browser/debug-state.ts
- **Public surface:** +12 exports

## Risk Heuristics
⚠️  **Risk thresholds exceeded:**
- **Large commit:** +1051 lines (threshold: >500)
- **API surface inflation:** +12 exports (threshold: >10)
- **TypeScript regression:** 13 errors

## API Surface Drift
**Impact:** +12 / -0 exports

| Symbol | Status | File | Change Type |
|--------|--------|------|-------------|
| `emitWithAutoLevel` | added | src/browser/debug-control.ts | Additive |
| `guardedEmit` | added | src/browser/debug-control.ts | Additive |
| `experimentalDebug` | added | src/browser/debug-control.ts | Additive |
| `DebugLevel` | added | src/browser/debug-state.ts | Additive |
| `DebugLevels` | added | src/browser/debug-state.ts | Additive |
| `setConfigDirtyHook` | added | src/browser/debug-state.ts | Additive |
| `getDebugState` | added | src/browser/debug-state.ts | Additive |
| `updateDebugEnabled` | added | src/browser/debug-state.ts | Additive |
| `updateDebugLevel` | added | src/browser/debug-state.ts | Additive |
| `validateLevel` | added | src/browser/debug-state.ts | Additive |
| ... | ... | ... | +2 more changes |

## Export Changes
**Added (12):**
- `emitWithAutoLevel` in src/browser/debug-control.ts
- `guardedEmit` in src/browser/debug-control.ts
- `experimentalDebug` in src/browser/debug-control.ts
- `DebugLevel` in src/browser/debug-state.ts
- `DebugLevels` in src/browser/debug-state.ts
- ... and 7 more

## Public API Drift
| Symbol | Status | Cat | Hash (old→new) | Notes |
|--------|--------|-----|----------------|-------|
| `safeEmit` | changed | core | 62ed7971→6d1f1109 | — |
| `emitWithAutoLevel` | new | core | 324539d5 | — |
| `guardedEmit` | new | core | 47b155b | — |
| `experimentalDebug` | new | util | 1a519f09 | — |
| `DebugLevel` | new | core | 79619ab8 | — |
| `DebugLevels` | new | util | 6150d1cd | — |
| `setConfigDirtyHook` | new | core | 98bfa | — |
| `getDebugState` | new | core | 254d5123 | — |
| `updateDebugEnabled` | new | core | 43463da2 | — |
| `updateDebugLevel` | new | core | 58a06400 | — |
| `validateLevel` | new | core | 35528050 | — |
| `__resetDebugState` | new | core | ad430 | — |
| `setGlobalEmitFn` | new | core | 2c6d62de | — |

## Stability Tier Summary

| Tier | Count | Δ | Gate | Notes |
|------|-------|---|---------|-------|
| stable | 2 | +0 | ✅ (≤5) | initializeJitterbug, ensureJitterbugReady |
| experimental | 2 | +0 | ✅ (≤5) | experimentalSafeEmit, emitJitterbugEvent |
| internal | 0 | +0 | — | Governance constants & registry internalized |

## Export Category Summary

| Category | Count | Δ | Notes |
|----------|-------|---|-------|
| core | 12 | +11 | Stable target ≤5 |
| util | 0 | +1 | Helper functions |
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
| `orchestrator.step.dispatch.started` | ✅ | — |
| `orchestrator.step.dispatch.completed` | ✅ | — |
| `orchestrator.step.dispatch.failed` | ✅ | — |
| `orchestrator.core.initialization.started` | ✅ | — |
| `orchestrator.core.initialization.completed` | ✅ | — |
| `orchestrator.core.initialization.failed` | ✅ | — |
| `orchestrator.core.shutdown.started` | ✅ | — |
| `orchestrator.core.shutdown.completed` | ✅ | — |
| `orchestrator.core.shutdown.failed` | ✅ | — |
| `orchestrator.branch.registration.started` | ✅ | — |
| `orchestrator.branch.registration.completed` | ✅ | — |
| `orchestrator.branch.registration.failed` | ✅ | — |
| `orchestrator.branch.unregistration.started` | ✅ | — |
| `orchestrator.branch.unregistration.completed` | ✅ | — |
| `orchestrator.branch.unregistration.failed` | ✅ | — |
| `orchestrator.log.processing.started` | ✅ | — |
| `orchestrator.log.processing.completed` | ✅ | — |
| `orchestrator.log.processing.failed` | ✅ | — |

**Schema Completeness:** 28/28 (100%)

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
| Export Growth | Δ exports ≤ +3 per commit | ❌ fail |
| Internalization Justification | Each removed symbol mapped in Moves table | ✅ pass |
| Schema Required Set | ≥90% | ✅ pass |

## Action Queue (Auto-Generated)

1. Reduce export growth by 9 exports

## Graph Delta
- **Nodes:** 30 (±0)
- **Edges:** +0 / -0
- **Max fan-in:** src/orchestrator/core-orchestrator.ts (5) (unchanged)
- **Cycles:** 0 (score 0)
- **Graph hash:** 17773180...

## Health Metrics
- **TypeScript:** 13 errors
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
  "timestamp": "2025-07-20T04:51:19.707Z",
  "tsErrors": 13,
  "eslintErrors": 0,
  "cycles": [],
  "graphHash": "17773180",
  "netLines": 1051,
  "filesChanged": 9
}
```

</details>
