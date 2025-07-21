#!/usr/bin/env node

/**
 * Export Allow-List Gate
 * 
 * Validates that public exports conform to the allow-list policy.
 * Exits with code 1 if violations found.
 */

import fs from 'fs';
import path from 'path';

import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CONFIG_FILE = path.join(__dirname, 'public-exports.json');
const PUBLIC_BARREL = path.join(__dirname, '..', '..', 'src', 'index.ts');

function main() {
  try {
    // Load allow-list configuration
    const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    const allowedSet = new Set(config.allowed);
    
    console.log('🔍 Checking export allow-list compliance...');
    console.log(`📋 Allowed exports (${config.allowed.length}/${config.maxCount}):`, config.allowed);
    
    // Extract exports from index.ts barrel
    const publicContent = fs.readFileSync(PUBLIC_BARREL, 'utf8');
    const actualExports = extractExports(publicContent);
    
    console.log(`📊 Actual exports (${actualExports.length}):`, actualExports);
    
    // Check for violations
    const violations = [];
    const unexpected = actualExports.filter(exp => !allowedSet.has(exp));
    const missing = config.allowed.filter(exp => !actualExports.includes(exp));
    
    if (unexpected.length > 0) {
      violations.push(`Unexpected exports: ${unexpected.join(', ')}`);
    }
    
    if (actualExports.length > config.maxCount) {
      violations.push(`Export count ${actualExports.length} exceeds max ${config.maxCount}`);
    }
    
    if (missing.length > 0) {
      console.warn(`⚠️  Missing expected exports: ${missing.join(', ')}`);
    }
    
    // Report results
    if (violations.length > 0) {
      console.error('❌ Export allow-list violations:');
      violations.forEach(v => console.error(`   ${v}`));
      process.exit(1);
    }
    
    console.log('✅ Export allow-list compliance verified');
    console.log(`📈 Surface size: ${actualExports.length}/${config.maxCount} (${Math.round(actualExports.length/config.maxCount*100)}%)`);
    
  } catch (error) {
    console.error('💥 Export allow-list check failed:', error.message);
    process.exit(1);
  }
}

function extractExports(content) {
  const exports = [];
  
  // Match export { ... } statements
  const namedExportRegex = /export\s*\{\s*([^}]+)\s*\}/g;
  let match;
  while ((match = namedExportRegex.exec(content)) !== null) {
    const namedExports = match[1]
      .split(',')
      .map(exp => exp.trim().split(' as ')[0].trim())
      .filter(Boolean);
    exports.push(...namedExports);
  }
  
  // Match export type { ... } statements  
  const typeExportRegex = /export\s+type\s*\{\s*([^}]+)\s*\}/g;
  while ((match = typeExportRegex.exec(content)) !== null) {
    const typeExports = match[1]
      .split(',')
      .map(exp => exp.trim().split(' as ')[0].trim())
      .filter(Boolean);
    exports.push(...typeExports);
  }
  
  // Match direct export function/const statements
  const directExportRegex = /export\s+(function|const|class|interface|type)\s+(\w+)/g;
  while ((match = directExportRegex.exec(content)) !== null) {
    exports.push(match[2]);
  }
  
  return [...new Set(exports)].sort();
}

main();