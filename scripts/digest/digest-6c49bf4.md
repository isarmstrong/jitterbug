# Jitterbug Semantic Digest – 2025-07-20

## Commit Context
- **Current commit:** `6c49bf49abb7bd97f49d066a5f5fed257eee9101`
- **Branch:** `main`
- **Comparing since:** `HEAD~1`
- **Generated:** 2025-07-20T01:31:40.273Z
- **Last commit:** chore(stabilize): reduce TS errors 46→0, add schema registry, prune exports

## Summary
- **19 files changed** (+1176 / -1265 lines, net -89)
- **4 new modules:** src/browser/branded-types.ts, src/browser/public.ts, src/browser/schema-registry.ts...
- **Public surface:** +32 exports

## Risk Heuristics
⚠️  **Risk thresholds exceeded:**
- **API surface inflation:** +32 exports (threshold: >10)
- **Large changeset:** 19 files modified (threshold: >10)

## API Surface Drift
**Impact:** +32 / -3 exports

| Symbol | Status | File | Change Type |
|--------|--------|------|-------------|
| `initializeJitterbug` | removed | src/browser/index.ts | Breaking |
| `ensureJitterbugReady` | removed | src/browser/index.ts | Breaking |
| `emitJitterbugEvent` | removed | src/browser/index.ts | Breaking |
| `ISODateString` | added | src/browser/branded-types.ts | Additive |
| `PlanHash` | added | src/browser/branded-types.ts | Additive |
| `StepId` | added | src/browser/branded-types.ts | Additive |
| `BranchName` | added | src/browser/branded-types.ts | Additive |
| `EventId` | added | src/browser/branded-types.ts | Additive |
| `QuarantinedPayload` | added | src/browser/branded-types.ts | Additive |
| `StepId` | added | src/browser/branded-types.ts | Additive |
| `PlanHash` | added | src/browser/branded-types.ts | Additive |
| `BranchName` | added | src/browser/branded-types.ts | Additive |
| `EventId` | added | src/browser/branded-types.ts | Additive |
| ... | ... | ... | +22 more changes |

## Export Changes
**Added (32):**
- `ISODateString` in src/browser/branded-types.ts
- `PlanHash` in src/browser/branded-types.ts
- `StepId` in src/browser/branded-types.ts
- `BranchName` in src/browser/branded-types.ts
- `EventId` in src/browser/branded-types.ts
- ... and 27 more
**Removed (3):**
- `initializeJitterbug` from src/browser/index.ts
- `ensureJitterbugReady` from src/browser/index.ts
- `emitJitterbugEvent` from src/browser/index.ts

## Public API Drift
| Symbol | Status | Cat | Hash (old→new) | Notes |
|--------|--------|-----|----------------|-------|
| `ISODateString` | new | core | 1f513e60 | — |
| `PlanHash` | new | util | 109a3803 | — |
| `StepId` | new | util | 6b768693 | — |
| `BranchName` | new | util | ee11a73 | — |
| `EventId` | new | util | 3f4e41a9 | — |
| `QuarantinedPayload` | new | core | 3a055120 | — |
| `quarantine` | new | core | 558f97aa | — |
| `isValidStepId` | new | core | 746f8f5b | — |
| `isValidPlanHash` | new | core | 6bfbcb49 | — |
| `isValidBranchName` | new | core | 35838328 | — |
| `initializeJitterbug ` | new | util | 1390a320 | — |
| `ensureJitterbugReady, emitJitterbugEvent ` | new | util | 79568a28 | — |
| `EventSchema` | new | core | 2fb4218e | — |
| `StepStartedPayload` | new | core | 3f53e0be | — |
| `StepCompletedPayload` | new | core | 5f327730 | — |
| ... | ... | ... | ... | +14 more changes |

## Event Coverage
- **Defined critical functions:** 5
- **Instrumented functions:** 0 (0%)
- **Missing instrumentation:** createExecutionPlan, executePlan, dispatchStep, finalizePlan, processLog
- **Target coverage:** ≥90% (⚠️)

## Graph Delta
- **Nodes:** 18 (±0)
- **Edges:** +0 / -0
- **Max fan-in:** src/orchestrator/core-orchestrator.ts (5) (unchanged)
- **Cycles:** 0 (score 0)
- **Graph hash:** 1ed3f715...

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
  "timestamp": "2025-07-20T01:31:40.273Z",
  "tsErrors": 0,
  "eslintErrors": 0,
  "cycles": [],
  "graphHash": "1ed3f715",
  "netLines": -89,
  "filesChanged": 19
}
```

</details>
