#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

// Function to extract detailed exports from a file
function getDetailedExports(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const exports = [];
  
  // Remove comments
  const cleanContent = content
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');
  
  // Extract named exports from export { ... }
  const namedExportRegex = /export\s*\{([^}]+)\}/g;
  let match;
  while ((match = namedExportRegex.exec(cleanContent)) !== null) {
    const names = match[1].split(',').map(n => {
      const trimmed = n.trim();
      if (trimmed.includes(' as ')) {
        const [original, alias] = trimmed.split(' as ').map(s => s.trim());
        return `${original} as ${alias}`;
      }
      return trimmed;
    }).filter(n => n);
    names.forEach(name => exports.push({ type: 'named export', name }));
  }
  
  // Extract direct exports
  const directExportRegex = /export\s+(const|let|var|function|class|interface|type|enum|namespace|abstract\s+class)\s+(\w+)/g;
  while ((match = directExportRegex.exec(cleanContent)) !== null) {
    exports.push({ 
      type: `export ${match[1]}`, 
      name: match[2] 
    });
  }
  
  // Extract default exports
  const defaultExportRegex = /export\s+default\s+(?:(function|class)\s+(\w+)|(\w+)|(?:\{[^}]*\})|(?:\([^)]*\)\s*=>))/g;
  while ((match = defaultExportRegex.exec(cleanContent)) !== null) {
    if (match[1] && match[2]) {
      exports.push({ type: 'export default', name: `${match[1]} ${match[2]}` });
    } else if (match[3]) {
      exports.push({ type: 'export default', name: match[3] });
    } else {
      exports.push({ type: 'export default', name: 'anonymous' });
    }
  }
  
  // Extract re-exports
  const reExportRegex = /export\s*(\*|\{[^}]+\})\s*(as\s+\w+\s+)?from\s+['"](.*)['"]/g;
  while ((match = reExportRegex.exec(cleanContent)) !== null) {
    if (match[1] === '*') {
      exports.push({ 
        type: 're-export', 
        name: match[2] ? `* ${match[2]}` : '*',
        from: match[3]
      });
    } else {
      exports.push({ 
        type: 're-export', 
        name: match[1],
        from: match[3]
      });
    }
  }
  
  return exports;
}

// Analyze top files
const topFiles = [
  'src/orchestrator/types.ts',
  'src/orchestrator/index.ts',
  'src/browser/branded-types.ts',
  'src/browser/schema-registry.ts',
  'src/hub/index.ts'
];

console.log('Detailed Export Analysis for Top Offenders');
console.log('==========================================\n');

topFiles.forEach((file, index) => {
  try {
    const fullPath = path.join(process.cwd(), file);
    const exports = getDetailedExports(fullPath);
    
    console.log(`${index + 1}. ${file} (${exports.length} exports)`);
    console.log('   ' + '─'.repeat(50));
    
    exports.forEach((exp, i) => {
      if (exp.from) {
        console.log(`   ${(i + 1).toString().padStart(2)}. ${exp.type}: ${exp.name} from '${exp.from}'`);
      } else {
        console.log(`   ${(i + 1).toString().padStart(2)}. ${exp.type}: ${exp.name}`);
      }
    });
    
    console.log('');
  } catch (error) {
    console.log(`   Error reading file: ${error.message}\n`);
  }
});