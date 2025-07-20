# Jitterbug Semantic Digest – 2025-07-20

**Digest Format:** v1.2
**Integrity Hash:** 4c13adb7a _(compare next digest for unexpected baseline drift)_

## Commit Context
- **Current commit:** `c0b14c2ed0e39fe8c98fa75675cf7544169839ef`
- **Branch:** `main`
- **Comparing since:** `HEAD~1`
- **Generated:** 2025-07-20T11:33:28.884Z
- **Last commit:** refactor(sse): surgical export consolidation - eliminate surface explosion

## Summary
- **6 files changed** (+267 / -42 lines, net +225)
- **Public surface:** +6 exports

## Risk Heuristics
✅ All heuristics under thresholds (risk: low)
- Commit LOC ≤ 500? ✅ (+225)
- Public export growth ≤ 10? ✅ (+6)
- Type errors = 0? ✅ (0)
- New cycles = 0? ✅ (0)
- Runtime-core coverage ≥ 60%? ✅ (100%)
- Debugger-lifecycle coverage ≥ 90%? ✅ (100%)

## API Surface Drift
**Impact:** +6 / -9 exports

| Symbol | Status | File | Change Type |
|--------|--------|------|-------------|
| `SSETransportOptions` | removed | src/browser/transports/sse-transport.ts | Breaking |
| `SSETransportController` | removed | src/browser/transports/sse-transport.ts | Breaking |
| `_resetSSETransport` | removed | src/browser/transports/sse-transport.ts | Breaking |
| `experimentalSSETransport` | removed | src/browser/transports/sse-transport.ts | Breaking |
| `SSEClient` | removed | src/browser/transports/sse/log-stream-hub.ts | Breaking |
| `connectSSE` | added | src/browser/transports/sse-transport.ts | Additive |
| `isSSESupported` | added | src/browser/transports/sse-transport.ts | Additive |
| `type BroadcastMessage` | added | src/browser/transports/sse/log-stream-hub.ts | Additive |
| `type SSEEndpointConfig` | added | src/browser/transports/sse/sse-endpoint.ts | Additive |
| `type SSERequest` | added | src/browser/transports/sse/sse-endpoint.ts | Additive |
| `type SSEResponse` | added | src/browser/transports/sse/sse-endpoint.ts | Additive |
| ... | ... | ... | +4 more changes |

## Export Changes
**Added (6):**
- `connectSSE` in src/browser/transports/sse-transport.ts
- `isSSESupported` in src/browser/transports/sse-transport.ts
- `type BroadcastMessage` in src/browser/transports/sse/log-stream-hub.ts
- `type SSEEndpointConfig` in src/browser/transports/sse/sse-endpoint.ts
- `type SSERequest` in src/browser/transports/sse/sse-endpoint.ts
- ... and 1 more
**Removed (9):**
- `SSETransportOptions` from src/browser/transports/sse-transport.ts
- `SSETransportController` from src/browser/transports/sse-transport.ts
- `_resetSSETransport` from src/browser/transports/sse-transport.ts
- `experimentalSSETransport` from src/browser/transports/sse-transport.ts
- `SSEClient` from src/browser/transports/sse/log-stream-hub.ts

## Public API Drift
| Symbol | Status | Cat | Hash (old→new) | Notes |
|--------|--------|-----|----------------|-------|
| `debug` | changed | util | 2df0f472→636244a3 | — |
| `connectSSE, isSSESupported ` | new | util | 6173de56 | — |
| `LogStreamHub, type BroadcastMessage ` | new | util | 6e90fb00 | — |
| `SSEEndpoint, type SSEEndpointConfig, type SSERequest, type SSEResponse ` | new | util | 3d152082 | — |
| `SSETransportOptions` | removed | core | 13d3b3e4 | Breaking removal |
| `SSETransportController` | removed | core | 2215bc8d | Breaking removal |
| `_resetSSETransport` | removed | core | 1ee13fc5 | Breaking removal |
| `experimentalSSETransport` | removed | core | 7ca11060 | Breaking removal |
| `SSEClient` | removed | core | 2a739940 | Breaking removal |
| `BroadcastMessage` | removed | core | 253fdaca | Breaking removal |
| `LogStreamHub` | removed | core | 61c3d2a0 | Breaking removal |
| `SSEEndpointConfig` | removed | core | 1982dce8 | Breaking removal |
| `SSERequest` | removed | core | 11583a5d | Breaking removal |
| `SSEResponse` | removed | core | 7797937f | Breaking removal |
| `SSEEndpoint` | removed | core | 22401b29 | Breaking removal |

## Symbol Moves & Internalizations

| Symbol | Previous Location | New Location/Access | Rationale |
|--------|------------------|---------------------|----------|
| `SSETransportOptions` | src/browser/transports/sse-transport.ts | Internalized (implementation detail) | Encapsulated within module boundary |
| `SSETransportController` | src/browser/transports/sse-transport.ts | Internalized (implementation detail) | Encapsulated within module boundary |
| `_resetSSETransport` | src/browser/transports/sse-transport.ts | Removed (no replacement) | No longer needed in public API |
| `experimentalSSETransport` | src/browser/transports/sse-transport.ts | Removed (no replacement) | No longer needed in public API |
| `SSEClient` | src/browser/transports/sse/log-stream-hub.ts | Internalized (implementation detail) | Encapsulated within module boundary |
| `BroadcastMessage` | src/browser/transports/sse/log-stream-hub.ts | Internalized (implementation detail) | Encapsulated within module boundary |
| `LogStreamHub` | src/browser/transports/sse/log-stream-hub.ts | Internalized (implementation detail) | Encapsulated within module boundary |
| `SSEEndpointConfig` | src/browser/transports/sse/sse-endpoint.ts | Internalized (implementation detail) | Encapsulated within module boundary |
| `SSERequest` | src/browser/transports/sse/sse-endpoint.ts | Internalized (implementation detail) | Encapsulated within module boundary |
| `SSEResponse` | src/browser/transports/sse/sse-endpoint.ts | Internalized (implementation detail) | Encapsulated within module boundary |
| `SSEEndpoint` | src/browser/transports/sse/sse-endpoint.ts | Internalized (implementation detail) | Encapsulated within module boundary |

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
- **Nodes:** 51 (±0)
- **Edges:** +0 / -0
- **Max fan-in:** src/orchestrator/core-orchestrator.ts (5) (unchanged)
- **Cycles:** 0 (score 0)
- **Graph hash:** 2b90f96b...

## Health Metrics
- **TypeScript:** 0 errors
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
  "timestamp": "2025-07-20T11:33:28.884Z",
  "tsErrors": 0,
  "eslintErrors": 0,
  "cycles": [],
  "graphHash": "2b90f96b",
  "netLines": 225,
  "filesChanged": 6
}
```

</details>
