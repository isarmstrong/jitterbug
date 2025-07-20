# Jitterbug Semantic Digest – 2025-07-20

## Commit Context
- **Current commit:** `ada4ba4b23fe7f6034bb28cf3fdff9e258e53b31`
- **Branch:** `main`
- **Comparing since:** `HEAD~1`
- **Generated:** 2025-07-20T03:43:18.090Z
- **Last commit:** chore(stability): add explicit tier annotations (@stable/@experimental)

## Summary
- **3 files changed** (+217 / -6 lines, net +211)

## Risk Heuristics
✅ All heuristics under thresholds (risk: low)
- Commit LOC ≤ 500? ✅ (+211)
- Public export growth ≤ 10? ✅ (+0)
- Type errors = 0? ✅ (0)
- New cycles = 0? ✅ (0)
- Runtime-core coverage ≥ 60%? ✅ (100%)
- Debugger-lifecycle coverage ≥ 90%? ✅ (100%)

## Public API Drift
| Symbol | Status | Cat | Hash (old→new) | Notes |
|--------|--------|-----|----------------|-------|
| `ensureJitterbugReady, emitJitterbugEvent ` | moved | util | 7ef5dfda→79568a28 | Moved from src/index.ts |
| `ensureJitterbugReady ` | new | util | 702a97a8 | — |
| `emitJitterbugEvent ` | new | util | b29b640 | — |

## Export Category Summary

| Category | Count | Δ | Notes |
|----------|-------|---|-------|
| core | 0 | +0 | No public exports (all internalized for pre-release) |
| util | 0 | +0 | Helper functions |
| tool | 0 | +0 | Dev-only (excluded from surface gate) |
| internalized (this commit) | 0 | +0 | Formerly public; now internal |

## Moves & Internalizations

| Symbol | Old Path | New Status | Rationale |
|--------|----------|-----------|-----------||
| ensureJitterbugReady, emitJitterbugEvent  | src/index.ts | moved → src/browser/public.ts | File reorganization |

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

## Gates Summary

| Gate | Condition | Status |
|------|-----------|--------|
| Coverage Non-Regression | runtime-core == 100% | ✅ pass |
| Core Export Count | ≤8 stable exports | ✅ pass |
| Export Growth | Δ exports ≤ +3 per commit | ✅ pass |
| Internalization Justification | Each removed symbol mapped in Moves table | ✅ pass |
| Schema Required Set | ≥90% | ✅ pass |

## Graph Delta
- **Nodes:** 23 (±0)
- **Edges:** +0 / -0
- **Max fan-in:** src/orchestrator/core-orchestrator.ts (5) (unchanged)
- **Cycles:** 0 (score 0)
- **Graph hash:** 521c0d3c...

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
  "timestamp": "2025-07-20T03:43:18.090Z",
  "tsErrors": 0,
  "eslintErrors": 0,
  "cycles": [],
  "graphHash": "521c0d3c",
  "netLines": 211,
  "filesChanged": 3
}
```

</details>
