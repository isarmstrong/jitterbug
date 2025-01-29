import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';

// Types that should always be type-only imports
const TYPE_ONLY_IMPORTS = new Set([
    'LogEntry',
    'LogTransport',
    'LogLevel',
    'LogContext',
    'RuntimeType',
    'EnvironmentType',
    'TransportConfig',
    'ProcessedLogEntry',
    'JitterbugConfig',
    'LogProcessor'
]);

function fixImports(filePath: string): void {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    const updatedLines = lines.map(line => {
        // Skip lines that are already type imports
        if (line.startsWith('import type')) return line;

        // Check if line is an import statement
        if (line.startsWith('import')) {
            const hasTypeOnlyImports = Array.from(TYPE_ONLY_IMPORTS).some(type =>
                line.includes(type)
            );

            if (hasTypeOnlyImports) {
                // Convert to type-only import
                return line.replace('import {', 'import type {');
            }
        }

        return line;
    });

    writeFileSync(filePath, updatedLines.join('\n'));
    console.log(`Updated imports in ${filePath}`);
}

// Find all TypeScript files
const files = glob.sync('src/**/*.{ts,tsx}', {
    ignore: ['**/node_modules/**', 'dist/**']
});

files.forEach(fixImports); 