# Stabilization Sprint Planning Prompt

**Use When**: Produce a 2-commit stabilization plan after a large feature drop.

**Required Input Sections**:
- DIGEST_META
- TYPE_ERROR_BREAKDOWN  
- API_DRIFT_TABLE
- HEALTH_METRICS

**Optional Context**:
- PREVIOUS_STABILIZATION_EFFORT
- TECHNICAL_DEBT_BACKLOG

---

## Prompt Template

```
You are creating a STABILIZATION SPRINT PLAN for the Jitterbug commit.

CONTEXT: Large feature drop requires systematic stabilization across 2 focused commits. Prioritize type safety, export hygiene, and test coverage.

OBJECTIVE: Produce a 2-commit stabilization plan that reduces technical debt and risk by >80%.

MATERIALS:
{{DIGEST_META}}

{{TYPE_ERROR_BREAKDOWN}}

{{API_DRIFT_TABLE}}

{{HEALTH_METRICS}}

{{PREVIOUS_STABILIZATION_EFFORT}}

OUTPUT (Markdown):

## Stabilization Sprint Plan

**Current State Assessment**:
- TypeScript Errors: [count]
- Export Surface: [assessment]
- Test Coverage: [assessment]  
- Risk Level: [HIGH/MEDIUM/LOW]

---

## Commit 1: Foundation Hardening
**Scope**: Type safety + export organization + critical bugs

**Checklist**:
- [ ] Fix TS errors: [specific categories, target count]
- [ ] Implement export barrel pattern: [specific files]
- [ ] Add branded types: [specific types]
- [ ] Schema validation: [specific events]
- [ ] Update test environment: [specific issues]

**Files Modified**: [estimated count]
**Effort**: [S/M/L hours]
**Success Criteria**: 
- TS errors ≤ [target]
- Export duplicates = 0
- Test suite passes

---

## Commit 2: Coverage + Instrumentation  
**Scope**: Event coverage + documentation + quality gates

**Checklist**:
- [ ] Instrument critical functions: [specific functions]
- [ ] Add missing event types: [specific events] 
- [ ] Update payload schemas: [specific schemas]
- [ ] Add quality gates: [specific rules]
- [ ] Documentation updates: [specific files]

**Files Modified**: [estimated count]  
**Effort**: [S/M/L hours]
**Success Criteria**:
- Event coverage ≥ [target]%
- All public APIs documented
- Quality gates enforced

---

## Exit Criteria / Metrics

| Metric | Current | Target | Gate |
|--------|---------|--------|------|
| TS Errors | | 0 | Hard |
| Export Duplicates | | 0 | Hard |
| Event Coverage | | 80% | Soft |
| Test Pass Rate | | 100% | Hard |
| Quarantined Payloads | | ≤3 | Soft |

---

## Rollback Triggers / Safeguards

**Immediate Rollback If**:
- [ ] Test suite failure rate >5%
- [ ] TS error count increases
- [ ] Runtime errors in bootstrap
- [ ] Breaking changes to public API

**Rollback Process**:
1. [Specific git commands]
2. [Verification steps]
3. [Communication plan]

**Risk Mitigation**:
- Feature flags for new validation
- Backward compatibility preservations
- Incremental rollout strategy
```

## Expected Output Structure

- **Current Assessment**: Quantitative baseline 
- **Two-Commit Plan**: Concrete checklists with effort estimates
- **Exit Criteria**: Measurable success definitions with hard/soft gates
- **Rollback Plan**: Specific triggers and recovery procedures
- **Risk Mitigation**: Strategies to minimize stabilization risk