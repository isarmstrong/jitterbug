# Jitterbug Semantic Digest – 2025-07-21

**Digest Format:** v1.2
**Integrity Hash:** 4c13adb7a _(compare next digest for unexpected baseline drift)_

## Commit Context
- **Current commit:** `6e93c46294c0bb6d2931402221eb0287051d1c10`
- **Branch:** `main`
- **Comparing since:** `HEAD~1`
- **Generated:** 2025-07-21T08:25:39.411Z
- **Last commit:** feat(security): P4.3 P4.4-a Frame HMAC signing plumbing

## Summary
- **6 files changed** (+702 / -3 lines, net +699)
- **2 new modules:** src/hub/security/hmacSigner.ts, src/hub/security/signed-frame.ts
- **Public surface:** +11 exports

## Risk Heuristics
⚠️  **Risk thresholds exceeded:**
- **Large commit:** +699 lines (threshold: >500)
- **API surface inflation:** +11 exports (threshold: >10)

## API Surface Drift
**Impact:** +11 / -0 exports

| Symbol | Status | File | Change Type |
|--------|--------|------|-------------|
| `SignedPushFrame` | added | src/hub/security/hmacSigner.ts | Additive |
| `FrameSigner` | added | src/hub/security/hmacSigner.ts | Additive |
| `FrameVerifier` | added | src/hub/security/hmacSigner.ts | Additive |
| `HmacConfig` | added | src/hub/security/hmacSigner.ts | Additive |
| `DEFAULT_HMAC_CONFIG` | added | src/hub/security/hmacSigner.ts | Additive |
| `createHmacSigner` | added | src/hub/security/hmacSigner.ts | Additive |
| `parseHmacKeys` | added | src/hub/security/hmacSigner.ts | Additive |
| `SignedPushFrame` | added | src/hub/security/signed-frame.ts | Additive |
| `SecurityConfig` | added | src/hub/security/signed-frame.ts | Additive |
| `DEFAULT_SECURITY_CONFIG` | added | src/hub/security/signed-frame.ts | Additive |
| ... | ... | ... | +1 more changes |

## Export Changes
**Added (11):**
- `SignedPushFrame` in src/hub/security/hmacSigner.ts
- `FrameSigner` in src/hub/security/hmacSigner.ts
- `FrameVerifier` in src/hub/security/hmacSigner.ts
- `HmacConfig` in src/hub/security/hmacSigner.ts
- `DEFAULT_HMAC_CONFIG` in src/hub/security/hmacSigner.ts
- ... and 6 more

## Public API Drift
| Symbol | Status | Cat | Hash (old→new) | Notes |
|--------|--------|-----|----------------|-------|
| `PushAdapter` | changed | core | 780939a→13b7afb3 | — |
| `PushOrchestratorConfig` | changed | core | 5e058386→725babab | — |
| `DEFAULT_ORCHESTRATOR_CONFIG` | changed | util | 72ec5261→2f65bfa2 | — |
| `PushOrchestratorV2` | changed | core | 60fdf45→525479f3 | — |
| `SignedPushFrame` | new | core | 37c53e40 | — |
| `FrameSigner` | new | core | 4bfe291b | — |
| `FrameVerifier` | new | core | 20645544 | — |
| `HmacConfig` | new | core | 978cfb7 | — |
| `DEFAULT_HMAC_CONFIG` | new | util | 6f8c66d | — |
| `createHmacSigner` | new | core | 7748543b | — |
| `parseHmacKeys` | new | core | 1ba36b92 | — |
| `SignedPushFrame` | new | core | 2c5a025a | — |
| `SecurityConfig` | new | core | 5b258ba8 | — |
| `DEFAULT_SECURITY_CONFIG` | new | util | 10d7932b | — |
| `isSignedFrame` | new | core | 1fe14359 | — |

## Stability Tier Summary

| Tier | Count | Δ | Gate | Notes |
|------|-------|---|---------|-------|
| stable | 2 | +0 | ✅ (≤5) | initializeJitterbug, ensureJitterbugReady |
| experimental | 2 | +0 | ✅ (≤5) | experimentalSafeEmit, emitJitterbugEvent |
| internal | 0 | +0 | — | Governance constants & registry internalized |

## Export Category Summary

| Category | Count | Δ | Notes |
|----------|-------|---|-------|
| core | 13 | +9 | Stable target ≤5 |
| util | 0 | +2 | Helper functions |
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
| Export Growth | Δ exports ≤ +3 per commit | ❌ fail |
| Internalization Justification | Each removed symbol mapped in Moves table | ✅ pass |
| Schema Required Set | ≥90% | ✅ pass |

## Action Queue (Auto-Generated)

1. Reduce export growth by 8 exports

## Graph Delta
- **Nodes:** 79 (±0)
- **Edges:** +0 / -0
- **Max fan-in:** src/orchestrator/core-orchestrator.ts (5) (unchanged)
- **Cycles:** 0 (score 0)
- **Graph hash:** 5b8bef2e...

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
  "timestamp": "2025-07-21T08:25:39.411Z",
  "tsErrors": 0,
  "eslintErrors": 0,
  "cycles": [],
  "graphHash": "5b8bef2e",
  "netLines": 699,
  "filesChanged": 6
}
```

</details>
