#!/usr/bin/env node
/**
 * Export Budget Guardrail
 * 
 * Prevents export surface growth beyond allocated budget.
 * Run before commits that add new exports.
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';

const BUDGET_CONFIG = {
  // Task 3.5 Phase 3 allocation
  maxNewExports: 2,
  maxTotalExports: 15,
  
  // Baseline from latest clean digest
  baselineExports: 11, // Current count from public.ts
};

function getExportCount() {
  try {
    // Count exports in public.ts
    const publicTs = readFileSync('src/browser/public.ts', 'utf-8');
    const exportLines = publicTs.split('\n').filter(line => 
      line.trim().startsWith('export ') && 
      !line.includes('//') && 
      !line.includes('* Internal types NOT exported')
    );
    
    return exportLines.length;
  } catch (error) {
    console.error('Failed to analyze exports:', error.message);
    process.exit(1);
  }
}

function main() {
  const currentExports = getExportCount();
  const newExports = currentExports - BUDGET_CONFIG.baselineExports;
  
  console.log(`Export Budget Check:`);
  console.log(`  Current: ${currentExports} exports`);
  console.log(`  Baseline: ${BUDGET_CONFIG.baselineExports} exports`);
  console.log(`  New: ${newExports} exports`);
  console.log(`  Budget: ${BUDGET_CONFIG.maxNewExports} new exports allowed`);
  
  if (newExports > BUDGET_CONFIG.maxNewExports) {
    console.error(`❌ Export budget exceeded!`);
    console.error(`   ${newExports} > ${BUDGET_CONFIG.maxNewExports} allowed new exports`);
    console.error(`   Consider consolidation or namespace grouping`);
    process.exit(1);
  }
  
  if (currentExports > BUDGET_CONFIG.maxTotalExports) {
    console.error(`❌ Total export limit exceeded!`);
    console.error(`   ${currentExports} > ${BUDGET_CONFIG.maxTotalExports} total exports allowed`);
    process.exit(1);
  }
  
  console.log(`✅ Export budget OK (${BUDGET_CONFIG.maxNewExports - newExports} slots remaining)`);
}

main();