#!/usr/bin/env ts-node
/**
 * Domain Model Snapshot Generator
 * 
 * Generates a versioned domain model snapshot including:
 * - Public type signatures with stable hashes
 * - Event taxonomy with payload shapes
 * - Adapter registry with capabilities
 * - Breaking change detection vs previous snapshots
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';

interface DomainSnapshot {
  version: string;
  timestamp: string;
  gitHash: string;
  planSchemaHash: string;
  publicTypes: Record<string, string>;
  adapters: Array<{
    id: string;
    capabilities: string[];
    hash: string;
  }>;
  events: Record<string, string>;
  metadata: {
    totalExports: number;
    typeCount: number;
    eventCount: number;
    adapterCount: number;
  };
}

class DomainSnapshotGenerator {
  private projectRoot: string;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
  }

  async generate(): Promise<DomainSnapshot> {
    console.log('🔍 Generating domain model snapshot...');
    
    const timestamp = new Date().toISOString();
    const gitHash = this.getGitHash();
    const version = this.getVersion();
    
    const publicTypes = await this.extractPublicTypes();
    const events = await this.extractEventTypes();
    const adapters = await this.extractAdapters();
    const planSchemaHash = await this.calculatePlanSchemaHash();
    
    const snapshot: DomainSnapshot = {
      version,
      timestamp,
      gitHash,
      planSchemaHash,
      publicTypes,
      adapters,
      events,
      metadata: {
        totalExports: Object.keys(publicTypes).length,
        typeCount: Object.keys(publicTypes).filter(k => 
          publicTypes[k].includes('interface') || publicTypes[k].includes('type')
        ).length,
        eventCount: Object.keys(events).length,
        adapterCount: adapters.length,
      }
    };

    return snapshot;
  }

  private getGitHash(): string {
    try {
      return execSync('git rev-parse HEAD', {
        cwd: this.projectRoot,
        encoding: 'utf8',
      }).trim();
    } catch (error) {
      console.warn(`Failed to get git hash: ${error}`);
      return 'unknown';
    }
  }

  private getVersion(): string {
    try {
      const packageJson = JSON.parse(
        readFileSync(join(this.projectRoot, 'package.json'), 'utf8')
      );
      return packageJson.version || '0.0.0';
    } catch (error) {
      console.warn(`Failed to get version from package.json: ${error}`);
      return '0.0.0';
    }
  }

  private async extractPublicTypes(): Promise<Record<string, string>> {
    const types: Record<string, string> = {};
    
    try {
      // Find all TypeScript files that export types/interfaces
      const exportFiles = execSync(
        'find src -name "*.ts" -exec grep -l "^export" {} \\;',
        { cwd: this.projectRoot, encoding: 'utf8' }
      ).trim().split('\n').filter(Boolean);

      for (const file of exportFiles) {
        const content = readFileSync(join(this.projectRoot, file), 'utf8');
        
        // Extract export signatures (simplified)
        const exportMatches = content.match(/^export\s+(interface|type|class|const|function)\s+(\w+)/gm) || [];
        
        for (const match of exportMatches) {
          const [, kind, name] = match.match(/^export\s+(interface|type|class|const|function)\s+(\w+)/) || [];
          if (name) {
            // Create a signature hash based on the export context
            const signature = this.extractSignature(content, name, kind);
            types[`${file}:${name}`] = this.hashString(signature);
          }
        }
      }
    } catch (error) {
      console.warn('Failed to extract public types:', error);
    }

    return types;
  }

  private extractSignature(content: string, name: string, kind: string): string {
    // Extract the full signature for the named export
    // This is simplified - a full implementation would use TypeScript AST
    const lines = content.split('\n');
    const exportLineIndex = lines.findIndex(line => 
      line.includes(`export ${kind} ${name}`)
    );
    
    if (exportLineIndex === -1) return `${kind} ${name}`;
    
    // For interfaces/types, include the full definition
    if (kind === 'interface' || kind === 'type') {
      let signature = lines[exportLineIndex];
      let braceCount = 0;
      let inDefinition = false;
      
      for (let i = exportLineIndex; i < lines.length; i++) {
        const line = lines[i];
        signature += line;
        
        if (line.includes('{')) {
          inDefinition = true;
          braceCount += (line.match(/\{/g) || []).length;
        }
        if (line.includes('}')) {
          braceCount -= (line.match(/\}/g) || []).length;
          if (inDefinition && braceCount === 0) break;
        }
      }
      
      // Normalize whitespace and remove comments
      return signature
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*$/gm, '')
        .replace(/\s+/g, ' ')
        .trim();
    }
    
    return lines[exportLineIndex].trim();
  }

  private async extractEventTypes(): Promise<Record<string, string>> {
    const events: Record<string, string> = {};
    
    try {
      // Look for event type definitions
      const eventFiles = execSync(
        'find src -name "*.ts" -exec grep -l "orchestrator\\." {} \\;',
        { cwd: this.projectRoot, encoding: 'utf8' }
      ).trim().split('\n').filter(Boolean);

      for (const file of eventFiles) {
        const content = readFileSync(join(this.projectRoot, file), 'utf8');
        
        // Extract event type patterns (simplified)
        const eventMatches = content.match(/['"`]orchestrator\.\w+\.\w+['"`]/g) || [];
        
        for (const match of eventMatches) {
          const eventName = match.replace(/['"`]/g, '');
          // In a full implementation, we'd extract the payload type
          events[eventName] = this.hashString(`event:${eventName}`);
        }
      }
    } catch (error) {
      console.warn('Failed to extract event types:', error);
    }

    return events;
  }

  private async extractAdapters(): Promise<Array<{ id: string; capabilities: string[]; hash: string }>> {
    const adapters: Array<{ id: string; capabilities: string[]; hash: string }> = [];
    
    try {
      // This is a placeholder - in a real implementation we'd scan for adapter definitions
      // For now, just document the pattern
      const adapterPattern = {
        id: 'example-adapter',
        capabilities: ['logging', 'persistence'],
        hash: this.hashString('example-adapter-signature')
      };
      
      // adapters.push(adapterPattern);
    } catch (error) {
      console.warn('Failed to extract adapters:', error);
    }

    return adapters;
  }

  private async calculatePlanSchemaHash(): Promise<string> {
    try {
      // Extract the ExecutionPlan type definition
      const typesFile = join(this.projectRoot, 'src/orchestrator/types.ts');
      if (existsSync(typesFile)) {
        const content = readFileSync(typesFile, 'utf8');
        const planMatch = content.match(/export interface ExecutionPlan\s*{[\s\S]*?^}/m);
        if (planMatch) {
          return this.hashString(planMatch[0]);
        }
      }
    } catch (error) {
      console.warn('Failed to calculate plan schema hash:', error);
    }
    
    return this.hashString('plan-schema-unknown');
  }

  private hashString(input: string): string {
    return createHash('sha256').update(input).digest('hex').slice(0, 16);
  }

  async saveSnapshot(snapshot: DomainSnapshot, outputPath?: string): Promise<string> {
    const defaultPath = join(
      this.projectRoot, 
      'scripts/digest',
      `domain-model-${new Date().toISOString().split('T')[0]}.json`
    );
    
    const finalPath = outputPath || defaultPath;
    writeFileSync(finalPath, JSON.stringify(snapshot, null, 2));
    
    return finalPath;
  }

  async compareWithPrevious(current: DomainSnapshot): Promise<{
    breaking: string[];
    additions: string[];
    removals: string[];
  }> {
    const changes = {
      breaking: [] as string[],
      additions: [] as string[],
      removals: [] as string[]
    };

    try {
      // Find the most recent previous snapshot
      const digestDir = join(this.projectRoot, 'scripts/digest');
      if (!existsSync(digestDir)) return changes;

      const files = execSync(`ls -t ${digestDir}/domain-model-*.json 2>/dev/null || true`, {
        encoding: 'utf8'
      }).trim().split('\n').filter(Boolean);

      if (files.length === 0) return changes;

      const previousFile = files[0];
      const previous: DomainSnapshot = JSON.parse(
        readFileSync(join(digestDir, previousFile), 'utf8')
      );

      // Compare public types
      for (const [key, hash] of Object.entries(current.publicTypes)) {
        if (!(key in previous.publicTypes)) {
          changes.additions.push(`Type: ${key}`);
        } else if (previous.publicTypes[key] !== hash) {
          changes.breaking.push(`Type signature changed: ${key}`);
        }
      }

      for (const key of Object.keys(previous.publicTypes)) {
        if (!(key in current.publicTypes)) {
          changes.removals.push(`Type: ${key}`);
        }
      }

      // Compare plan schema
      if (previous.planSchemaHash !== current.planSchemaHash) {
        changes.breaking.push('ExecutionPlan schema changed');
      }

    } catch (error) {
      console.warn('Failed to compare with previous snapshot:', error);
    }

    return changes;
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const outputPath = args.find(arg => arg.startsWith('--output='))?.split('=')[1];
  const compare = args.includes('--compare');
  
  const generator = new DomainSnapshotGenerator();
  const snapshot = await generator.generate();
  
  if (compare) {
    const changes = await generator.compareWithPrevious(snapshot);
    if (changes.breaking.length > 0) {
      console.log('⚠️  Breaking changes detected:');
      changes.breaking.forEach(change => console.log(`  - ${change}`));
    }
    if (changes.additions.length > 0) {
      console.log('✅ Additions:');
      changes.additions.forEach(change => console.log(`  - ${change}`));
    }
    if (changes.removals.length > 0) {
      console.log('🗑️  Removals:');
      changes.removals.forEach(change => console.log(`  - ${change}`));
    }
  }
  
  const savedPath = await generator.saveSnapshot(snapshot, outputPath);
  console.log(`✅ Domain snapshot saved to ${savedPath}`);
  console.log(`📊 Metadata: ${snapshot.metadata.totalExports} exports, ${snapshot.metadata.typeCount} types`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { DomainSnapshotGenerator };