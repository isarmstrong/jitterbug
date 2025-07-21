# Jitterbug Semantic Digest – 2025-07-21

**Digest Format:** v1.2
**Integrity Hash:** 4c13adb7a _(compare next digest for unexpected baseline drift)_

## Commit Context
- **Current commit:** `fe72c515209427f6642cfc46904f7934fb982e21`
- **Branch:** `main`
- **Comparing since:** `HEAD~1`
- **Generated:** 2025-07-21T06:13:37.585Z
- **Last commit:** feat(security): P4.3 comprehensive security hardening

## Summary
- **4 files changed** (+429 / -3 lines, net +426)

## Risk Heuristics
⚠️  **Risk thresholds exceeded:**
- **TypeScript regression:** 3 errors

## Public API Drift
| Symbol | Status | Cat | Hash (old→new) | Notes |
|--------|--------|-----|----------------|-------|
| `trackUserActivity` | changed | core | 498121a7→747bc200 | — |
| `PushOrchestrator` | changed | core | 30ee40e0→e7ff420 | — |

## Stability Tier Summary

| Tier | Count | Δ | Gate | Notes |
|------|-------|---|---------|-------|
| stable | 2 | +0 | ✅ (≤5) | initializeJitterbug, ensureJitterbugReady |
| experimental | 2 | +0 | ✅ (≤5) | experimentalSafeEmit, emitJitterbugEvent |
| internal | 0 | +0 | — | Governance constants & registry internalized |

## Export Category Summary

| Category | Count | Δ | Notes |
|----------|-------|---|-------|
| core | 13 | +0 | Stable target ≤5 |
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
| Internalization Justification | Each removed symbol mapped in Moves table | ✅ pass |
| Schema Required Set | ≥90% | ✅ pass |

## Graph Delta
- **Nodes:** 67 (±0)
- **Edges:** +0 / -0
- **Max fan-in:** src/orchestrator/core-orchestrator.ts (5) (unchanged)
- **Cycles:** 0 (score 0)
- **Graph hash:** b5d2a8...

## Health Metrics
- **TypeScript:** 3 errors
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
  "timestamp": "2025-07-21T06:13:37.585Z",
  "tsErrors": 3,
  "eslintErrors": 0,
  "cycles": [],
  "graphHash": "b5d2a8",
  "netLines": 426,
  "filesChanged": 4
}
```

</details>
