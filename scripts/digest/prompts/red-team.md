# Red-Team / Adversarial Review Prompt

**Use When**: Stress-test design & assumptions, expose hidden risks and design fragility.

**Required Input Sections**:
- DIGEST_META_AND_METRICS
- API_DRIFT_TABLE  
- EVENT_COVERAGE
- TYPE_ERROR_BREAKDOWN (if any)

**Optional Context**:
- PREVIOUS_REVIEW
- CLAUDE_ASSESSMENT
- CUSTOM_CONCERNS

---

## Prompt Template

```
You are performing an ADVERSARIAL RED-TEAM REVIEW of the Jitterbug commit.

CONTEXT PROVIDED:
1. Digest Meta & Metrics (LOC, exports, TS errors, graph hash, risk heuristics)
2. API Drift Table (if present) 
3. Event Coverage
4. Type Error Breakdown (if any)
5. Recent Diff (optional)
6. Goals / Intent (optional)

INSTRUCTIONS: Treat the digest as authoritative; do not hallucinate unstated modules. If information is missing, request it explicitly. Use evidence-driven reasoning referencing sections ("API Drift row: emitJitterbugEvent"). Prefer concise ranked lists over prose walls. Provide Risk Level (Critical/High/Medium/Low/Info) + Action + Effort (S/M/L) for each recommendation.

OBJECTIVE: Expose hidden risks, design fragility, premature abstractions, missing guardrails.

MATERIALS:
{{DIGEST_META_AND_METRICS}}

{{API_DRIFT_TABLE}}

{{EVENT_COVERAGE}}

{{TYPE_ERROR_BREAKDOWN}}

{{PREVIOUS_REVIEW}}

{{CLAUDE_ASSESSMENT}}

OUTPUT (Markdown):

## 1. Executive Verdict
**Status**: [GREEN/AMBER/RED] - [one-line rationale]

## 2. Top 5 Critical Risks
| Risk | Evidence | Impact | Action | Effort |
|------|----------|--------|--------|--------|
| | | | | |

## 3. Silent Failure Vectors
[Things that could fail without obvious noise]

## 4. Attack Surfaces / Misuse Scenarios  
[Console misuse, race conditions, poisoning]

## 5. Invariant Gaps
[Which invariants must be declared NOW]

## 6. Debt Accretion Forecast
[What becomes expensive if postponed 1–2 sprints]

## 7. Disagreements With Prior Assessments
[Cite each claim and rebut with evidence]

## 8. 72-Hour Action Plan
[Ordered list that must reduce risk >80% of identified critical issues]

Be decisive. If data is missing, list "MISSING: <item>" instead of guessing.
```

## Expected Output Structure

- **Executive Verdict**: Traffic light status with specific rationale
- **Risk Table**: Structured assessment with effort estimates
- **Attack Vectors**: Specific misuse scenarios, not generic security advice
- **Action Plan**: Concrete steps with 72-hour time constraint
- **Evidence Citations**: Every claim references digest sections or line numbers