# Prompt Quality Enforcement (Meta Prompt)

**Use When**: Validate review completeness and enforce evidence-based standards.

**Required Input Sections**:
- REVIEW_TEXT_TO_EVALUATE

---

## Prompt Template

```
You are EVALUATING THE QUALITY of a review response.

OBJECTIVE: Enforce evidence-based review standards and reject low-quality responses.

REVIEW TEXT TO EVALUATE:
{{REVIEW_TEXT_TO_EVALUATE}}

QUALITY STANDARDS:
- Required sections present (Executive Summary, Risk Table, Actions)
- >80% of recommendations include specific evidence 
- Concrete language (symbol names, file paths, error codes)
- No generic advice without digest citations
- Risk levels and effort estimates provided

OUTPUT (Markdown):

## Review Quality Assessment

### Missing Required Sections
- [ ] Executive Summary/Verdict
- [ ] Risk Assessment Table  
- [ ] Concrete Actions
- [ ] Evidence Citations
- [ ] [Other missing sections]

### Evidence Quality Analysis
**Recommendations With Evidence**: [X/Y] ([percentage]%)

**Generic Language Instances** (quote them):
- "[Quote generic advice without evidence]"
- "[Quote generic advice without evidence]"

**Concrete Evidence Examples**:
- "[Quote specific evidence-based recommendation]"
- "[Quote specific evidence-based recommendation]"

### Quality Score
**Score**: [0-100]

**Scoring Breakdown**:
- Required sections: [X/Y] points
- Evidence percentage: [percentage]% = [points]
- Concrete language: [assessment] = [points]
- Actionability: [assessment] = [points]

### Verdict
**ACCEPT** ✅ (Score ≥70) / **REJECT** ❌ (Score <70)

**If REJECT**: 
```
REVIEW REJECTION – Please re-run with concrete evidence per section.

Missing: [List specific gaps]
Required: [List what must be added]
```

**If ACCEPT**:
Quality standards met. Review provides actionable, evidence-based recommendations.
```

## Expected Output Structure

- **Objective Assessment**: Quantitative scoring against standards
- **Specific Gaps**: Concrete missing elements, not general complaints
- **Binary Decision**: Clear accept/reject with threshold
- **Actionable Feedback**: Specific improvements needed for resubmission