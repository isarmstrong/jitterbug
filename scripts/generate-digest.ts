#!/usr/bin/env ts-node
/**
 * Semantic Review Digest Generator
 * 
 * Generates comprehensive project digests for LLM-assisted code review.
 * Creates markdown reports with git context, change analysis, and health metrics.
 * 
 * ## Features
 * - Git-hash based naming (no merge conflicts)
 * - Export/import change detection
 * - Dependency cycle analysis
 * - TypeScript/ESLint health metrics
 * - Commit metadata for audit trails
 * 
 * ## Usage
 * ```bash
 * # Generate digest for recent changes
 * npm run digest
 * 
 * # Compare against specific commit
 * npm run digest -- --since=HEAD~3
 * 
 * # Output to stdout instead of file
 * npm run digest -- --stdout
 * 
 * # Custom output location
 * npm run digest -- --output=custom-digest.md
 * ```
 * 
 * ## Output Location
 * Default: `scripts/digest/digest-{git-hash}.md`
 * 
 * ## Installation
 * Run `./scripts/install-hooks.sh` to auto-generate on commits
 * 
 * @author Ian Armstrong
 * @version 1.0.0
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Comprehensive metrics collected for digest generation
 */
interface DigestMetrics {
  /** ISO timestamp of when metrics were collected */
  timestamp: string;
  /** File change statistics */
  files: {
    changed: number;
    added: number;
    deleted: number;
    modified: number;
  };
  /** Line change statistics */
  lines: {
    added: number;
    deleted: number;
    net: number;
  };
  /** Export/import changes for API surface analysis */
  exports: {
    added: string[];
    removed: string[];
    modified: string[];
  };
  /** Dependency graph analysis */
  dependencies: {
    cycles: string[];
    graphHash: string;
  };
  /** Code quality metrics */
  diagnostics: {
    tsErrors: number;
    eslintErrors: number;
    todos: number;
  };
  /** Module-level changes */
  modules: {
    new: string[];
    deleted: string[];
    modified: string[];
  };
}

class DigestGenerator {
  private projectRoot: string;
  private since: string;

  constructor(projectRoot: string = process.cwd(), since: string = 'HEAD~1') {
    this.projectRoot = projectRoot;
    this.since = since;
  }

  async generate(): Promise<string> {
    const metrics = await this.collectMetrics();
    return this.synthesizeDigest(metrics);
  }

  private async collectMetrics(): Promise<DigestMetrics> {
    console.log('🔍 Collecting metrics...');
    
    const timestamp = new Date().toISOString();
    const files = this.getFileChanges();
    const lines = this.getLineChanges();
    const exports = await this.getExportChanges();
    const dependencies = await this.getDependencyInfo();
    const diagnostics = await this.getDiagnostics();
    const modules = this.getModuleChanges();

    return {
      timestamp,
      files,
      lines,
      exports,
      dependencies,
      diagnostics,
      modules,
    };
  }

  private getFileChanges() {
    try {
      const output = execSync(`git diff --name-status ${this.since}..HEAD`, {
        cwd: this.projectRoot,
        encoding: 'utf8',
      });

      const lines = output.trim().split('\n').filter(line => line);
      const stats = { changed: 0, added: 0, deleted: 0, modified: 0 };

      for (const line of lines) {
        const [status] = line.split('\t');
        stats.changed++;
        if (status === 'A') stats.added++;
        else if (status === 'D') stats.deleted++;
        else if (status === 'M') stats.modified++;
      }

      return stats;
    } catch {
      return { changed: 0, added: 0, deleted: 0, modified: 0 };
    }
  }

  private getLineChanges() {
    try {
      const output = execSync(`git diff --numstat ${this.since}..HEAD`, {
        cwd: this.projectRoot,
        encoding: 'utf8',
      });

      let added = 0, deleted = 0;
      const lines = output.trim().split('\n').filter(line => line);

      for (const line of lines) {
        const [addStr, delStr] = line.split('\t');
        if (addStr !== '-') added += parseInt(addStr, 10) || 0;
        if (delStr !== '-') deleted += parseInt(delStr, 10) || 0;
      }

      return { added, deleted, net: added - deleted };
    } catch {
      return { added: 0, deleted: 0, net: 0 };
    }
  }

