# Jitterbug Review Prompt Pack

Structured prompts for evidence-driven code review across multiple dimensions. Each prompt is optimized for a specific review modality and designed to be copy-paste ready with digest data.

## Quick Start

```bash
# Generate a review request for red-team analysis
./generate-review.sh red-team digest-6c49bf4.md > review-request.txt

# Run API stability review
./generate-review.sh api-stability digest-6c49bf4.md

# Generate state-of-play summary for stakeholders
./generate-review.sh executive digest-6c49bf4.md
```

## Available Prompts

### Core Set (Recommended for early-phase development)

1. **red-team.md** - Adversarial stress-testing of design & assumptions
2. **api-stability.md** - Public API hygiene & surface control
3. **type-integrity.md** - Type system rigor & branded safety
4. **observability.md** - Event coverage & instrumentation quality
5. **stabilization-sprint.md** - Multi-commit cleanup planning

### Specialized Prompts

6. **dependency-graph.md** - Architectural layering & cycle prevention
7. **error-taxonomy.md** - Error handling completeness & resilience
8. **performance.md** - Early performance risk assessment
9. **security.md** - Misuse vectors & hardening
10. **test-strategy.md** - Test coverage planning
11. **dx-maintainability.md** - Developer experience optimization
12. **documentation.md** - API discoverability audit
13. **release-gate.md** - Versioning & ship readiness
14. **risk-regression.md** - Post-cleanup validation
15. **executive.md** - Non-technical stakeholder summary

### Meta Prompts

16. **triage-action.md** - Swiss army knife review
17. **prompt-quality.md** - Review quality enforcement
18. **micro-diff.md** - Rapid patch review (<300 LOC)

## Shared Conventions

All prompts follow these conventions:

- **Evidence-driven**: Recommendations must cite digest sections
- **Structured output**: Consistent format for comparable results
- **Risk-ranked**: Critical/High/Medium/Low + Action + Effort (S/M/L)
- **Concrete**: No generic advice without specific symbol/event/metric references

## Input Requirements

Each prompt specifies required digest sections:

- `DIGEST_META` - Commit context, LOC changes, file counts
- `API_DRIFT_TABLE` - Export additions/removals with categorization
- `EVENT_COVERAGE` - Instrumentation metrics and gaps
- `TYPE_ERROR_BREAKDOWN` - Classification of TypeScript errors
- `HEALTH_METRICS` - TS errors, lint errors, TODOs
- `GRAPH_DELTA` - Dependency graph changes and hotspots

## Template System

Prompts use placeholder syntax:
- `{{DIGEST_META}}` - Required sections
- `{{API_DRIFT_TABLE?}}` - Optional sections
- `{{CUSTOM_CONTEXT}}` - User-provided context

## Output Formats

All prompts produce structured markdown with:
- Executive summary (traffic light + rationale)
- Evidence table (Risk | Evidence | Impact | Action | Effort)
- Actionable recommendations ranked by priority
- Specific next steps with effort estimates

## Quality Gates

Use `prompt-quality.md` to validate review completeness:
- Required sections present
- Evidence percentage (target: >80%)
- Concrete language vs generic advice
- Scoring (0-100, reject if <70)