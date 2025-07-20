/**
 * Branch Manager Tests - Advanced Vitest Patterns
 * Uses snapshots, custom matchers, fixtures, and event testing
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { experimentalBranches } from '../branch-manager.js';
import { 
  testBranches, 
  invalidBranchNames, 
  validEdgeCaseBranchNames,
  // createEventCapture, // Future: for event emission testing
  // createBranchHierarchy // Future: for complex hierarchy testing
} from './fixtures.js';

describe('BranchManager (Advanced Testing)', () => {
  // Future: Event capture for testing lifecycle events
  // let eventCapture: ReturnType<typeof createEventCapture>;

  beforeEach(() => {
    // eventCapture = createEventCapture();
    // Note: Global setup handles branch cleanup
  });

  describe('API Contract & Shape', () => {
    it('should maintain stable branch record structure', () => {
      const result = experimentalBranches.create('snapshot-test', testBranches.withMetadata.options);
      
      expect(result).toBeBranchRecord();
      expect(result).toMatchSnapshot({
        createdAt: expect.any(String),
        stats: {
          lastEventAt: expect.any(String)
        }
      });
    });

    it('should maintain stable list output structure', () => {
      // Create predictable branch set
      experimentalBranches.create(testBranches.simple.name);
      experimentalBranches.create(testBranches.withParent.name, testBranches.withParent.options);
      experimentalBranches.setActive(testBranches.simple.name);
      
      const branches = experimentalBranches.list();
      
      expect(branches).toHaveLength(3);
      branches.forEach(branch => {
        expect(branch).toBeBranchSummary();
      });
      
      expect(branches).toMatchSnapshot(
        branches.map(() => ({ lastActivity: expect.any(String) }))
      );
    });

    it('should maintain stable detailed branch structure', () => {
      experimentalBranches.create('detailed-test', testBranches.complex.options);
      const details = experimentalBranches.get('detailed-test');
      
      expect(details).toMatchSnapshot({
        createdAt: expect.any(String),
        lastActivity: expect.any(String)
      });
    });
  });

  describe('Validation with Fixtures', () => {
    it('should reject all invalid branch names consistently', () => {
      const errors: string[] = [];
      
      for (const invalidName of invalidBranchNames) {
        try {
          experimentalBranches.create(invalidName);
        } catch (error) {
          errors.push((error as Error).message);
        }
      }
      
      expect(errors).toMatchSnapshot();
      expect(errors).toHaveLength(invalidBranchNames.length);
    });

    it('should accept all valid edge case names', () => {
      const results: string[] = [];
      
      for (const validName of validEdgeCaseBranchNames) {
        try {
          experimentalBranches.create(validName);
          expect(validName).toBeValidBranchName();
          results.push(`✓ ${validName}`);
          experimentalBranches.delete(validName); // Cleanup
        } catch (error) {
          results.push(`✗ ${validName}: ${(error as Error).message}`);
        }
      }
      
      expect(results).toMatchSnapshot();
      expect(results.every(r => r.startsWith('✓'))).toBe(true);
    });

    it('should provide consistent error messages', () => {
      const errorTests = [
        { test: () => experimentalBranches.create(''), expectedPattern: 'non-empty string' },
        { test: () => experimentalBranches.create('a'.repeat(50)), expectedPattern: '1-40 characters' },
        { test: () => experimentalBranches.create('.invalid'), expectedPattern: 'cannot start' },
        { test: () => experimentalBranches.delete('main'), expectedPattern: 'Cannot delete the main branch' },
        { test: () => experimentalBranches.disable('main'), expectedPattern: 'Cannot disable the main branch' }
      ];
      
      const actualErrors = errorTests.map(({ test, expectedPattern }) => {
        try {
          test();
          return `No error thrown`;
        } catch (error) {
          const message = (error as Error).message;
          const matches = message.includes(expectedPattern);
          return matches ? `✓ ${message}` : `✗ Expected pattern "${expectedPattern}" in "${message}"`;
        }
      });
      
      expect(actualErrors).toMatchSnapshot();
      expect(actualErrors.every(e => e.startsWith('✓'))).toBe(true);
    });
  });

  describe('Hierarchical Operations', () => {
    it('should handle complex branch hierarchies', () => {
      
      // Build the hierarchy
      experimentalBranches.create('feature', { parent: 'main' });
      experimentalBranches.create('hotfix', { parent: 'main' });
      experimentalBranches.create('feature-auth', { parent: 'feature' });
      experimentalBranches.create('feature-api', { parent: 'feature' });
      
      const branches = experimentalBranches.list();
      expect(branches).toHaveLength(5); // main + 4 created
      
      // Test hierarchy constraints
      expect(() => experimentalBranches.delete('feature')).toThrow('has 2 child branches');
      
      // Test successful cleanup order
      experimentalBranches.delete('feature-auth');
      experimentalBranches.delete('feature-api');
      expect(() => experimentalBranches.delete('feature')).not.toThrow();
    });

    it('should prevent circular references in complex scenarios', () => {
      experimentalBranches.create('a');
      experimentalBranches.create('b', { parent: 'a' });
      experimentalBranches.create('c', { parent: 'b' });
      
      // Try to create cycle: a -> b -> c -> a
      expect(() => experimentalBranches.create('a', { parent: 'c' })).toThrow('would create a cycle');
    });
  });

  describe('Performance & Resource Management', () => {
    it('should handle rapid branch operations efficiently', () => {
      const start = performance.now();
      
      // Create many branches rapidly
      for (let i = 0; i < 50; i++) {
        experimentalBranches.create(`perf-test-${i}`);
      }
      
      const createTime = performance.now() - start;
      expect(createTime).toBeLessThan(100); // Should complete in < 100ms
      
      const listStart = performance.now();
      const branches = experimentalBranches.list();
      const listTime = performance.now() - listStart;
      
      expect(branches).toHaveLength(51); // main + 50 created
      expect(listTime).toBeLessThan(10); // List should be very fast
    });

    it('should maintain memory efficiency with branch deletion', () => {
      // Create and delete many branches
      for (let i = 0; i < 100; i++) {
        experimentalBranches.create(`temp-${i}`);
        experimentalBranches.delete(`temp-${i}`);
      }
      
      const finalBranches = experimentalBranches.list();
      expect(finalBranches).toHaveLength(1); // Only main should remain
    });
  });

  describe('State Isolation', () => {
    it('should maintain isolated state between operations', () => {
      // Create branch in first "context"
      experimentalBranches.create('isolated-1');
      const beforeState = experimentalBranches.list().map(b => b.name);
      
      // Simulate second "context" operations
      experimentalBranches.create('isolated-2');
      experimentalBranches.setActive('isolated-2');
      
      // Verify first context state is preserved but extended
      const afterState = experimentalBranches.list().map(b => b.name);
      expect(beforeState.every(name => afterState.includes(name))).toBe(true);
      expect(afterState).toContain('isolated-2');
      expect(experimentalBranches.getActive()).toBe('isolated-2');
    });

    it('should handle concurrent-like operations gracefully', () => {
      // Simulate rapid state changes
      const operations = [
        () => experimentalBranches.create('concurrent-1'),
        () => experimentalBranches.create('concurrent-2'),
        () => experimentalBranches.setActive('concurrent-1'),
        () => experimentalBranches.setActive('concurrent-2'),
        () => experimentalBranches.disable('concurrent-1'),
        () => experimentalBranches.enable('concurrent-1')
      ];
      
      // Execute all operations
      operations.forEach(op => op());
      
      // Verify final state is consistent
      const branches = experimentalBranches.list();
      expect(branches.find(b => b.name === 'concurrent-1')).toBeTruthy();
      expect(branches.find(b => b.name === 'concurrent-2')).toBeTruthy();
      expect(experimentalBranches.getActive()).toBe('concurrent-2');
    });
  });

  describe('Integration Points', () => {
    it('should maintain branch state during activation switches', () => {
      const branch1 = experimentalBranches.create('integration-1');
      const branch2 = experimentalBranches.create('integration-2');
      
      expect(branch1.active).toBe(false);
      expect(branch2.active).toBe(false);
      
      experimentalBranches.setActive('integration-1');
      
      const updatedBranches = experimentalBranches.list();
      const activeBranch = updatedBranches.find(b => b.name === 'integration-1');
      const inactiveBranch = updatedBranches.find(b => b.name === 'integration-2');
      const mainBranch = updatedBranches.find(b => b.name === 'main');
      
      expect(activeBranch?.active).toBe(true);
      expect(inactiveBranch?.active).toBe(false);
      expect(mainBranch?.active).toBe(false);
    });

    it('should handle enable/disable state correctly', () => {
      experimentalBranches.create('state-test');
      
      expect(experimentalBranches._manager.isBranchEnabled('state-test')).toBe(true);
      
      experimentalBranches.disable('state-test');
      expect(experimentalBranches._manager.isBranchEnabled('state-test')).toBe(false);
      
      experimentalBranches.enable('state-test');
      expect(experimentalBranches._manager.isBranchEnabled('state-test')).toBe(true);
    });
  });
});