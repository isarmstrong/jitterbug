#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to recursively find all TypeScript files
function findTsFiles(dir, files = []) {
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
      findTsFiles(fullPath, files);
    } else if (stat.isFile() && (item.endsWith('.ts') || item.endsWith('.tsx'))) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Function to count exports in a file
function countExports(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  let exportCount = 0;
  const exportDetails = [];
  
  // Remove comments to avoid false positives
  const cleanContent = content
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
    .replace(/\/\/.*$/gm, ''); // Remove line comments
  
  // Match various export patterns
  const patterns = [
    // Named exports: export { a, b, c }
    /export\s*\{([^}]+)\}/g,
    // Direct exports: export const/let/var/function/class/interface/type/enum
    /export\s+(const|let|var|function|class|interface|type|enum|namespace|abstract\s+class)\s+(\w+)/g,
    // Default exports
    /export\s+default\s+/g,
    // Re-exports: export * from './module'
    /export\s*\*\s*(as\s+\w+\s+)?from/g,
    // Export assignments (less common)
    /export\s*=/g
  ];
  
  // Count named exports
  cleanContent.replace(patterns[0], (match, names) => {
    const namedExports = names.split(',').map(n => n.trim()).filter(n => n && !n.includes(' as '));
    exportCount += namedExports.length;
    namedExports.forEach(name => exportDetails.push({ type: 'named', name: name.split(' ')[0] }));
    return match;
  });
  
  // Count direct exports
  cleanContent.replace(patterns[1], (match, keyword, name) => {
    exportCount++;
    exportDetails.push({ type: keyword, name });
    return match;
  });
  
  // Count default exports
  cleanContent.replace(patterns[2], (match) => {
    exportCount++;
    exportDetails.push({ type: 'default', name: 'default' });
    return match;
  });
  
  // Count re-exports
  cleanContent.replace(patterns[3], (match) => {
    exportCount++;
    exportDetails.push({ type: 're-export', name: '*' });
    return match;
  });
  
  // Count export assignments
  cleanContent.replace(patterns[4], (match) => {
    exportCount++;
    exportDetails.push({ type: 'assignment', name: '=' });
    return match;
  });
  
  return { count: exportCount, details: exportDetails };
}

// Main execution
const srcDir = path.join(process.cwd(), 'src');
const files = findTsFiles(srcDir);
const results = [];
let totalExports = 0;

console.log(`Found ${files.length} TypeScript files in src/\n`);

for (const file of files) {
  const { count, details } = countExports(file);
  if (count > 0) {
    const relativePath = path.relative(process.cwd(), file);
    results.push({ file: relativePath, count, details });
    totalExports += count;
  }
}

// Sort by export count
results.sort((a, b) => b.count - a.count);

// Display top offenders
console.log('Top 20 files with most exports:');
console.log('================================');
results.slice(0, 20).forEach((result, index) => {
  console.log(`${(index + 1).toString().padStart(2)}. ${result.file} - ${result.count} exports`);
  
  // Show breakdown of export types for top 10
  if (index < 10) {
    const typeCount = {};
    result.details.forEach(d => {
      typeCount[d.type] = (typeCount[d.type] || 0) + 1;
    });
    const breakdown = Object.entries(typeCount)
      .map(([type, count]) => `${type}: ${count}`)
      .join(', ');
    console.log(`    (${breakdown})`);
  }
});

console.log('\nSummary:');
console.log('========');
console.log(`Total TypeScript files analyzed: ${files.length}`);
console.log(`Files with exports: ${results.length}`);
console.log(`Total exports across all files: ${totalExports}`);
console.log(`Average exports per file: ${(totalExports / results.length).toFixed(2)}`);

// Show distribution
const distribution = {
  '1-5': 0,
  '6-10': 0,
  '11-20': 0,
  '21-50': 0,
  '50+': 0
};

results.forEach(r => {
  if (r.count <= 5) distribution['1-5']++;
  else if (r.count <= 10) distribution['6-10']++;
  else if (r.count <= 20) distribution['11-20']++;
  else if (r.count <= 50) distribution['21-50']++;
  else distribution['50+']++;
});

console.log('\nExport count distribution:');
console.log('=========================');
Object.entries(distribution).forEach(([range, count]) => {
  console.log(`${range.padEnd(8)} exports: ${count} files`);
});