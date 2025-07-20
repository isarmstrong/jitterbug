# Executive Summary Review Prompt

**Use When**: Generate non-technical stakeholder summary for business context.

**Required Input Sections**:
- DIGEST_META
- API_DRIFT
- EVENT_COVERAGE
- HEALTH_METRICS

**Optional Context**:
- BUSINESS_GOALS
- TIMELINE_CONSTRAINTS

---

## Prompt Template

```
You are creating an EXECUTIVE SUMMARY for the Jitterbug commit.

CONTEXT: Generate a business-focused summary for non-technical stakeholders. Avoid jargon, focus on impact and risk in business terms.

OBJECTIVE: Executive-level summary in plain English (200 words max).

MATERIALS:
{{DIGEST_META}}

{{API_DRIFT}}

{{EVENT_COVERAGE}}

{{HEALTH_METRICS}}

{{BUSINESS_GOALS}}

OUTPUT (Plain English, 200 words max):

## Executive Summary

### What Changed
[1-2 sentences describing the work completed]

### Current Health  
**Status**: 🟢 Green / 🟡 Amber / 🔴 Red

[Brief rationale for status]

### Key Risks (≤3)
1. **[Risk Name]**: [Business impact in non-technical terms]
2. **[Risk Name]**: [Business impact in non-technical terms]  
3. **[Risk Name]**: [Business impact in non-technical terms]

### Next 2 Actions & Expected Benefit
1. **[Action]**: [Business benefit]
2. **[Action]**: [Business benefit]

### Timeline Impact
[Any effects on delivery schedule or milestones]

### Resource Requirements
[Any additional resources needed]
```

## Expected Output Structure

- **Plain English**: No code terminology or technical jargon
- **Business Impact**: Risks and benefits in business terms
- **Action-Oriented**: Clear next steps with expected outcomes
- **Concise**: Maximum 200 words for executive attention spans
- **Status Clear**: Unambiguous health assessment