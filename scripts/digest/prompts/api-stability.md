# API Stability & Surface Hygiene Review Prompt

**Use When**: Assess public API stability, detect accidental surface creep, evaluate export hygiene.

**Required Input Sections**:
- DIGEST_META
- PUBLIC_API_DRIFT_TABLE

**Optional Context**:
- DIFF_SNIPPETS
- EXPORT_POLICY

---

## Prompt Template

```
You are performing an API STABILITY & SURFACE HYGIENE REVIEW of the Jitterbug commit.

CONTEXT: Treat the digest as authoritative. Use evidence-driven reasoning referencing specific symbols and drift table rows. Provide Risk Level + Action + Effort for each recommendation.

OBJECTIVE: Assess PUBLIC API stability & hygiene; detect accidental surface creep.

MATERIALS:
{{DIGEST_META}}

{{PUBLIC_API_DRIFT_TABLE}}

{{DIFF_SNIPPETS}}

OUTPUT (Markdown):

## 1. Stability Score
**Score**: [0-100] - **Definition**: 100 = zero unnecessary additions, no breaking patterns

**Rationale**: [Explain scoring based on drift evidence]

## 2. Surface Summary
| Category | Count | % Change | Verdict |
|----------|-------|----------|---------|
| core | | | |
| util | | | |
| types | | | |
| error | | | |
| **Total** | | | |

## 3. Potential Accidental Exports
| Symbol | File | Evidence | Recommendation | Breaking? |
|--------|------|----------|----------------|-----------|
| | | | | |

## 4. Risky Additions
[Changed semantics or ambiguous naming - cite specific symbols]

## 5. Deprecation Candidates
| Symbol | Rationale | Migration Path | Effort |
|--------|-----------|----------------|--------|
| | | | |

## 6. Action Table
| Symbol | Issue | Recommendation | Breaking? | Effort |
|--------|-------|----------------|-----------|--------|
| | | | | |

## 7. Guardrail Suggestions
[Lint rules or build rules to prevent recurrence]

- **Export Policy**: [Barrel pattern, internal keyword, etc.]
- **Naming Convention**: [Enforce consistent patterns]
- **Surface Gates**: [Thresholds and automation]
```

## Expected Output Structure

- **Stability Score**: Quantitative assessment with clear definition
- **Surface Summary**: Categorized export analysis with percentage changes
- **Risk Assessment**: Symbol-specific issues with evidence citations
- **Guardrails**: Concrete automation suggestions to prevent regression