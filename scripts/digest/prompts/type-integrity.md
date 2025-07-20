# Type System Integrity & Branded Safety Review Prompt

**Use When**: Evaluate type rigor, detect erosion (any/unknown), propose branding & validation upgrades.

**Required Input Sections**:
- DIGEST_META
- TYPE_ERROR_BREAKDOWN
- HEALTH_METRICS

**Optional Context**:
- NEW_EXPORTS_EXCERPTS
- BRANDED_TYPES_USAGE

---

## Prompt Template

```
You are performing a TYPE SYSTEM INTEGRITY & BRANDED SAFETY REVIEW of the Jitterbug commit.

CONTEXT: Focus on type safety erosion, unknown/any usage, and opportunities for branded type enforcement. Reference specific error codes and symbol names.

OBJECTIVE: Evaluate type rigor, detect erosion, and propose branding & validation upgrades.

MATERIALS:
{{DIGEST_META}}

{{TYPE_ERROR_BREAKDOWN}}

{{HEALTH_METRICS}}

{{NEW_EXPORTS_EXCERPTS}}

OUTPUT (Markdown):

## 1. Type Health Score
**Score**: [0-100] - **Current TS Errors**: [count]

**Health Indicators**:
- TS Error Trend: [direction and velocity]
- Unknown/Any Usage: [assessment]
- Branded Type Coverage: [percentage]

## 2. Error Category Breakdown
| Category | Count | Fix Priority | Rationale |
|----------|-------|--------------|-----------|
| Missing types/implicit any | | | |
| Assignability issues | | | |
| Module resolution | | | |
| Unused/unreachable | | | |
| **Total** | | | |

## 3. Top 5 "Type Holes"
| Location | Risk Level | Exploit Scenario | Fix Approach |
|----------|------------|------------------|--------------|
| | | | |

## 4. Recommended Branded Types
| Concept | Proposed Type | Constructor | Runtime Validation |
|---------|---------------|-------------|-------------------|
| | | | |

## 5. Quick Wins (≤15m fixes)
| Issue | Location | Fix | Impact |
|-------|----------|-----|--------|
| | | | |

## 6. Structural Refactors (≥1h but high ROI)
| Refactor | Scope | Benefit | Risk |
|----------|-------|---------|------|
| | | | |

## 7. Migration Plan
**Ordered steps to move from current to hardened state:**

1. **Phase 1** (Immediate): [List actions]
2. **Phase 2** (Next commit): [List actions]  
3. **Phase 3** (Future): [List actions]

**Success Metrics**: [How to measure completion]
```

## Expected Output Structure

- **Health Score**: Quantitative type safety assessment
- **Error Analysis**: Categorized breakdown with fix priorities
- **Type Holes**: Specific vulnerabilities with exploit scenarios  
- **Branded Types**: Concrete proposals with implementation approach
- **Migration Plan**: Phased approach with success metrics