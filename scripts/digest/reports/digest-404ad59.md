# Jitterbug Semantic Digest – 2025-07-21

**Digest Format:** v1.2
**Integrity Hash:** 4c13adb7a _(compare next digest for unexpected baseline drift)_

## Commit Context
- **Current commit:** `404ad599d9f105bbc626e275bab3fe317d6e03f4`
- **Branch:** `main`
- **Comparing since:** `HEAD~1`
- **Generated:** 2025-07-21T03:39:12.364Z
- **Last commit:** feat(test): P4.2-c.4 auth hooks & telemetry assertions

## Summary
- **11 files changed** (+972 / -1 lines, net +971)
- **2 new modules:** src/browser/transports/sse/auth.ts, src/browser/transports/sse/filter-spec.ts
- **Public surface:** +7 exports

## Risk Heuristics
⚠️  **Risk thresholds exceeded:**
- **Large commit:** +971 lines (threshold: >500)
- **Large changeset:** 11 files modified (threshold: >10)

## API Surface Drift
**Impact:** +7 / -0 exports

| Symbol | Status | File | Change Type |
|--------|--------|------|-------------|
| `AuthResult` | added | src/browser/transports/sse/auth.ts | Additive |
| `AuthRequest` | added | src/browser/transports/sse/auth.ts | Additive |
| `authorizeFilterUpdate` | added | src/browser/transports/sse/auth.ts | Additive |
| `LiveFilterSpec` | added | src/browser/transports/sse/filter-spec.ts | Additive |
| `FilterUpdateMessage` | added | src/browser/transports/sse/filter-spec.ts | Additive |
| `FilterAckMessage` | added | src/browser/transports/sse/filter-spec.ts | Additive |
| `FilterErrorMessage` | added | src/browser/transports/sse/filter-spec.ts | Additive |

## Export Changes
**Added (7):**
- `AuthResult` in src/browser/transports/sse/auth.ts
- `AuthRequest` in src/browser/transports/sse/auth.ts
- `authorizeFilterUpdate` in src/browser/transports/sse/auth.ts
- `LiveFilterSpec` in src/browser/transports/sse/filter-spec.ts
- `FilterUpdateMessage` in src/browser/transports/sse/filter-spec.ts
- ... and 2 more

## Public API Drift
| Symbol | Status | Cat | Hash (old→new) | Notes |
|--------|--------|-----|----------------|-------|
| `AuthResult` | new | core | 78ce7216 | — |
| `AuthRequest` | new | core | 9c40e3f | — |
| `authorizeFilterUpdate` | new | core | 433c815a | — |
| `LiveFilterSpec` | new | core | 772b296 | — |
| `FilterUpdateMessage` | new | core | 1296cb54 | — |
| `FilterAckMessage` | new | core | 10e8040b | — |
| `FilterErrorMessage` | new | core | 66d8c4ac | — |

## Stability Tier Summary

| Tier | Count | Δ | Gate | Notes |
|------|-------|---|---------|-------|
| stable | 2 | +0 | ✅ (≤5) | initializeJitterbug, ensureJitterbugReady |
| experimental | 2 | +0 | ✅ (≤5) | experimentalSafeEmit, emitJitterbugEvent |
| internal | 0 | +0 | — | Governance constants & registry internalized |

## Export Category Summary

| Category | Count | Δ | Notes |
|----------|-------|---|-------|
| core | 13 | +3 | Stable target ≤5 |
| util | 0 | +0 | Helper functions |
| tool | 0 | +4 | Dev-only (excluded from surface gate) |
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
| Export Growth | Δ exports ≤ +3 per commit | ❌ fail |
| Internalization Justification | Each removed symbol mapped in Moves table | ✅ pass |
| Schema Required Set | ≥90% | ✅ pass |

## Action Queue (Auto-Generated)

1. Reduce export growth by 4 exports

## Graph Delta
- **Nodes:** 55 (±0)
- **Edges:** +0 / -0
- **Max fan-in:** src/orchestrator/core-orchestrator.ts (5) (unchanged)
- **Cycles:** 0 (score 0)
- **Graph hash:** 3857e89...

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
  "timestamp": "2025-07-21T03:39:12.364Z",
  "tsErrors": 0,
  "eslintErrors": 0,
  "cycles": [],
  "graphHash": "3857e89",
  "netLines": 971,
  "filesChanged": 11
}
```

</details>
