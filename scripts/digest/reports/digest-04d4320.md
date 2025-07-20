# Jitterbug Semantic Digest – 2025-07-20

**Digest Format:** v1.2
**Integrity Hash:** 4c13adb7a _(compare next digest for unexpected baseline drift)_

## Commit Context
- **Current commit:** `04d4320af64d3403ef776a98f959f9e6541f5c46`
- **Branch:** `main`
- **Comparing since:** `HEAD~1`
- **Generated:** 2025-07-20T04:14:06.806Z
- **Last commit:** feat(testing): Surface contraction + advanced vitest patterns

## Summary
- **9 files changed** (+820 / -214 lines, net +606)
- **2 new modules:** src/browser/__tests__/fixtures.ts, src/browser/__tests__/setup.ts
- **Public surface:** +10 exports

## Risk Heuristics
⚠️  **Risk thresholds exceeded:**
- **Large commit:** +606 lines (threshold: >500)

## API Surface Drift
**Impact:** +10 / -9 exports

| Symbol | Status | File | Change Type |
|--------|--------|------|-------------|
| `BranchName` | removed | src/browser/branch-manager.ts | Breaking |
| `ISODateString` | removed | src/browser/branch-manager.ts | Breaking |
| `BranchOptions` | removed | src/browser/branch-manager.ts | Breaking |
| `BranchRecord` | removed | src/browser/branch-manager.ts | Breaking |
| `BranchSummary` | removed | src/browser/branch-manager.ts | Breaking |
| `TestBranchOptions` | added | src/browser/__tests__/fixtures.ts | Additive |
| `TestBranchData` | added | src/browser/__tests__/fixtures.ts | Additive |
| `testBranches` | added | src/browser/__tests__/fixtures.ts | Additive |
| `invalidBranchNames` | added | src/browser/__tests__/fixtures.ts | Additive |
| `validEdgeCaseBranchNames` | added | src/browser/__tests__/fixtures.ts | Additive |
| `createTestBranchSet` | added | src/browser/__tests__/fixtures.ts | Additive |
| `expectedErrors` | added | src/browser/__tests__/fixtures.ts | Additive |
| `createBranchHierarchy` | added | src/browser/__tests__/fixtures.ts | Additive |
| `createEventCapture` | added | src/browser/__tests__/fixtures.ts | Additive |
| `experimentalBranches` | added | src/browser/branch-manager.ts | Additive |
| ... | ... | ... | +4 more changes |

## Export Changes
**Added (10):**
- `TestBranchOptions` in src/browser/__tests__/fixtures.ts
- `TestBranchData` in src/browser/__tests__/fixtures.ts
- `testBranches` in src/browser/__tests__/fixtures.ts
- `invalidBranchNames` in src/browser/__tests__/fixtures.ts
- `validEdgeCaseBranchNames` in src/browser/__tests__/fixtures.ts
- ... and 5 more
**Removed (9):**
- `BranchName` from src/browser/branch-manager.ts
- `ISODateString` from src/browser/branch-manager.ts
- `BranchOptions` from src/browser/branch-manager.ts
- `BranchRecord` from src/browser/branch-manager.ts
- `BranchSummary` from src/browser/branch-manager.ts

## Public API Drift
| Symbol | Status | Cat | Hash (old→new) | Notes |
|--------|--------|-----|----------------|-------|
| `BranchName` | moved | core | 1a7dc82e→4de3c5c0 | Moved from src/browser/branch-manager.ts |
| `ISODateString` | moved | core | 51a0c20f→1f513e60 | Moved from src/browser/branch-manager.ts |
| `BranchEvent` | moved | core | 49e26c48→1e53c719 | Moved from src/browser/branch-manager.ts |
| `experimentalBranches` | new | util | 1d48944e | — |
| `BranchOptions` | removed | core | 37ba1d11 | Breaking removal |
| `BranchRecord` | removed | core | 5a32fc7b | Breaking removal |
| `BranchSummary` | removed | core | 2b175f09 | Breaking removal |
| `BranchDetails` | removed | core | 72a44713 | Breaking removal |
| `BranchManager` | removed | core | 3841976b | Breaking removal |
| `branchManager` | removed | util | 51243d10 | Breaking removal |

## Stability Tier Summary

| Tier | Count | Δ | Gate | Notes |
|------|-------|---|---------|-------|
| stable | 2 | +0 | ✅ (≤5) | initializeJitterbug, ensureJitterbugReady |
| experimental | 2 | +0 | ✅ (≤5) | experimentalSafeEmit, emitJitterbugEvent |
| internal | 0 | +0 | — | Governance constants & registry internalized |

## Export Category Summary

| Category | Count | Δ | Notes |
|----------|-------|---|-------|
| core | 12 | -7 | Stable target ≤5 |
| util | 0 | -1 | Helper functions |
| tool | 0 | +9 | Dev-only (excluded from surface gate) |
| internalized (this commit) | 0 | +0 | Formerly public; now internal |

## Moves & Internalizations

| Symbol | Old Path | New Status | Rationale |
|--------|----------|-----------|-----------||
| BranchName | src/browser/branch-manager.ts | moved → src/browser/branded-types.ts | File reorganization |
| ISODateString | src/browser/branch-manager.ts | moved → src/browser/branded-types.ts | File reorganization |
| BranchEvent | src/browser/branch-manager.ts | moved → src/orchestrator/types.ts | File reorganization |

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
- **Symbol moves/internalizations:** 3 changes
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

1. Map 6 unmapped symbol removals

## Graph Delta
- **Nodes:** 27 (±0)
- **Edges:** +0 / -0
- **Max fan-in:** src/orchestrator/core-orchestrator.ts (5) (unchanged)
- **Cycles:** 0 (score 0)
- **Graph hash:** 35d366f4...

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
  "timestamp": "2025-07-20T04:14:06.806Z",
  "tsErrors": 0,
  "eslintErrors": 0,
  "cycles": [],
  "graphHash": "35d366f4",
  "netLines": 606,
  "filesChanged": 9
}
```

</details>
