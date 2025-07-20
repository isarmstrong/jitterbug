# Jitterbug Semantic Digest – 2025-07-20

## Commit Context
- **Current commit:** `4bd17f67a1f459ead022f6f7a052dd1b764145d1`
- **Branch:** `main`
- **Comparing since:** `HEAD~1`
- **Generated:** 2025-07-20T01:12:13.236Z
- **Last commit:** feat(digest): implement comprehensive red-team analysis patches

## Summary
- **1 files changed** (+101 / -32 lines, net +69)

## Risk Heuristics
✅ All heuristics under thresholds (risk: low)
- Commit LOC ≤ 500? ✅ (+69)
- Public export growth ≤ 10? ✅ (+0)
- Type errors = 0? ✅ (0)
- New cycles = 0? ✅ (0)

## Event Coverage
- **Defined critical functions:** 5
- **Instrumented functions:** 0 (0%)
- **Missing instrumentation:** createExecutionPlan, executePlan, dispatchStep, finalizePlan, processLog
- **Target coverage:** ≥90% (⚠️)

## Graph Delta
- **Nodes:** 10 (±0)
- **Edges:** +0 / -0
- **Max fan-in:** src/orchestrator/core-orchestrator.ts (5) (unchanged)
- **Cycles:** 0 (score 0)
- **Graph hash:** 1cfa10e3...

## Health Metrics
- **TypeScript:** 0 errors
- **ESLint:** 0 errors
- **TODOs:** 0 items

## 🔒 Locked Decisions (v0.2)
| Decision | Value | Notes |
|----------|-------|---------|
| Hash Algorithm | xxhash64 (plan + domain signatures) | Fast, low collision; upgrade path documented |
| Core Type Names | Plan, Step, Adapter, ExecutionContext | Do not rename without version bump |
| Event Namespace | `orchestrator.<entity>.<verb>` | Examples: `orchestrator.step.started` |
| Error Base Class | `BaseOrchestratorError` | All internal throws extend this |
| Cycle Policy | Fail CI on any new cycle | Introduced cycles require explicit waiver |
| Adapter Registry | Static map with capability metadata | Future DI layer wraps map, not replace |

<details><summary>Machine Data</summary>

```json
{
  "timestamp": "2025-07-20T01:12:13.236Z",
  "tsErrors": 0,
  "eslintErrors": 0,
  "cycles": [],
  "graphHash": "1cfa10e3",
  "netLines": 69,
  "filesChanged": 1
}
```

</details>
