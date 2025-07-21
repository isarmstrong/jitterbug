#!/usr/bin/env npx tsx

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import * as ts from 'typescript';

interface APIPolicy {
  allowed: string[];
  maxCount: number;
}

interface VerificationResult {
  success: boolean;
  actualCount: number;
  allowedCount: number;
  violations: string[];
  unexpectedExports: string[];
}

class APIVerifier {
  private projectRoot: string;
  private policy: APIPolicy;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
    this.policy = this.loadPolicy();
  }

  private loadPolicy(): APIPolicy {
    const policyPath = join(this.projectRoot, 'scripts/digest/public-exports.json');
    if (!existsSync(policyPath)) {
      throw new Error(`Policy file not found: ${policyPath}`);
    }
    return JSON.parse(readFileSync(policyPath, 'utf8'));
  }

  private extractExports(filePath: string): string[] {
    if (!existsSync(filePath)) {
      throw new Error(`Index file not found: ${filePath}`);
    }

    const sourceCode = readFileSync(filePath, 'utf8');
    const sourceFile = ts.createSourceFile(
      filePath,
      sourceCode,
      ts.ScriptTarget.ES2020,
      true
    );

    const exports: string[] = [];

    function visit(node: ts.Node) {
      // Export declarations: export { foo, bar }
      if (ts.isExportDeclaration(node) && node.exportClause && ts.isNamedExports(node.exportClause)) {
        for (const element of node.exportClause.elements) {
          exports.push(element.name.text);
        }
      }
      // Type-only exports: export type { Foo }
      else if (ts.isExportDeclaration(node) && node.isTypeOnly && node.exportClause && ts.isNamedExports(node.exportClause)) {
        for (const element of node.exportClause.elements) {
          exports.push(element.name.text);
        }
      }
      // Direct exports: export function foo() {}
      else if (ts.isExportAssignment(node)) {
        // Handle export = statements
        if (ts.isIdentifier(node.expression)) {
          exports.push(node.expression.text);
        }
      }
      else if (node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
        // export function, export const, export class, etc.
        if (ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) {
          if (node.name) {
            exports.push(node.name.text);
          }
        }
        else if (ts.isVariableStatement(node)) {
          for (const declaration of node.declarationList.declarations) {
            if (ts.isIdentifier(declaration.name)) {
              exports.push(declaration.name.text);
            }
          }
        }
      }

      ts.forEachChild(node, visit);
    }

    visit(sourceFile);
    return [...new Set(exports)].sort();
  }

  private checkViolations(actualExports: string[]): { violations: string[]; unexpectedExports: string[] } {
    const violations: string[] = [];
    const unexpectedExports: string[] = [];
    const allowedSet = new Set(this.policy.allowed);

    // Check for unexpected exports
    for (const exportName of actualExports) {
      if (!allowedSet.has(exportName)) {
        unexpectedExports.push(exportName);
      }
    }

    // Check count violation
    if (actualExports.length > this.policy.maxCount) {
      violations.push(`Export count ${actualExports.length} exceeds maximum allowed ${this.policy.maxCount}`);
    }

    // Check for unauthorized exports
    if (unexpectedExports.length > 0) {
      violations.push(`Unauthorized exports: ${unexpectedExports.join(', ')}`);
    }

    return { violations, unexpectedExports };
  }

  verify(): VerificationResult {
    const indexPath = join(this.projectRoot, 'src/index.ts');
    const actualExports = this.extractExports(indexPath);
    const { violations, unexpectedExports } = this.checkViolations(actualExports);

    return {
      success: violations.length === 0,
      actualCount: actualExports.length,
      allowedCount: this.policy.maxCount,
      violations,
      unexpectedExports
    };
  }

  report(): void {
    const result = this.verify();
    const indexPath = join(this.projectRoot, 'src/index.ts');
    const actualExports = this.extractExports(indexPath);

    console.log('\n=== API Surface Verification ===');
    console.log(`File: ${indexPath}`);
    console.log(`Policy Max: ${result.allowedCount} exports`);
    console.log(`Actual: ${result.actualCount} exports`);

    if (result.success) {
      console.log('✅ API surface verification PASSED');
      console.log(`Exports: ${actualExports.join(', ')}`);
    } else {
      console.log('❌ API surface verification FAILED');
      console.log(`Current exports (${actualExports.length}):`);
      for (const exportName of actualExports) {
        const isAuthorized = this.policy.allowed.includes(exportName);
        console.log(`  ${isAuthorized ? '✅' : '❌'} ${exportName}`);
      }

      console.log('\nViolations:');
      for (const violation of result.violations) {
        console.log(`  - ${violation}`);
      }
    }
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const verifier = new APIVerifier();
  const result = verifier.verify();
  
  verifier.report();
  
  if (!result.success) {
    process.exit(1);
  }
}

export { APIVerifier, type APIPolicy, type VerificationResult };