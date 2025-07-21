# Jitterbug Semantic Digest – 2025-07-21

**Digest Format:** v1.2
**Integrity Hash:** 4c13adb7a _(compare next digest for unexpected baseline drift)_

## Commit Context
- **Current commit:** `537a2a3556be43c4536d7c52c4f310e7669296a2`
- **Branch:** `main`
- **Comparing since:** `HEAD~1`
- **Generated:** 2025-07-21T03:42:45.898Z
- **Last commit:** fix(exports): resolve export-growth violation (-5 symbols)

## Summary
- **4 files changed** (+210 / -20 lines, net +190)

## Risk Heuristics
✅ All heuristics under thresholds (risk: low)
- Commit LOC ≤ 500? ✅ (+190)
- Public export growth ≤ 10? ✅ (+0)
- Type errors = 0? ✅ (0)
- New cycles = 0? ✅ (0)
- Runtime-core coverage ≥ 60%? ✅ (100%)
- Debugger-lifecycle coverage ≥ 90%? ✅ (100%)

## API Surface Drift
**Impact:** +0 / -5 exports

| Symbol | Status | File | Change Type |
|--------|--------|------|-------------|
| `AuthResult` | removed | src/browser/transports/sse/auth.ts | Breaking |
| `AuthRequest` | removed | src/browser/transports/sse/auth.ts | Breaking |
| `FilterUpdateMessage` | removed | src/browser/transports/sse/filter-spec.ts | Breaking |
| `FilterAckMessage` | removed | src/browser/transports/sse/filter-spec.ts | Breaking |
| `FilterErrorMessage` | removed | src/browser/transports/sse/filter-spec.ts | Breaking |

## Export Changes
**Removed (5):**
- `AuthResult` from src/browser/transports/sse/auth.ts
- `AuthRequest` from src/browser/transports/sse/auth.ts
- `FilterUpdateMessage` from src/browser/transports/sse/filter-spec.ts
- `FilterAckMessage` from src/browser/transports/sse/filter-spec.ts
- `FilterErrorMessage` from src/browser/transports/sse/filter-spec.ts

## Public API Drift
| Symbol | Status | Cat | Hash (old→new) | Notes |
|--------|--------|-----|----------------|-------|
| `AuthResult` | removed | core | 78ce7216 | Breaking removal |
| `AuthRequest` | removed | core | 9c40e3f | Breaking removal |
| `FilterUpdateMessage` | removed | core | 1296cb54 | Breaking removal |
| `FilterAckMessage` | removed | core | 10e8040b | Breaking removal |
| `FilterErrorMessage` | removed | core | 66d8c4ac | Breaking removal |

## Symbol Moves & Internalizations

| Symbol | Previous Location | New Location/Access | Rationale |
|--------|------------------|---------------------|----------|
| `AuthResult` | src/browser/transports/sse/auth.ts | Internalized (implementation detail) | Encapsulated within module boundary |
| `AuthRequest` | src/browser/transports/sse/auth.ts | Internalized (implementation detail) | Encapsulated within module boundary |
| `FilterUpdateMessage` | src/browser/transports/sse/filter-spec.ts | Internalized (implementation detail) | Encapsulated within module boundary |
| `FilterAckMessage` | src/browser/transports/sse/filter-spec.ts | Internalized (implementation detail) | Encapsulated within module boundary |
| `FilterErrorMessage` | src/browser/transports/sse/filter-spec.ts | Internalized (implementation detail) | Encapsulated within module boundary |

## Stability Tier Summary

| Tier | Count | Δ | Gate | Notes |
|------|-------|---|---------|-------|
| stable | 2 | +0 | ✅ (≤5) | initializeJitterbug, ensureJitterbugReady |
| experimental | 2 | +0 | ✅ (≤5) | experimentalSafeEmit, emitJitterbugEvent |
| internal | 0 | +0 | — | Governance constants & registry internalized |

## Export Category Summary

| Category | Count | Δ | Notes |
|----------|-------|---|-------|
| core | 13 | -2 | Stable target ≤5 |
| util | 0 | +0 | Helper functions |
| tool | 0 | -3 | Dev-only (excluded from surface gate) |
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
- **Nodes:** 57 (±0)
- **Edges:** +0 / -0
- **Max fan-in:** src/orchestrator/core-orchestrator.ts (5) (unchanged)
- **Cycles:** 0 (score 0)
- **Graph hash:** 4d568e77...

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
  "timestamp": "2025-07-21T03:42:45.898Z",
  "tsErrors": 0,
  "eslintErrors": 0,
  "cycles": [],
  "graphHash": "4d568e77",
  "netLines": 190,
  "filesChanged": 4
}
```

</details>