  private async getExportChanges(): Promise<{ added: string[]; removed: string[]; modified: string[] }> {
    try {
      const changedFiles = execSync(`git diff --name-only ${this.since}..HEAD -- "*.ts" "*.tsx"`, {
        cwd: this.projectRoot,
        encoding: 'utf8',
      }).trim().split('\n').filter(Boolean);

      const added: string[] = [];
      const removed: string[] = [];
      const modified: string[] = [];

      for (const file of changedFiles) {
        try {
          // Get current file exports
          const currentExports = this.extractFileExports(file, 'HEAD');
          // Get previous file exports
          const previousExports = this.extractFileExports(file, this.since);
          
          // Compare export sets
          const currentSet = new Set(currentExports);
          const previousSet = new Set(previousExports);
          
          // Find added exports
          for (const exp of currentExports) {
            if (!previousSet.has(exp)) {
              added.push(`${file}:${exp}`);
            }
          }
          
          // Find removed exports
          for (const exp of previousExports) {
            if (!currentSet.has(exp)) {
              removed.push(`${file}:${exp}`);
            }
          }
        } catch (error) {
          // Fallback to git diff method for this file
          const fallbackResult = this.getExportChangesFromDiff(file);
          added.push(...fallbackResult.added.map(exp => `${file}:${exp}`));
          removed.push(...fallbackResult.removed.map(exp => `${file}:${exp}`));
        }
      }

      return { added, removed, modified };
    } catch {
      return { added: [], removed: [], modified: [] };
    }
  }

  private extractFileExports(file: string, ref: string): string[] {
    try {
      const content = execSync(`git show ${ref}:${file}`, {
        cwd: this.projectRoot,
        encoding: 'utf8',
      });
      
      return this.parseExportsFromContent(content);
    } catch {
      return [];
    }
  }

  private parseExportsFromContent(content: string): string[] {
    const exports: string[] = [];
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('export')) continue;
      
