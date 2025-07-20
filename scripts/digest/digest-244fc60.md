# Jitterbug Semantic Digest – 2025-07-20

## Commit Context
- **Current commit:** `244fc6077d567333bf93f1a7d1b0bc184464fe1a`
- **Branch:** `main`
- **Comparing since:** `HEAD~1`
- **Generated:** 2025-07-20T02:57:01.454Z
- **Last commit:** chore(reorganize): move digest tools to prevent build conflicts

## Summary
- **10 files changed** (+362 / -18 lines, net +344)
- **Public surface:** +2 exports (DigestGenerator, DomainSnapshotGenerator)

## Risk Heuristics
✅ All heuristics under thresholds (risk: low)
- Commit LOC ≤ 500? ✅ (+344)
- Public export growth ≤ 10? ✅ (+2)
- Type errors = 0? ✅ (0)
- New cycles = 0? ✅ (0)

## API Surface Drift
**Impact:** +2 / -0 exports

| Symbol | Status | File | Change Type |
|--------|--------|------|-------------|
| `DigestGenerator` | added | scripts/digest-tools/generate-digest.ts | Additive |
| `DomainSnapshotGenerator` | added | scripts/digest-tools/generate-domain-snapshot.ts | Additive |

## Export Changes
**Added (2):**
- `DigestGenerator` in scripts/digest-tools/generate-digest.ts
- `DomainSnapshotGenerator` in scripts/digest-tools/generate-domain-snapshot.ts

## Public API Drift
| Symbol | Status | Cat | Hash (old→new) | Notes |
|--------|--------|-----|----------------|-------|
| `DigestGenerator ` | new | util | 1e583000 | — |
| `DomainSnapshotGenerator ` | new | util | 4ab2c580 | — |
| `DigestGenerator ` | removed | util | 1e583000 | Breaking |
| `DomainSnapshotGenerator ` | removed | util | 4ab2c580 | Breaking |

## Event Coverage
| Scope | Instrumented / Total | Percent |
|-------|----------------------|---------|
| runtime-core | 1 / 5 | 20% ⚠️ |
| debugger-lifecycle | 5 / 5 | 100% ✅ |
| **Overall (weighted)** | **60%** | ⚠️ |

**Scope Details:**
- **Runtime-core instrumented:** processLog
- **Runtime-core missing:** createExecutionPlan, executePlan, dispatchStep, finalizePlan
- **Debugger-lifecycle instrumented:** initialize, registerBranch, unregisterBranch, shutdown, processLog

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
  "timestamp": "2025-07-20T02:57:01.454Z",
  "tsErrors": 0,
  "eslintErrors": 0,
  "cycles": [],
  "graphHash": "1ed3f715",
  "netLines": 344,
  "filesChanged": 10
}
```

</details>
