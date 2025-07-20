# Observability & Event Instrumentation Coverage Review Prompt

**Use When**: Improve event coverage quality, ensure events are semantically rich & future-proof.

**Required Input Sections**:
- EVENT_COVERAGE_SECTION
- KNOWN_CRITICAL_FUNCTIONS_LIST
- CURRENT_EVENT_TYPES

**Optional Context**:
- EVENT_SCHEMA_REGISTRY
- TIMELINE_REQUIREMENTS

---

## Prompt Template

```
You are performing an OBSERVABILITY & EVENT INSTRUMENTATION COVERAGE REVIEW of the Jitterbug commit.

CONTEXT: Focus on event semantic richness, coverage gaps, and instrumentation quality. Reference specific function names and event types.

OBJECTIVE: Improve event coverage quality; ensure events are semantically rich & future-proof.

MATERIALS:
{{EVENT_COVERAGE_SECTION}}

{{KNOWN_CRITICAL_FUNCTIONS_LIST}}

{{CURRENT_EVENT_TYPES}}

{{EVENT_SCHEMA_REGISTRY}}

OUTPUT (Markdown):

## 1. Coverage Summary
**Overall Coverage**: [X/Y functions] ([percentage]%)

| Category | Instrumented | Total | Coverage | Target |
|----------|--------------|-------|----------|--------|
| Core execution | | | | 90% |
| Error handling | | | | 100% |
| State transitions | | | | 80% |
| **Total** | | | | |

## 2. Missing High-Value Events
| Function | Why It Matters | Proposed Event Type | Payload Fields |
|----------|----------------|---------------------|----------------|
| | | | |

## 3. Redundant / Low-Signal Events
| Event Type | Issue | Recommendation | Impact |
|------------|-------|----------------|--------|
| | | | |

## 4. Payload Quality Issues
| Event Type | Current Payload | Issue | Proposed Schema |
|------------|-----------------|-------|-----------------|
| | | | |

## 5. Event Naming Consistency Review
**Namespace Standard**: `orchestrator.<entity>.<verb>`

| Event Type | Violation | Compliant Alternative |
|------------|-----------|----------------------|
| | | |

## 6. Enrichment Opportunities
| Event Type | Missing Fields | Benefit | Implementation |
|------------|---------------|---------|----------------|
| | planHash, branch, stepId | Correlation | Add to schema |
| | | | |

## 7. 3-Step Plan to Reach ≥90% Coverage
**Target**: Meaningful coverage in next two commits

### Step 1: Immediate (This Commit)
- [ ] [Action with specific function names]
- [ ] [Action with specific function names]

### Step 2: Next Commit  
- [ ] [Action with specific function names]
- [ ] [Action with specific function names]

### Step 3: Following Commit
- [ ] [Action with specific function names]
- [ ] [Action with specific function names]

**Success Metrics**: [How to measure completion]
```

## Expected Output Structure

- **Coverage Metrics**: Quantitative assessment by category
- **Gap Analysis**: High-value missing events with justification
- **Quality Issues**: Specific payload and naming problems
- **Action Plan**: Concrete 3-step implementation with function names
- **Enrichment**: Correlation and debugging improvements