      // Extract export names using improved patterns
      const patterns = [
        /^export\s+(?:const|let|var)\s+(\w+)/,              // export const name
        /^export\s+(?:function|class)\s+(\w+)/,            // export function/class name  
        /^export\s+(?:interface|type)\s+(\w+)/,            // export interface/type name
        /^export\s+\{\s*([^}]+)\s*\}/,                     // export { name1, name2 }
        /^export\s+default\s+(?:class|function)?\s*(\w+)?/, // export default
        /^export\s+\*\s+from/,                             // export * from
      ];
      
      for (const pattern of patterns) {
        const match = trimmed.match(pattern);
        if (match) {
          if (pattern === patterns[3]) { // export { ... }
            const names = match[1].split(',').map(n => n.trim().split(/\s+as\s+/)[0].trim());
            exports.push(...names);
          } else if (pattern === patterns[4]) { // export default
            exports.push(match[1] || 'default');
          } else if (pattern === patterns[5]) { // export * from
            exports.push('star-export');
          } else if (match[1]) {
            exports.push(match[1]);
          }
          break;
        }
      }
    }
    
    return exports.filter(Boolean);
  }

  private getExportChangesFromDiff(file: string): { added: string[]; removed: string[] } {
    try {
      const diff = execSync(`git diff ${this.since}..HEAD -- "${file}"`, {
        cwd: this.projectRoot,
        encoding: 'utf8',
      });

      const added: string[] = [];
      const removed: string[] = [];
      const exportRegex = /^[+-]\s*export\s+.*$/gm;
      const matches = diff.match(exportRegex) || [];

      for (const match of matches) {
        const exportName = this.extractExportName(match);
        if (match.startsWith('+')) {
          added.push(exportName);
        } else if (match.startsWith('-')) {
          removed.push(exportName);
        }
      }

      return { added, removed };
    } catch {
      return { added: [], removed: [] };
    }
  }

  private extractExportName(line: string): string {
    // Extract export name from git diff line with better pattern matching
    const cleaned = line.replace(/^[+-]\s*/, '');
    
    // Match various export patterns
    const patterns = [
      /export\s+(?:const|let|var)\s+(\w+)/,           // export const name
      /export\s+(?:function|class)\s+(\w+)/,         // export function/class name
      /export\s+(?:interface|type)\s+(\w+)/,         // export interface/type name
      /export\s+\{[^}]*(\w+)(?:\s+as\s+\w+)?[^}]*\}/, // export { name }
      /export\s+\*\s+from/,                          // export * from
      /export\s+default/,                            // export default
    ];
    
    for (const pattern of patterns) {
      const match = cleaned.match(pattern);
      if (match) {
        if (pattern === patterns[4]) return 'star-export';
        if (pattern === patterns[5]) return 'default';
        return match[1] || 'complex-export';
      }
    }
    
    // Fallback: try to extract any identifier after 'export'
    const fallbackMatch = cleaned.match(/export.*?(\w+)/);
    return fallbackMatch ? fallbackMatch[1] : 'unmatched-export';
  }

  private async getDependencyInfo(): Promise<{ cycles: string[]; graphHash: string }> {
    try {
      // Check for madge, use if available
      try {
        const cycleOutput = execSync('npx madge src --circular --ts-config tsconfig.json', {
          cwd: this.projectRoot,
          encoding: 'utf8',
        });
        
        const cycles = cycleOutput.includes('✖ Found') 
          ? cycleOutput.split('\n').filter(line => line.includes(' → ')).map(line => line.trim())
          : [];

        // Simple graph hash based on file dependencies
        const graphData = execSync('find src -name "*.ts" -exec grep -l "import.*from" {} \\;', {
          cwd: this.projectRoot,
          encoding: 'utf8',
        });
        
        const graphHash = this.simpleHash(graphData);

        return { cycles, graphHash };
      } catch {
        return { cycles: [], graphHash: 'unavailable' };
      }
    } catch {
      return { cycles: [], graphHash: 'error' };
    }
  }

  private async getDiagnostics(): Promise<{ tsErrors: number; eslintErrors: number; todos: number }> {
    let tsErrors = 0;
    let eslintErrors = 0;
    let todos = 0;

    // TypeScript errors
    try {
      execSync('npx tsc --noEmit', { cwd: this.projectRoot, stdio: 'pipe' });
    } catch (error: any) {
      const output = error.stdout?.toString() || '';
      tsErrors = (output.match(/error TS\d+:/g) || []).length;
    }

    // ESLint errors
    try {
      const eslintOutput = execSync('npx eslint src --format json', {
        cwd: this.projectRoot,
        encoding: 'utf8',
        stdio: 'pipe',
      });
      const results = JSON.parse(eslintOutput);
      eslintErrors = results.reduce((total: number, file: any) => total + file.errorCount, 0);
    } catch {
      // ESLint not configured or errors
    }

    // TODO/FIXME count
    try {
      const todoOutput = execSync('grep -r "TODO\\|FIXME" src || true', {
        cwd: this.projectRoot,
        encoding: 'utf8',
      });
      todos = todoOutput.trim().split('\n').filter(line => line.trim()).length;
    } catch {
      // No todos found or grep error
    }

    return { tsErrors, eslintErrors, todos };
  }

  private getModuleChanges(): { new: string[]; deleted: string[]; modified: string[] } {
    try {
      const output = execSync(`git diff --name-status ${this.since}..HEAD -- "src/**/*.ts" "src/**/*.tsx"`, {
        cwd: this.projectRoot,
        encoding: 'utf8',
      });

      const newFiles: string[] = [];
      const deletedFiles: string[] = [];
      const modifiedFiles: string[] = [];

      const lines = output.trim().split('\n').filter(line => line);
      for (const line of lines) {
        const [status, file] = line.split('\t');
        if (status === 'A') newFiles.push(file);
        else if (status === 'D') deletedFiles.push(file);
        else if (status === 'M') modifiedFiles.push(file);
      }

      return { new: newFiles, deleted: deletedFiles, modified: modifiedFiles };
    } catch {
      return { new: [], deleted: [], modified: [] };
    }
  }

  private synthesizeDigest(metrics: DigestMetrics): string {
    const date = new Date().toISOString().split('T')[0];
    const gitInfo = this.getGitInfo();
    
    let digest = `# Jitterbug Semantic Digest – ${date}\n\n`;
    
    // Metadata header for audit trail
    digest += `## Commit Context\n`;
    digest += `- **Current commit:** \`${gitInfo.currentCommit}\`\n`;
    digest += `- **Branch:** \`${gitInfo.branch}\`\n`;
    digest += `- **Comparing since:** \`${this.since}\`\n`;
    digest += `- **Generated:** ${metrics.timestamp}\n`;
    if (gitInfo.lastCommitMessage) {
      digest += `- **Last commit:** ${gitInfo.lastCommitMessage}\n`;
    }
    digest += '\n';
    
    // Summary
    digest += `## Summary\n`;
    digest += `- **${metrics.files.changed} files changed** (+${metrics.lines.added} / -${metrics.lines.deleted} lines, net ${metrics.lines.net >= 0 ? '+' : ''}${metrics.lines.net})\n`;
    
    if (metrics.modules.new.length > 0) {
      digest += `- **${metrics.modules.new.length} new modules:** ${metrics.modules.new.slice(0, 3).join(', ')}${metrics.modules.new.length > 3 ? '...' : ''}\n`;
    }
    
    if (metrics.exports.added.length > 0) {
      digest += `- **Public surface:** +${metrics.exports.added.length} exports`;
      if (metrics.exports.added.length <= 3) {
        const exportNames = metrics.exports.added.map(exp => exp.split(':')[1]).join(', ');
        digest += ` (${exportNames})`;
      }
      digest += '\n';
    }
    
    digest += '\n';

    // Risk Flags with proper heuristics
    digest += `## Risk Flags\n`;
    const hasArchitecturalRisks = metrics.dependencies.cycles.length > 0 || 
                                 metrics.diagnostics.tsErrors > 0;
    const hasScaleRisks = metrics.files.changed > 10 ||
                         Math.abs(metrics.lines.net) > 500 ||
                         metrics.exports.added.length > 10;
    const hasGovernanceRisks = metrics.exports.added.length > 5 && metrics.files.changed < 3; // Surface inflation
    
    const hasRisks = hasArchitecturalRisks || hasScaleRisks || hasGovernanceRisks;
    
    if (!hasRisks) {
      digest += `✅ No significant risks detected\n\n`;
    } else {
      if (metrics.dependencies.cycles.length > 0) {
        digest += `- **⚠️ Circular dependencies:** ${metrics.dependencies.cycles.length} found\n`;
        metrics.dependencies.cycles.slice(0, 2).forEach(cycle => {
          digest += `  - ${cycle}\n`;
        });
      }
      
      if (metrics.diagnostics.tsErrors > 0) {
        digest += `- **⚠️ TypeScript errors:** ${metrics.diagnostics.tsErrors} errors\n`;
      }
      
      if (metrics.files.changed > 10) {
        digest += `- **⚠️ Large changeset:** ${metrics.files.changed} files modified\n`;
      }
      
      if (Math.abs(metrics.lines.net) > 500) {
        digest += `- **⚠️ High LOC delta:** ${metrics.lines.net >= 0 ? '+' : ''}${metrics.lines.net} lines (foundation/refactor?)\n`;
      }
      
      if (metrics.exports.added.length > 10) {
        digest += `- **⚠️ API surface inflation:** +${metrics.exports.added.length} exports in single commit\n`;
      }
      
      if (hasGovernanceRisks) {
        digest += `- **⚠️ Concentrated export growth:** ${metrics.exports.added.length} exports across ${metrics.files.changed} files\n`;
      }
      
      digest += '\n';
    }

    // API Surface Drift Table
    if (metrics.exports.added.length > 0 || metrics.exports.removed.length > 0) {
      digest += `## API Surface Drift\n`;
      
      // Summary counts
      digest += `**Impact:** +${metrics.exports.added.length} / -${metrics.exports.removed.length} exports\n\n`;
      
      // Detailed drift table
      if (metrics.exports.added.length > 0 || metrics.exports.removed.length > 0) {
        digest += `| Symbol | Status | File | Change Type |\n`;
        digest += `|--------|--------|------|-------------|\n`;
        
        // Show removed exports first (breaking changes)
        metrics.exports.removed.slice(0, 5).forEach(exp => {
          const [file, name] = exp.split(':');
          digest += `| \`${name}\` | removed | ${file} | Breaking |\n`;
        });
        
        // Show added exports
        metrics.exports.added.slice(0, 10).forEach(exp => {
          const [file, name] = exp.split(':');
          digest += `| \`${name}\` | added | ${file} | Additive |\n`;
        });
        
        const totalShown = Math.min(5, metrics.exports.removed.length) + Math.min(10, metrics.exports.added.length);
        const totalChanges = metrics.exports.added.length + metrics.exports.removed.length;
        
        if (totalChanges > totalShown) {
          digest += `| ... | ... | ... | +${totalChanges - totalShown} more changes |\n`;
        }
        
        digest += '\n';
      }
      
      // Legacy format for compatibility
      digest += `## Export Changes\n`;
      if (metrics.exports.added.length > 0) {
        digest += `**Added (${metrics.exports.added.length}):**\n`;
        metrics.exports.added.slice(0, 5).forEach(exp => {
          const [file, name] = exp.split(':');
          digest += `- \`${name}\` in ${file}\n`;
        });
        if (metrics.exports.added.length > 5) {
          digest += `- ... and ${metrics.exports.added.length - 5} more\n`;
        }
      }
      
      if (metrics.exports.removed.length > 0) {
        digest += `**Removed (${metrics.exports.removed.length}):**\n`;
        metrics.exports.removed.slice(0, 5).forEach(exp => {
          const [file, name] = exp.split(':');
          digest += `- \`${name}\` from ${file}\n`;
        });
      }
      
      digest += '\n';
    }

    // Health Metrics
    digest += `## Health Metrics\n`;
    digest += `- **TypeScript:** ${metrics.diagnostics.tsErrors} errors\n`;
    digest += `- **ESLint:** ${metrics.diagnostics.eslintErrors} errors\n`;
    digest += `- **TODOs:** ${metrics.diagnostics.todos} items\n`;
    digest += `- **Dependency graph:** ${metrics.dependencies.graphHash.slice(0, 8)}...\n\n`;

    // Locked Decisions (Governance)
    digest += `## 🔒 Locked Decisions (v0.2)\n`;
    digest += `| Decision | Value | Notes |\n`;
    digest += `|----------|-------|---------|\n`;
    digest += `| Hash Algorithm | xxhash64 (plan + domain signatures) | Fast, low collision; upgrade path documented |\n`;
    digest += `| Core Type Names | Plan, Step, Adapter, ExecutionContext | Do not rename without version bump |\n`;
    digest += `| Event Namespace | \`orchestrator.<entity>.<verb>\` | Examples: \`orchestrator.step.started\` |\n`;
    digest += `| Error Base Class | \`BaseOrchestratorError\` | All internal throws extend this |\n`;
    digest += `| Cycle Policy | Fail CI on any new cycle | Introduced cycles require explicit waiver |\n`;
    digest += `| Adapter Registry | Static map with capability metadata | Future DI layer wraps map, not replace |\n\n`;

    // Machine Data
    digest += `<details><summary>Machine Data</summary>\n\n`;
    digest += '```json\n';
    digest += JSON.stringify({
      timestamp: metrics.timestamp,
      tsErrors: metrics.diagnostics.tsErrors,
      eslintErrors: metrics.diagnostics.eslintErrors,
      cycles: metrics.dependencies.cycles,
      graphHash: metrics.dependencies.graphHash,
      netLines: metrics.lines.net,
      filesChanged: metrics.files.changed,
    }, null, 2);
    digest += '\n```\n\n';
    digest += '</details>\n';

    return digest;
  }

  private getGitInfo(): { currentCommit: string; branch: string; lastCommitMessage: string } {
    try {
      const currentCommit = execSync('git rev-parse HEAD', {
        cwd: this.projectRoot,
        encoding: 'utf8',
      }).trim();

      const branch = execSync('git branch --show-current', {
        cwd: this.projectRoot,
        encoding: 'utf8',
      }).trim();

      const lastCommitMessage = execSync('git log -1 --pretty=format:"%s"', {
        cwd: this.projectRoot,
        encoding: 'utf8',
      }).trim();

      return { currentCommit, branch, lastCommitMessage };
    } catch {
      return { currentCommit: 'unknown', branch: 'unknown', lastCommitMessage: '' };
    }
  }

  private simpleHash(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const since = args.find(arg => arg.startsWith('--since='))?.split('=')[1] || 'HEAD~1';
  const customOutput = args.find(arg => arg.startsWith('--output='))?.split('=')[1];
  const stdout = args.includes('--stdout');
  
  const generator = new DigestGenerator(process.cwd(), since);
  const digest = await generator.generate();
  
  if (stdout) {
    console.log(digest);
  } else {
    // Default to digest folder with git hash (no merge conflicts!)
    const gitInfo = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
    const shortHash = gitInfo.slice(0, 7);
    const defaultOutput = customOutput || join(process.cwd(), 'scripts', 'digest', `digest-${shortHash}.md`);
    
    writeFileSync(defaultOutput, digest);
    console.log(`✅ Digest written to ${defaultOutput}`);
  }
}

// Check if this is the main module for ES modules
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { DigestGenerator };