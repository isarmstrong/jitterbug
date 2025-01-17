#!/bin/bash

# Function to add .js extension to imports
fix_imports() {
  local file="$1"
  echo "Fixing imports in $file"
  
  # First remove any existing .js extensions
  sed -i '' -E 's/from "(\.\.?\/[^"]+)\.js"/from "\1"/g' "$file"
  sed -i '' -E "s/from '(\.\.?\/[^']+)\.js'/from '\1'/g" "$file"
  
  # Then add .js extension to relative imports
  sed -i '' -E 's/from "(\.\.?\/[^"]+)"/from "\1.js"/g' "$file"
  sed -i '' -E "s/from '(\.\.?\/[^']+)'/from '\1.js'/g" "$file"
}

# Find all TypeScript files in src directory
find src -name "*.ts" -o -name "*.tsx" | while read -r file; do
  fix_imports "$file"
done 