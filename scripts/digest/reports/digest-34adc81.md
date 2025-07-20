# Jitterbug Semantic Digest – 2025-07-20

**Digest Format:** v1.2
**Integrity Hash:** 4c13adb7a _(compare next digest for unexpected baseline drift)_

## Commit Context
- **Current commit:** `34adc814c5b46d9507d6376840b54d2f8f3bea6d`
- **Branch:** `main`
- **Comparing since:** `HEAD~1`
- **Generated:** 2025-07-20T04:55:33.828Z
- **Last commit:** chore(debug): contract debug control surface & fix TS errors

## Summary
- **8 files changed** (+234 / -9 lines, net +225)

## Risk Heuristics
✅ All heuristics under thresholds (risk: low)
- Commit LOC ≤ 500? ✅ (+225)
- Public export growth ≤ 10? ✅ (+0)
- Type errors = 0? ✅ (0)
- New cycles = 0? ✅ (0)
- Runtime-core coverage ≥ 60%? ✅ (100%)
- Debugger-lifecycle coverage ≥ 90%? ✅ (100%)

## API Surface Drift
**Impact:** +0 / -2 exports

| Symbol | Status | File | Change Type |
|--------|--------|------|-------------|
| `emitWithAutoLevel` | removed | src/browser/debug-control.ts | Breaking |
| `guardedEmit` | removed | src/browser/debug-control.ts | Breaking |

## Export Changes
**Removed (2):**
- `emitWithAutoLevel` from src/browser/debug-control.ts
- `guardedEmit` from src/browser/debug-control.ts

## Public API Drift
| Symbol | Status | Cat | Hash (old→new) | Notes |
|--------|--------|-----|----------------|-------|
| `HelpEntry` | changed | core | 59cb7b8f→a0dacb8 | — |
| `emitWithAutoLevel` | removed | core | 324539d5 | Breaking removal |
| `guardedEmit` | removed | core | 47b155b | Breaking removal |

## Stability Tier Summary

| Tier | Count | Δ | Gate | Notes |
|------|-------|---|---------|-------|
| stable | 2 | +0 | ✅ (≤5) | initializeJitterbug, ensureJitterbugReady |
| experimental | 2 | +0 | ✅ (≤5) | experimentalSafeEmit, emitJitterbugEvent |
| internal | 0 | +0 | — | Governance constants & registry internalized |

## Export Category Summary

| Category | Count | Δ | Notes |
|----------|-------|---|-------|
| core | 12 | -2 | Stable target ≤5 |
| util | 0 | +0 | Helper functions |
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
| Export Growth | Δ exports ≤ +3 per commit | ✅ pass |
| Internalization Justification | Each removed symbol mapped in Moves table | ❌ fail |
| Schema Required Set | ≥90% | ✅ pass |

## Action Queue (Auto-Generated)

1. Map 2 unmapped symbol removals

## Graph Delta
- **Nodes:** 30 (±0)
- **Edges:** +0 / -0
- **Max fan-in:** src/orchestrator/core-orchestrator.ts (5) (unchanged)
- **Cycles:** 0 (score 0)
- **Graph hash:** 17773180...

## Health Metrics
- **TypeScript:** 0 errors
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
  "timestamp": "2025-07-20T04:55:33.828Z",
  "tsErrors": 0,
  "eslintErrors": 0,
  "cycles": [],
  "graphHash": "17773180",
  "netLines": 225,
  "filesChanged": 8
}
```

</details>
