#!/bin/bash
# Install git hooks for semantic digest generation

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GIT_HOOKS_DIR="$(git rev-parse --git-dir)/hooks"

echo "Installing git hooks..."

# Create pre-commit hook
cat > "$GIT_HOOKS_DIR/pre-commit" << 'EOF'
#!/bin/sh
# Auto-generate semantic digest on commit
# This creates a digest file keyed to the commit hash for team visibility

echo "🔍 Generating semantic digest..."

# Generate digest (suppress output unless error)
if npm run digest >/dev/null 2>&1; then
    # Add digest to commit if it was generated
    git add scripts/digest/ 2>/dev/null || true
    echo "✅ Digest generated and added to commit"
else
    echo "⚠️  Digest generation failed, continuing with commit"
fi
EOF

# Make hook executable
chmod +x "$GIT_HOOKS_DIR/pre-commit"

echo "✅ Pre-commit hook installed"
echo "   - Digest will be auto-generated on each commit"
echo "   - Files saved to scripts/digest/digest-{hash}.md"
echo "   - No merge conflicts (hash-based naming)"