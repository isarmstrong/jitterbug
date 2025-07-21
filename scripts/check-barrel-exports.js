#!/usr/bin/env node
/**
 * Dev-ex safety net: Check that public.ts doesn't export test files
 * Prevents accidental test file leakage into public API surface
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const PUBLIC_FILE = 'src/browser/public.ts';
const ROOT_DIR = process.cwd();

function checkBarrelExports() {
  try {
    const publicContent = readFileSync(join(ROOT_DIR, PUBLIC_FILE), 'utf-8');
    const lines = publicContent.split('\n');
    
    const violations = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check for export statements with import paths
      if (line.startsWith('export') && line.includes('from')) {
        const fromMatch = line.match(/from\s+['"]([^'"]+)['"]/);
        if (fromMatch) {
          const importPath = fromMatch[1];
          
          // Check for test file patterns
          if (importPath.includes('__tests__') || importPath.includes('/fixtures/')) {
            violations.push({
              line: i + 1,
              content: line,
              path: importPath,
              issue: 'Test file or fixture imported in public barrel'
            });
          }
        }
      }
    }
    
    if (violations.length > 0) {
      console.error('❌ Barrel export violations found:');
      violations.forEach(v => {
        console.error(`  Line ${v.line}: ${v.issue}`);
        console.error(`    ${v.content}`);
        console.error(`    Path: ${v.path}`);
      });
      process.exit(1);
    }
    
    console.log('✅ No test file exports found in public barrel');
  } catch (error) {
    console.error('Error checking barrel exports:', error.message);
    process.exit(1);
  }
}

checkBarrelExports();