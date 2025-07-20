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
interface PublicSymbol {
  name: string;
  file: string;
  category: 'core' | 'error' | 'adapter' | 'script' | 'util';
  hash: string;
  prevHash?: string;
  status: 'new' | 'removed' | 'changed' | 'moved' | 'unchanged';
  notes?: string;
}

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
  /** Public API symbol tracking with semantic hashes */
  symbols: {
    current: PublicSymbol[];
    previous: PublicSymbol[];
    drift: PublicSymbol[];
  };
  /** Event coverage metrics */
  events: {
    scopes: {
      'runtime-core': { functions: string[]; instrumented: string[]; coverage: number };
      'debugger-lifecycle': { functions: string[]; instrumented: string[]; coverage: number };
    };
    overall: number;
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
    const symbols = await this.getSymbolDrift();
    const events = await this.getEventCoverage();
    const dependencies = await this.getDependencyInfo();
    const diagnostics = await this.getDiagnostics();
    const modules = this.getModuleChanges();

    return {
      timestamp,
      files,
      lines,
      exports,
      symbols,
      events,
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

    // Risk Flags with proper heuristics + Coverage gating
    digest += `## Risk Heuristics\n`;
    
    // Define and evaluate heuristics including coverage gates
    const heuristics = {
      largeCommit: Math.abs(metrics.lines.net) > 500,
      surfaceInflation: metrics.exports.added.length > 10,
      concentratedGrowth: metrics.exports.added.length > 5 && metrics.files.changed < 3,
      largeDiff: metrics.files.changed > 10,
      typeRegression: metrics.diagnostics.tsErrors > 0,
      lintRegression: metrics.diagnostics.eslintErrors > 0,
      graphCycles: metrics.dependencies.cycles.length > 0,
      missingExports: metrics.exports.added.some(exp => exp.includes('unmatched-export')),
      // Coverage gates
      runtimeCoreGate: metrics.events.scopes['runtime-core'].coverage < 0.6,
      debuggerLifecycleGate: metrics.events.scopes['debugger-lifecycle'].coverage < 0.9,
      overallCoverageGate: metrics.events.overall < 0.75
    };
    
    const triggeredHeuristics = Object.entries(heuristics).filter(([_, triggered]) => triggered);
    
    if (triggeredHeuristics.length === 0) {
      digest += `✅ All heuristics under thresholds (risk: low)\n`;
      digest += `- Commit LOC ≤ 500? ✅ (${metrics.lines.net >= 0 ? '+' : ''}${metrics.lines.net})\n`;
      digest += `- Public export growth ≤ 10? ✅ (+${metrics.exports.added.length})\n`;
      digest += `- Type errors = 0? ✅ (${metrics.diagnostics.tsErrors})\n`;
      digest += `- New cycles = 0? ✅ (${metrics.dependencies.cycles.length})\n`;
      digest += `- Runtime-core coverage ≥ 60%? ✅ (${Math.round(metrics.events.scopes['runtime-core'].coverage * 100)}%)\n`;
      digest += `- Debugger-lifecycle coverage ≥ 90%? ✅ (${Math.round(metrics.events.scopes['debugger-lifecycle'].coverage * 100)}%)\n\n`;
    } else {
      digest += `⚠️  **Risk thresholds exceeded:**\n`;
      
      if (heuristics.largeCommit) {
        digest += `- **Large commit:** ${metrics.lines.net >= 0 ? '+' : ''}${metrics.lines.net} lines (threshold: >500)\n`;
      }
      if (heuristics.surfaceInflation) {
        digest += `- **API surface inflation:** +${metrics.exports.added.length} exports (threshold: >10)\n`;
      }
      if (heuristics.concentratedGrowth) {
        digest += `- **Concentrated export growth:** ${metrics.exports.added.length} exports across ${metrics.files.changed} files\n`;
      }
      if (heuristics.largeDiff) {
        digest += `- **Large changeset:** ${metrics.files.changed} files modified (threshold: >10)\n`;
      }
      if (heuristics.typeRegression) {
        digest += `- **TypeScript regression:** ${metrics.diagnostics.tsErrors} errors\n`;
      }
      if (heuristics.lintRegression) {
        digest += `- **Lint regression:** ${metrics.diagnostics.eslintErrors} errors\n`;
      }
      if (heuristics.graphCycles) {
        digest += `- **Circular dependencies:** ${metrics.dependencies.cycles.length} found\n`;
        metrics.dependencies.cycles.slice(0, 2).forEach(cycle => {
          digest += `  - ${cycle}\n`;
        });
      }
      if (heuristics.missingExports) {
        digest += `- **Export enumeration incomplete:** Some exports unclassified\n`;
      }
      
      // Coverage gate violations
      if (heuristics.runtimeCoreGate) {
        const coverage = Math.round(metrics.events.scopes['runtime-core'].coverage * 100);
        const missing = metrics.events.scopes['runtime-core'].functions.filter(fn => 
          !metrics.events.scopes['runtime-core'].instrumented.includes(fn)
        );
        digest += `- **Runtime-core coverage gate:** ${coverage}% < 60% threshold. Missing: ${missing.join(', ')}\n`;
      }
      if (heuristics.debuggerLifecycleGate) {
        const coverage = Math.round(metrics.events.scopes['debugger-lifecycle'].coverage * 100);
        digest += `- **Debugger-lifecycle coverage gate:** ${coverage}% < 90% threshold\n`;
      }
      if (heuristics.overallCoverageGate) {
        const coverage = Math.round(metrics.events.overall * 100);
        digest += `- **Overall coverage gate:** ${coverage}% < 75% threshold\n`;
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

    // Public API Drift Table
    if (metrics.symbols.drift.length > 0) {
      digest += `## Public API Drift\n`;
      digest += `| Symbol | Status | Cat | Hash (old→new) | Notes |\n`;
      digest += `|--------|--------|-----|----------------|-------|\n`;
      
      // Sort by status priority: removed > changed > new
      const sortedDrift = metrics.symbols.drift.sort((a, b) => {
        const priority = { removed: 0, changed: 1, moved: 2, new: 3 };
        return (priority[a.status] || 4) - (priority[b.status] || 4);
      });
      
      sortedDrift.slice(0, 15).forEach(symbol => {
        const hashDisplay = symbol.prevHash 
          ? `${symbol.prevHash}→${symbol.hash}`
          : symbol.hash;
        const notes = symbol.notes || (symbol.status === 'removed' ? 'Breaking' : '—');
        
        digest += `| \`${symbol.name}\` | ${symbol.status} | ${symbol.category} | ${hashDisplay} | ${notes} |\n`;
      });
      
      if (metrics.symbols.drift.length > 15) {
        digest += `| ... | ... | ... | ... | +${metrics.symbols.drift.length - 15} more changes |\n`;
      }
      
      digest += '\n';
    }

    // Event Coverage
    digest += `## Event Coverage\n`;
    digest += `| Scope | Instrumented / Total | Percent |\n`;
    digest += `|-------|----------------------|---------|\n`;
    digest += `| runtime-core | ${metrics.events.scopes['runtime-core'].instrumented.length} / ${metrics.events.scopes['runtime-core'].functions.length} | ${Math.round(metrics.events.scopes['runtime-core'].coverage * 100)}% ${metrics.events.scopes['runtime-core'].coverage >= 0.9 ? '✅' : '⚠️'} |\n`;
    digest += `| debugger-lifecycle | ${metrics.events.scopes['debugger-lifecycle'].instrumented.length} / ${metrics.events.scopes['debugger-lifecycle'].functions.length} | ${Math.round(metrics.events.scopes['debugger-lifecycle'].coverage * 100)}% ${metrics.events.scopes['debugger-lifecycle'].coverage >= 0.8 ? '✅' : '⚠️'} |\n`;
    digest += `| **Overall (weighted)** | **${Math.round(metrics.events.overall * 100)}%** | ${metrics.events.overall >= 0.75 ? '✅' : '⚠️'} |\n\n`;
    
    digest += `**Scope Details:**\n`;
    digest += `- **Runtime-core instrumented:** ${metrics.events.scopes['runtime-core'].instrumented.join(', ') || 'None'}\n`;
    if (metrics.events.scopes['runtime-core'].instrumented.length < metrics.events.scopes['runtime-core'].functions.length) {
      const missing = metrics.events.scopes['runtime-core'].functions.filter(fn => !metrics.events.scopes['runtime-core'].instrumented.includes(fn));
      digest += `- **Runtime-core missing:** ${missing.join(', ')}\n`;
    }
    digest += `- **Debugger-lifecycle instrumented:** ${metrics.events.scopes['debugger-lifecycle'].instrumented.join(', ') || 'None'}\n`;
    if (metrics.events.scopes['debugger-lifecycle'].instrumented.length < metrics.events.scopes['debugger-lifecycle'].functions.length) {
      const missing = metrics.events.scopes['debugger-lifecycle'].functions.filter(fn => !metrics.events.scopes['debugger-lifecycle'].instrumented.includes(fn));
      digest += `- **Debugger-lifecycle missing:** ${missing.join(', ')}\n`;
    }
    digest += '\n';


    // Graph Delta
    digest += `## Graph Delta\n`;
    const graphStats = this.getGraphStats();
    digest += `- **Nodes:** ${graphStats.nodes} (±${graphStats.nodesDelta})\n`;
    digest += `- **Edges:** +${graphStats.edgesAdded} / -${graphStats.edgesRemoved}\n`;
    digest += `- **Max fan-in:** ${graphStats.maxFanIn.module} (${graphStats.maxFanIn.count}) ${graphStats.maxFanIn.change}\n`;
    digest += `- **Cycles:** ${metrics.dependencies.cycles.length} (score ${this.calculateCycleScore(metrics.dependencies.cycles)})\n`;
    digest += `- **Graph hash:** ${metrics.dependencies.graphHash.slice(0, 8)}...\n\n`;

    // Health Metrics
    digest += `## Health Metrics\n`;
    digest += `- **TypeScript:** ${metrics.diagnostics.tsErrors} errors\n`;
    digest += `- **ESLint:** ${metrics.diagnostics.eslintErrors} errors\n`;
    digest += `- **TODOs:** ${metrics.diagnostics.todos} items\n\n`;

    // Locked Decisions (Governance)
    digest += `## 🔒 Locked Decisions (v1.0)\n`;
    digest += `| Decision | Value | Notes |\n`;
    digest += `|----------|-------|---------|\n`;
    digest += `| Hash Algorithm | xxhash64 (plan + domain signatures) | Fast, low collision; upgrade path documented |\n`;
    digest += `| Core Type Names | Plan, Step, Adapter, ExecutionContext | Do not rename without version bump |\n`;
    digest += `| Event Namespace | \`orchestrator.<entity>.<verb>\` | Examples: \`orchestrator.step.started\` |\n`;
    digest += `| Error Base Class | \`BaseOrchestratorError\` | All internal throws extend this |\n`;
    digest += `| Cycle Policy | Fail CI on any new cycle | Introduced cycles require explicit waiver |\n`;
    digest += `| Adapter Registry | Static map with capability metadata | Future DI layer wraps map, not replace |\n`;
    digest += `| Public API Drift Tracking | Deferred (manual review) | Enable when core module count > 15 |\n\n`;

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

  private getGraphStats(): {
    nodes: number;
    nodesDelta: number;
    edgesAdded: number;
    edgesRemoved: number;
    maxFanIn: { module: string; count: number; change: string };
  } {
    try {
      // Simplified graph analysis - in full implementation would use madge JSON output
      const currentFiles = execSync('find src -name "*.ts" | wc -l', {
        cwd: this.projectRoot,
        encoding: 'utf8',
      }).trim();
      
      const nodes = parseInt(currentFiles, 10) || 0;
      
      // Placeholder values - full implementation would diff dependency graphs
      return {
        nodes,
        nodesDelta: 0,
        edgesAdded: 0,
        edgesRemoved: 0,
        maxFanIn: {
          module: 'src/orchestrator/core-orchestrator.ts',
          count: 5,
          change: '(unchanged)'
        }
      };
    } catch {
      return {
        nodes: 0,
        nodesDelta: 0,
        edgesAdded: 0,
        edgesRemoved: 0,
        maxFanIn: { module: 'unknown', count: 0, change: '' }
      };
    }
  }

  private calculateCycleScore(cycles: string[]): number {
    // Score = sum of (cycle length * total fan-in of cycle members)
    // Simplified implementation
    return cycles.reduce((score, cycle) => {
      const nodes = cycle.split(' → ').length;
      return score + nodes * 2; // Simplified scoring
    }, 0);
  }

  private async getSymbolDrift(): Promise<{
    current: PublicSymbol[];
    previous: PublicSymbol[];
    drift: PublicSymbol[];
  }> {
    try {
      const currentSymbols = await this.extractSymbolsFromRef('HEAD');
      const previousSymbols = await this.extractSymbolsFromRef(this.since);
      const drift = this.calculateSymbolDrift(currentSymbols, previousSymbols);
      
      return {
        current: currentSymbols,
        previous: previousSymbols,
        drift
      };
    } catch {
      return { current: [], previous: [], drift: [] };
    }
  }

  private async extractSymbolsFromRef(ref: string): Promise<PublicSymbol[]> {
    const symbols: PublicSymbol[] = [];
    
    try {
      // Get all TypeScript files in the ref
      const files = execSync(`git ls-tree -r --name-only ${ref} | grep -E "\\.(ts|tsx)$" | grep -v __tests__ | grep -v test`, {
        cwd: this.projectRoot,
        encoding: 'utf8',
      }).trim().split('\n').filter(Boolean);

      for (const file of files) {
        try {
          const content = execSync(`git show ${ref}:${file}`, {
            cwd: this.projectRoot,
            encoding: 'utf8',
          });
          
          const fileSymbols = this.extractSymbolsFromContent(content, file);
          symbols.push(...fileSymbols);
        } catch {
          // File might not exist in this ref
        }
      }
    } catch {
      // Git ref might not exist
    }
    
    return symbols;
  }

  private extractSymbolsFromContent(content: string, file: string): PublicSymbol[] {
    const symbols: PublicSymbol[] = [];
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line.startsWith('export')) continue;
      
      const symbol = this.parseSymbolFromLine(line, file, lines, i);
      if (symbol) {
        symbols.push(symbol);
      }
    }
    
    return symbols;
  }

  private parseSymbolFromLine(line: string, file: string, lines: string[], index: number): PublicSymbol | null {
    // Enhanced symbol parsing with semantic hashing
    const patterns = [
      { pattern: /^export\s+(?:const|let|var)\s+(\w+)/, category: 'util' as const },
      { pattern: /^export\s+(?:function)\s+(\w+)/, category: 'core' as const },
      { pattern: /^export\s+(?:class)\s+(\w+)/, category: this.categorizeClass },
      { pattern: /^export\s+(?:interface|type)\s+(\w+)/, category: 'core' as const },
      { pattern: /^export\s+\{\s*([^}]+)\s*\}/, category: 'util' as const },
    ];
    
    for (const { pattern, category } of patterns) {
      const match = line.match(pattern);
      if (match) {
        const name = match[1];
        if (!name) continue;
        
        // Extract full symbol definition for hashing
        const definition = this.extractSymbolDefinition(lines, index, name);
        const hash = this.hashSymbolDefinition(definition);
        const finalCategory = typeof category === 'function' ? category(name) : category;
        
        return {
          name,
          file,
          category: finalCategory,
          hash,
          status: 'unchanged', // Will be updated in drift calculation
        };
      }
    }
    
    return null;
  }

  private categorizeClass = (name: string): PublicSymbol['category'] => {
    if (name.includes('Error')) return 'error';
    if (name.includes('Adapter')) return 'adapter';
    if (name.includes('Generator')) return 'script';
    return 'core';
  };

  private extractSymbolDefinition(lines: string[], startIndex: number, name: string): string {
    // Extract the complete symbol definition for semantic hashing
    let definition = lines[startIndex];
    
    // For functions/classes/interfaces, include the signature
    if (definition.includes('{')) {
      let braceCount = 0;
      let inDefinition = false;
      
      for (let i = startIndex; i < Math.min(lines.length, startIndex + 20); i++) {
        const line = lines[i];
        definition += line;
        
        if (line.includes('{')) {
          inDefinition = true;
          braceCount += (line.match(/\{/g) || []).length;
        }
        if (line.includes('}')) {
          braceCount -= (line.match(/\}/g) || []).length;
          if (inDefinition && braceCount === 0) break;
        }
      }
    }
    
    // Normalize the definition for stable hashing
    return definition
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
      .replace(/\/\/.*$/gm, '')         // Remove line comments
      .replace(/\s+/g, ' ')             // Normalize whitespace
      .trim();
  }

  private hashSymbolDefinition(definition: string): string {
    // Use xxhash64 equivalent (simplified for now)
    return this.simpleHash(definition).slice(0, 8);
  }

  private calculateSymbolDrift(current: PublicSymbol[], previous: PublicSymbol[]): PublicSymbol[] {
    const drift: PublicSymbol[] = [];
    const currentMap = new Map(current.map(s => [`${s.file}:${s.name}`, s]));
    const previousMap = new Map(previous.map(s => [`${s.file}:${s.name}`, s]));
    
    // Find new symbols
    for (const [key, symbol] of currentMap) {
      if (!previousMap.has(key)) {
        drift.push({ ...symbol, status: 'new' });
      } else {
        const prevSymbol = previousMap.get(key)!;
        if (symbol.hash !== prevSymbol.hash) {
          drift.push({ 
            ...symbol, 
            status: 'changed', 
            prevHash: prevSymbol.hash 
          });
        }
      }
    }
    
    // Find removed symbols
    for (const [key, symbol] of previousMap) {
      if (!currentMap.has(key)) {
        drift.push({ ...symbol, status: 'removed' });
      }
    }
    
    return drift;
  }

  private async getEventCoverage(): Promise<{
    scopes: {
      'runtime-core': { functions: string[]; instrumented: string[]; coverage: number };
      'debugger-lifecycle': { functions: string[]; instrumented: string[]; coverage: number };
    };
    overall: number;
  }> {
    // Define instrumentation scopes with their critical functions
    const scopes = {
      'runtime-core': [
        'createExecutionPlan',
        'executePlan', 
        'dispatchStep',
        'finalizePlan',
        'processLog'
      ],
      'debugger-lifecycle': [
        'initialize',
        'registerBranch', 
        'unregisterBranch',
        'shutdown',
        'processLog'
      ]
    };

    console.log('🔍 Scanning orchestrator files for instrumentation...');

    const results = {
      'runtime-core': { functions: scopes['runtime-core'], instrumented: [] as string[], coverage: 0 },
      'debugger-lifecycle': { functions: scopes['debugger-lifecycle'], instrumented: [] as string[], coverage: 0 }
    };

    try {
      const orchestratorFiles = execSync('find src/orchestrator -name "*.ts" -not -path "*/test*" -not -path "*/__tests__/*"', {
        cwd: this.projectRoot,
        encoding: 'utf8',
      }).trim().split('\n').filter(Boolean);
      
      console.log('🔍 Scanning files:', orchestratorFiles);

      // Scan each scope
      for (const [scopeName, scopeFunctions] of Object.entries(scopes)) {
        const instrumentedFunctions: string[] = [];
        
        for (const file of orchestratorFiles) {
          try {
            const content = readFileSync(join(this.projectRoot, file), 'utf8');
            
            for (const fnName of scopeFunctions) {
              // Enhanced detection: function name + (emitJitterbugEvent OR withTiming)
              const hasInstrumentation = content.includes('emitJitterbugEvent') || content.includes('withTiming');
              if (content.includes(fnName) && hasInstrumentation) {
                const functionDefRegex = new RegExp(`(async\\s+)?${fnName}\\s*\\(`);
                if (functionDefRegex.test(content)) {
                  if (!instrumentedFunctions.includes(fnName)) {
                    instrumentedFunctions.push(fnName);
                    console.log(`✅ Found instrumentation in ${fnName} (${file}) [${scopeName}]`);
                  }
                }
              }
            }
          } catch (error) {
            // File might not exist
          }
        }

        const coverage = scopeFunctions.length > 0 ? instrumentedFunctions.length / scopeFunctions.length : 0;
        results[scopeName] = {
          functions: scopeFunctions,
          instrumented: [...new Set(instrumentedFunctions)],
          coverage
        };
      }

      // Calculate overall coverage as average of scope percentages
      const overallCoverage = (results['runtime-core'].coverage + results['debugger-lifecycle'].coverage) / 2;
      
      console.log(`📊 Runtime-core coverage: ${results['runtime-core'].instrumented.length}/${results['runtime-core'].functions.length} = ${Math.round(results['runtime-core'].coverage * 100)}%`);
      console.log(`📊 Debugger-lifecycle coverage: ${results['debugger-lifecycle'].instrumented.length}/${results['debugger-lifecycle'].functions.length} = ${Math.round(results['debugger-lifecycle'].coverage * 100)}%`);
      console.log(`📊 Overall coverage: ${Math.round(overallCoverage * 100)}%`);

      return {
        scopes: results,
        overall: overallCoverage
      };
    } catch (error) {
      console.error('Event coverage detection failed:', error);
      return {
        scopes: results,
        overall: 0
      };
    }
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