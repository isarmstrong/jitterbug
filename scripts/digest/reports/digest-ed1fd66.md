# Jitterbug Semantic Digest – 2025-07-20

**Digest Format:** v1.2
**Integrity Hash:** 4c13adb7a _(compare next digest for unexpected baseline drift)_

## Commit Context
- **Current commit:** `ed1fd66023d9f2f7112310c839c6181aebf28b89`
- **Branch:** `main`
- **Comparing since:** `HEAD~1`
- **Generated:** 2025-07-20T08:55:14.871Z
- **Last commit:** refactor(transport): consolidate emoji console public surface

## Summary
- **6 files changed** (+336 / -97 lines, net +239)
- **Public surface:** +2 exports (EmojiConsoleController, experimentalEmojiConsole)

## Risk Heuristics
⚠️  **Risk thresholds exceeded:**
- **TypeScript regression:** 2 errors

## API Surface Drift
**Impact:** +2 / -4 exports

| Symbol | Status | File | Change Type |
|--------|--------|------|-------------|
| `createEmojiConsole` | removed | src/browser/transports/emoji-console.ts | Breaking |
| `startEmojiConsole` | removed | src/browser/transports/emoji-console.ts | Breaking |
| `stopEmojiConsole` | removed | src/browser/transports/emoji-console.ts | Breaking |
| `getEmojiConsoleOptions` | removed | src/browser/transports/emoji-console.ts | Breaking |
| `EmojiConsoleController` | added | src/browser/transports/emoji-console.ts | Additive |
| `experimentalEmojiConsole` | added | src/browser/transports/emoji-console.ts | Additive |

## Export Changes
**Added (2):**
- `EmojiConsoleController` in src/browser/transports/emoji-console.ts
- `experimentalEmojiConsole` in src/browser/transports/emoji-console.ts
**Removed (4):**
- `createEmojiConsole` from src/browser/transports/emoji-console.ts
- `startEmojiConsole` from src/browser/transports/emoji-console.ts
- `stopEmojiConsole` from src/browser/transports/emoji-console.ts
- `getEmojiConsoleOptions` from src/browser/transports/emoji-console.ts

## Public API Drift
| Symbol | Status | Cat | Hash (old→new) | Notes |
|--------|--------|-----|----------------|-------|
| `EmojiConsoleController` | new | core | 5bda8160 | — |
| `experimentalEmojiConsole` | new | core | 75d171b3 | — |
| `createEmojiConsole` | removed | core | 4187279d | Breaking removal |
| `startEmojiConsole` | removed | core | 5ecd7202 | Breaking removal |
| `stopEmojiConsole` | removed | core | 7a4a5300 | Breaking removal |
| `getEmojiConsoleOptions` | removed | core | 2f7399b5 | Breaking removal |

## Symbol Moves & Internalizations

| Symbol | Previous Location | New Location/Access | Rationale |
|--------|------------------|---------------------|----------|
| `createEmojiConsole` | src/browser/transports/emoji-console.ts | Internalized (implementation detail) | Encapsulated within module boundary |
| `startEmojiConsole` | src/browser/transports/emoji-console.ts | Removed (no replacement) | No longer needed in public API |
| `stopEmojiConsole` | src/browser/transports/emoji-console.ts | Removed (no replacement) | No longer needed in public API |
| `getEmojiConsoleOptions` | src/browser/transports/emoji-console.ts | Removed (no replacement) | No longer needed in public API |

## Stability Tier Summary

| Tier | Count | Δ | Gate | Notes |
|------|-------|---|---------|-------|
| stable | 2 | +0 | ✅ (≤5) | initializeJitterbug, ensureJitterbugReady |
| experimental | 2 | +0 | ✅ (≤5) | experimentalSafeEmit, emitJitterbugEvent |
| internal | 0 | +0 | — | Governance constants & registry internalized |

## Export Category Summary

| Category | Count | Δ | Notes |
|----------|-------|---|-------|
| core | 13 | -1 | Stable target ≤5 |
| util | 0 | -1 | Helper functions |
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
- **Nodes:** 45 (±0)
- **Edges:** +0 / -0
- **Max fan-in:** src/orchestrator/core-orchestrator.ts (5) (unchanged)
- **Cycles:** 0 (score 0)
- **Graph hash:** 17666177...

## Health Metrics
- **TypeScript:** 2 errors
- **ESLint:** 0 errors
- **TODOs:** 4 items

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
  "timestamp": "2025-07-20T08:55:14.871Z",
  "tsErrors": 2,
  "eslintErrors": 0,
  "cycles": [],
  "graphHash": "17666177",
  "netLines": 239,
  "filesChanged": 6
}
```

</details>
