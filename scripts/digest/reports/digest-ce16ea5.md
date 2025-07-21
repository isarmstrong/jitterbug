# Jitterbug Semantic Digest – 2025-07-21

**Digest Format:** v1.2
**Integrity Hash:** 4c13adb7a _(compare next digest for unexpected baseline drift)_

## Commit Context
- **Current commit:** `ce16ea5ae1b4704a4bd4969c5db0678caa3cd57a`
- **Branch:** `main`
- **Comparing since:** `HEAD~1`
- **Generated:** 2025-07-21T07:16:58.161Z
- **Last commit:** fix(api): reduce P4.3 export surface (-2 exports)

## Summary
- **2 files changed** (+60 / -7 lines, net +53)

## Risk Heuristics
✅ All heuristics under thresholds (risk: low)
- Commit LOC ≤ 500? ✅ (+53)
- Public export growth ≤ 10? ✅ (+0)
- Type errors = 0? ✅ (0)
- New cycles = 0? ✅ (0)
- Runtime-core coverage ≥ 60%? ✅ (100%)
- Debugger-lifecycle coverage ≥ 90%? ✅ (100%)

## API Surface Drift
**Impact:** +0 / -3 exports

| Symbol | Status | File | Change Type |
|--------|--------|------|-------------|
| `createHeartbeatEmitter` | removed | src/hub/index.ts | Breaking |
| `createTelemetryEmitter` | removed | src/hub/index.ts | Breaking |
| `createUserActivityEmitter` | removed | src/hub/index.ts | Breaking |

## Export Changes
**Removed (3):**
- `createHeartbeatEmitter` from src/hub/index.ts
- `createTelemetryEmitter` from src/hub/index.ts
- `createUserActivityEmitter` from src/hub/index.ts

## Public API Drift
| Symbol | Status | Cat | Hash (old→new) | Notes |
|--------|--------|-----|----------------|-------|
| `bootstrapPushSystem` | changed | core | 3384c527→1f55e484 | — |
| `createHeartbeatEmitter` | moved | core | 3ff25ad1→7ed9b9d5 | Moved from src/hub/index.ts |
| `createTelemetryEmitter` | moved | core | 2602769e→13e69a8b | Moved from src/hub/index.ts |
| `createUserActivityEmitter` | moved | core | 460cdccd→77ecfa2d | Moved from src/hub/index.ts |

## Stability Tier Summary

| Tier | Count | Δ | Gate | Notes |
|------|-------|---|---------|-------|
| stable | 2 | +0 | ✅ (≤5) | initializeJitterbug, ensureJitterbugReady |
| experimental | 2 | +0 | ✅ (≤5) | experimentalSafeEmit, emitJitterbugEvent |
| internal | 0 | +0 | — | Governance constants & registry internalized |

## Export Category Summary

| Category | Count | Δ | Notes |
|----------|-------|---|-------|
| core | 13 | -3 | Stable target ≤5 |
| util | 0 | +0 | Helper functions |
| tool | 0 | +0 | Dev-only (excluded from surface gate) |
| internalized (this commit) | 0 | +0 | Formerly public; now internal |

## Moves & Internalizations

| Symbol | Old Path | New Status | Rationale |
|--------|----------|-----------|-----------||
| createHeartbeatEmitter | src/hub/index.ts | moved → src/hub/emitters/heartbeatEmitter.ts | File reorganization |
| createTelemetryEmitter | src/hub/index.ts | moved → src/hub/emitters/telemetryEmitter.ts | File reorganization |
| createUserActivityEmitter | src/hub/index.ts | moved → src/hub/emitters/userActivityEmitter.ts | File reorganization |

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
- **Symbol moves/internalizations:** 3 changes
- **Exceptions acknowledged:** 2 (documented)

## Gates Summary

| Gate | Condition | Status |
|------|-----------|--------|
| Coverage Non-Regression | runtime-core == 100% | ✅ pass |
| Core Export Count | ≤8 stable exports | ✅ pass |
| Export Growth | Δ exports ≤ +3 per commit | ✅ pass |
| Internalization Justification | Each removed symbol mapped in Moves table | ✅ pass |
| Schema Required Set | ≥90% | ✅ pass |

## Graph Delta
- **Nodes:** 75 (±0)
- **Edges:** +0 / -0
- **Max fan-in:** src/orchestrator/core-orchestrator.ts (5) (unchanged)
- **Cycles:** 0 (score 0)
- **Graph hash:** 701e7e96...

## Health Metrics
- **TypeScript:** 0 errors
- **ESLint:** 0 errors
- **TODOs:** 10 items

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
  "timestamp": "2025-07-21T07:16:58.161Z",
  "tsErrors": 0,
  "eslintErrors": 0,
  "cycles": [],
  "graphHash": "701e7e96",
  "netLines": 53,
  "filesChanged": 2
}
```

</details>
