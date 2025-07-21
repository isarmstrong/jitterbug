# Jitterbug Semantic Digest – 2025-07-21

**Digest Format:** v1.2
**Integrity Hash:** 4c13adb7a _(compare next digest for unexpected baseline drift)_

## Commit Context
- **Current commit:** `5937b4bd28ab7867f24301385f66422850c8783f`
- **Branch:** `main`
- **Comparing since:** `HEAD~1`
- **Generated:** 2025-07-21T08:33:49.148Z
- **Last commit:** fix(security): red-team patch plan - export surface + replay protection

## Summary
- **10 files changed** (+977 / -20 lines, net +957)
- **1 new modules:** src/hub/security/index.ts
- **Public surface:** +7 exports

## Risk Heuristics
⚠️  **Risk thresholds exceeded:**
- **Large commit:** +957 lines (threshold: >500)

## API Surface Drift
**Impact:** +7 / -0 exports

| Symbol | Status | File | Change Type |
|--------|--------|------|-------------|
| `FrameSigner` | added | src/hub/security/_internal/hmac.ts | Additive |
| `FrameVerifier` | added | src/hub/security/_internal/hmac.ts | Additive |
| `HmacConfig` | added | src/hub/security/_internal/hmac.ts | Additive |
| `DEFAULT_HMAC_CONFIG` | added | src/hub/security/_internal/hmac.ts | Additive |
| `createHmacSigner` | added | src/hub/security/_internal/hmac.ts | Additive |
| `parseHmacKeys` | added | src/hub/security/_internal/hmac.ts | Additive |
| `createHmacSigner` | added | src/hub/security/index.ts | Additive |

## Export Changes
**Added (7):**
- `FrameSigner` in src/hub/security/_internal/hmac.ts
- `FrameVerifier` in src/hub/security/_internal/hmac.ts
- `HmacConfig` in src/hub/security/_internal/hmac.ts
- `DEFAULT_HMAC_CONFIG` in src/hub/security/_internal/hmac.ts
- `createHmacSigner` in src/hub/security/_internal/hmac.ts
- ... and 2 more

## Public API Drift
| Symbol | Status | Cat | Hash (old→new) | Notes |
|--------|--------|-----|----------------|-------|
| `SignedPushFrame` | moved | core | 37c53e40→2c5a025a | Moved from src/hub/security/hmacSigner.ts |
| `FrameSigner` | moved | core | 4bfe291b→4bfe291b | Moved from src/hub/security/hmacSigner.ts |
| `FrameVerifier` | moved | core | 20645544→20645544 | Moved from src/hub/security/hmacSigner.ts |
| `HmacConfig` | moved | core | 978cfb7→978cfb7 | Moved from src/hub/security/hmacSigner.ts |
| `DEFAULT_HMAC_CONFIG` | moved | util | 6f8c66d→6f8c66d | Moved from src/hub/security/hmacSigner.ts |
| `createHmacSigner` | moved | core | 7748543b→7748543b | Moved from src/hub/security/hmacSigner.ts |
| `parseHmacKeys` | moved | core | 1ba36b92→1ba36b92 | Moved from src/hub/security/hmacSigner.ts |
| `createHmacSigner ` | new | util | 7a05f6c0 | — |

## Stability Tier Summary

| Tier | Count | Δ | Gate | Notes |
|------|-------|---|---------|-------|
| stable | 2 | +0 | ✅ (≤5) | initializeJitterbug, ensureJitterbugReady |
| experimental | 2 | +0 | ✅ (≤5) | experimentalSafeEmit, emitJitterbugEvent |
| internal | 0 | +0 | — | Governance constants & registry internalized |

## Export Category Summary

| Category | Count | Δ | Notes |
|----------|-------|---|-------|
| core | 13 | +6 | Stable target ≤5 |
| util | 0 | +1 | Helper functions |
| tool | 0 | +0 | Dev-only (excluded from surface gate) |
| internalized (this commit) | 0 | +0 | Formerly public; now internal |

## Moves & Internalizations

| Symbol | Old Path | New Status | Rationale |
|--------|----------|-----------|-----------||
| SignedPushFrame | src/hub/security/hmacSigner.ts | moved → src/hub/security/signed-frame.ts | File reorganization |
| FrameSigner | src/hub/security/hmacSigner.ts | moved → src/hub/security/_internal/hmac.ts | File reorganization |
| FrameVerifier | src/hub/security/hmacSigner.ts | moved → src/hub/security/_internal/hmac.ts | File reorganization |
| HmacConfig | src/hub/security/hmacSigner.ts | moved → src/hub/security/_internal/hmac.ts | File reorganization |
| DEFAULT_HMAC_CONFIG | src/hub/security/hmacSigner.ts | moved → src/hub/security/_internal/hmac.ts | File reorganization |

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
- **Symbol moves/internalizations:** 7 changes
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
- **Nodes:** 80 (±0)
- **Edges:** +0 / -0
- **Max fan-in:** src/orchestrator/core-orchestrator.ts (5) (unchanged)
- **Cycles:** 0 (score 0)
- **Graph hash:** 293caebb...

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
  "timestamp": "2025-07-21T08:33:49.148Z",
  "tsErrors": 0,
  "eslintErrors": 0,
  "cycles": [],
  "graphHash": "293caebb",
  "netLines": 957,
  "filesChanged": 10
}
```

</details>
