# Triage + Action Review Prompt (Swiss Army Knife)

**Use When**: Quick comprehensive review covering structural risks, hygiene tasks, and fast wins.

**Required Input Sections**:
- DIGEST_META
- API_DRIFT_TABLE
- HEALTH_METRICS

**Optional Context**:
- RECENT_DIFF
- TIME_CONSTRAINTS

---

## Prompt Template

```
You are performing a TRIAGE + ACTION REVIEW of the Jitterbug commit.

CONTEXT: Provide rapid assessment across structural, hygiene, and quick-win dimensions. Each item must include concrete evidence and actionable steps.

OBJECTIVE: Identify top risks and opportunities with specific actions.

MATERIALS:
{{DIGEST_META}}

{{API_DRIFT_TABLE}}

{{HEALTH_METRICS}}

{{RECENT_DIFF}}

OUTPUT (Markdown):

## Top 3 Structural Risks
Keep each item: **Title** – *Evidence* – **Action**

1. **[Risk Title]** – *[Specific evidence from digest]* – **[Concrete action with effort estimate]**
2. **[Risk Title]** – *[Specific evidence from digest]* – **[Concrete action with effort estimate]**  
3. **[Risk Title]** – *[Specific evidence from digest]* – **[Concrete action with effort estimate]**

## Top 3 Hygiene Tasks  
1. **[Task Title]** – *[Evidence]* – **[Action]**
2. **[Task Title]** – *[Evidence]* – **[Action]**
3. **[Task Title]** – *[Evidence]* – **[Action]**

## Top 3 Fast Wins (≤15 minutes each)
1. **[Win Title]** – *[Evidence]* – **[Action]**
2. **[Win Title]** – *[Evidence]* – **[Action]**
3. **[Win Title]** – *[Evidence]* – **[Action]**

## One Bold Refactor Proposal (Optional)
**[Refactor Title]** – *[Evidence for need]* – **[High-impact change with scope]**

**Risk/Benefit**: [Clear trade-off analysis]
**Timeline**: [Effort estimate]
```

## Expected Output Structure

- **Evidence-Based**: Every item cites specific digest data
- **Action-Oriented**: Concrete next steps, not abstract advice
- **Effort-Aware**: Quick wins vs structural changes clearly separated
- **Risk-Balanced**: Bold proposal includes risk assessment