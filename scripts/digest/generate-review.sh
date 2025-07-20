#!/bin/bash
set -euo pipefail

# Jitterbug Review Generator
# Generate structured review requests from digest data and prompt templates

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROMPTS_DIR="$SCRIPT_DIR/prompts"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

usage() {
    echo "Usage: $0 <prompt-type> <digest-file> [context-file]"
    echo ""
    echo "Available prompt types:"
    find "$PROMPTS_DIR" -name "*.md" -not -name "README.md" | sort | while read -r file; do
        basename "$file" .md | sed 's/^/  - /'
    done
    echo ""
    echo "Examples:"
    echo "  $0 red-team digest-6c49bf4.md"
    echo "  $0 api-stability digest-6c49bf4.md context.txt"
    echo "  $0 executive digest-latest.md"
    exit 1
}

error() {
    echo -e "${RED}Error: $1${NC}" >&2
    exit 1
}

info() {
    echo -e "${BLUE}Info: $1${NC}" >&2
}

warn() {
    echo -e "${YELLOW}Warning: $1${NC}" >&2
}

success() {
    echo -e "${GREEN}Success: $1${NC}" >&2
}

# Validate inputs
if [[ $# -lt 2 ]]; then
    usage
fi

PROMPT_TYPE="$1"
DIGEST_FILE="$2"
CONTEXT_FILE="${3:-}"

# Validate prompt type exists
PROMPT_FILE="$PROMPTS_DIR/$PROMPT_TYPE.md"
if [[ ! -f "$PROMPT_FILE" ]]; then
    error "Prompt type '$PROMPT_TYPE' not found. Available: $(find "$PROMPTS_DIR" -name "*.md" -not -name "README.md" | xargs -I {} basename {} .md | tr '\n' ' ')"
fi

# Validate digest file exists
if [[ ! -f "$DIGEST_FILE" ]]; then
    error "Digest file '$DIGEST_FILE' not found"
fi

info "Generating $PROMPT_TYPE review from $DIGEST_FILE"

# Extract digest sections
extract_section() {
    local file="$1"
    local section="$2"
    local start_pattern="$3"
    local end_pattern="${4:-^## }"
    
    if ! grep -q "$start_pattern" "$file" 2>/dev/null; then
        return 1
    fi
    
    awk "/$start_pattern/,/$end_pattern/ { if (/$end_pattern/ && !/$start_pattern/) exit; print }" "$file"
}

# Parse digest file
DIGEST_META=""
API_DRIFT_TABLE=""
EVENT_COVERAGE=""
TYPE_ERROR_BREAKDOWN=""
HEALTH_METRICS=""
GRAPH_DELTA=""

info "Parsing digest sections..."

# Extract sections with error handling
if extract_section "$DIGEST_FILE" "DIGEST_META" "^## Commit Context" >/dev/null 2>&1; then
    DIGEST_META=$(extract_section "$DIGEST_FILE" "DIGEST_META" "^## Commit Context")
    DIGEST_META="$DIGEST_META"$'\n\n'$(extract_section "$DIGEST_FILE" "SUMMARY" "^## Summary")
    success "Found digest meta & summary"
else
    warn "No digest meta found"
fi

if extract_section "$DIGEST_FILE" "API_DRIFT" "^## API Surface Drift" >/dev/null 2>&1; then
    API_DRIFT_TABLE=$(extract_section "$DIGEST_FILE" "API_DRIFT" "^## API Surface Drift")
    API_DRIFT_TABLE="$API_DRIFT_TABLE"$'\n\n'$(extract_section "$DIGEST_FILE" "EXPORT_CHANGES" "^## Export Changes")
    success "Found API drift table"
else
    warn "No API drift table found"
fi

if extract_section "$DIGEST_FILE" "EVENT_COVERAGE" "^## Event Coverage" >/dev/null 2>&1; then
    EVENT_COVERAGE=$(extract_section "$DIGEST_FILE" "EVENT_COVERAGE" "^## Event Coverage")
    success "Found event coverage"
else
    warn "No event coverage found"
fi

if extract_section "$DIGEST_FILE" "TYPE_ERROR" "^## Type Error" >/dev/null 2>&1; then
    TYPE_ERROR_BREAKDOWN=$(extract_section "$DIGEST_FILE" "TYPE_ERROR" "^## Type Error")
    success "Found type error breakdown"
fi

if extract_section "$DIGEST_FILE" "HEALTH" "^## Health Metrics" >/dev/null 2>&1; then
    HEALTH_METRICS=$(extract_section "$DIGEST_FILE" "HEALTH" "^## Health Metrics")
    success "Found health metrics"
else
    warn "No health metrics found"
fi

if extract_section "$DIGEST_FILE" "GRAPH" "^## Graph Delta" >/dev/null 2>&1; then
    GRAPH_DELTA=$(extract_section "$DIGEST_FILE" "GRAPH" "^## Graph Delta")
    success "Found graph delta"
fi

# Load custom context if provided
CUSTOM_CONTEXT=""
if [[ -n "$CONTEXT_FILE" && -f "$CONTEXT_FILE" ]]; then
    CUSTOM_CONTEXT=$(cat "$CONTEXT_FILE")
    success "Loaded custom context from $CONTEXT_FILE"
fi

# Generate state-of-play summary
generate_state_summary() {
    local commit_hash=$(echo "$DIGEST_META" | grep -o 'commit.*: `[^`]*`' | cut -d'`' -f2)
    local ts_errors=$(echo "$HEALTH_METRICS" | grep -o 'TypeScript.*: [0-9]*' | grep -o '[0-9]*')
    local files_changed=$(echo "$DIGEST_META" | grep -o '[0-9]* files changed' | grep -o '[0-9]*')
    local net_lines=$(echo "$DIGEST_META" | grep -o 'net [+-][0-9]*' | grep -o '[+-][0-9]*')
    
    cat << EOF
**State-of-Play Summary** (Generated $(date -u +"%Y-%m-%d %H:%M UTC"))

- **Commit**: ${commit_hash:-unknown}
- **Scope**: ${files_changed:-unknown} files changed, ${net_lines:-unknown} net lines
- **Health**: ${ts_errors:-unknown} TS errors, $(echo "$EVENT_COVERAGE" | grep -o '[0-9]*%' | head -1) event coverage
- **Risk Level**: $(echo "$DIGEST_META" | grep -q "Risk thresholds exceeded" && echo "ELEVATED" || echo "NORMAL")

EOF
}

# Read prompt template and substitute placeholders
info "Processing prompt template..."

PROMPT_CONTENT=$(cat "$PROMPT_FILE")

# Extract the actual prompt template from markdown
TEMPLATE=$(echo "$PROMPT_CONTENT" | awk '/^```$/,/^```$/ {if (!/^```$/) print}')

if [[ -z "$TEMPLATE" ]]; then
    # Fallback: use entire file if no code block found
    TEMPLATE="$PROMPT_CONTENT"
fi

# Substitute placeholders
REVIEW_REQUEST="$TEMPLATE"
REVIEW_REQUEST="${REVIEW_REQUEST//\{\{DIGEST_META_AND_METRICS\}\}/$DIGEST_META}"
REVIEW_REQUEST="${REVIEW_REQUEST//\{\{DIGEST_META\}\}/$DIGEST_META}"
REVIEW_REQUEST="${REVIEW_REQUEST//\{\{API_DRIFT_TABLE\}\}/$API_DRIFT_TABLE}"
REVIEW_REQUEST="${REVIEW_REQUEST//\{\{PUBLIC_API_DRIFT_TABLE\}\}/$API_DRIFT_TABLE}"
REVIEW_REQUEST="${REVIEW_REQUEST//\{\{EVENT_COVERAGE_SECTION\}\}/$EVENT_COVERAGE}"
REVIEW_REQUEST="${REVIEW_REQUEST//\{\{EVENT_COVERAGE\}\}/$EVENT_COVERAGE}"
REVIEW_REQUEST="${REVIEW_REQUEST//\{\{TYPE_ERROR_BREAKDOWN\}\}/$TYPE_ERROR_BREAKDOWN}"
REVIEW_REQUEST="${REVIEW_REQUEST//\{\{HEALTH_METRICS\}\}/$HEALTH_METRICS}"
REVIEW_REQUEST="${REVIEW_REQUEST//\{\{GRAPH_DELTA\}\}/$GRAPH_DELTA}"
REVIEW_REQUEST="${REVIEW_REQUEST//\{\{CUSTOM_CONTEXT\}\}/$CUSTOM_CONTEXT}"

# Add optional placeholders (these can be empty)
REVIEW_REQUEST="${REVIEW_REQUEST//\{\{PREVIOUS_REVIEW\}\}/}"
REVIEW_REQUEST="${REVIEW_REQUEST//\{\{CLAUDE_ASSESSMENT\}\}/}"
REVIEW_REQUEST="${REVIEW_REQUEST//\{\{DIFF_SNIPPETS\}\}/}"
REVIEW_REQUEST="${REVIEW_REQUEST//\{\{NEW_EXPORTS_EXCERPTS\}\}/}"
REVIEW_REQUEST="${REVIEW_REQUEST//\{\{KNOWN_CRITICAL_FUNCTIONS_LIST\}\}/createExecutionPlan, executePlan, dispatchStep, finalizePlan, processLog}"
REVIEW_REQUEST="${REVIEW_REQUEST//\{\{CURRENT_EVENT_TYPES\}\}/orchestrator.step.started, orchestrator.step.completed, orchestrator.step.failed, orchestrator.error.unhandled, orchestrator.error.unhandledRejection, orchestrator.debugger.ready}"

# Generate final output
OUTPUT=$(cat << EOF
$(generate_state_summary)

$REVIEW_REQUEST
EOF
)

# Output result
echo "$OUTPUT"

info "Review request generated for $PROMPT_TYPE"
info "Copy the output above and paste into your review tool"