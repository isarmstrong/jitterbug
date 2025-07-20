/**
 * Global Test Setup
 * Runs before each test to ensure clean state
 */

import { beforeEach, afterEach, expect } from 'vitest';
import { experimentalBranches } from '../branch-manager.js';

// Custom matchers for jitterbug API testing
expect.extend({
  toBeBranchRecord(received: unknown) {
    const isValid = received && 
      typeof received === 'object' &&
      typeof (received as any).name === 'string' &&
      typeof (received as any).active === 'boolean' &&
      typeof (received as any).enabled === 'boolean' &&
      (received as any).stats && 
      typeof (received as any).stats.events === 'number' &&
      typeof (received as any).stats.errors === 'number';
    
    return {
      message: () => `expected ${JSON.stringify(received)} to be a valid branch record with name, active, enabled, and stats fields`,
      pass: Boolean(isValid),
    };
  },

  toBeBranchSummary(received: unknown) {
    const isValid = received && 
      typeof received === 'object' &&
      typeof (received as any).name === 'string' &&
      typeof (received as any).active === 'boolean' &&
      typeof (received as any).enabled === 'boolean' &&
      typeof (received as any).eventCount === 'number' &&
      typeof (received as any).errorCount === 'number';
    
    return {
      message: () => `expected ${JSON.stringify(received)} to be a valid branch summary`,
      pass: Boolean(isValid),
    };
  },

  toBeValidBranchName(received: unknown) {
    const isValid = typeof received === 'string' && 
      received.length > 0 && 
      received.length <= 40 &&
      /^[a-z0-9\-_.]+$/i.test(received) &&
      !received.startsWith('.') &&
      !received.endsWith('.');
    
    return {
      message: () => `expected "${received}" to be a valid branch name (1-40 chars, alphanumeric + hyphens/dots/underscores, no leading/trailing dots)`,
      pass: Boolean(isValid),
    };
  }
});

// Global setup and teardown
beforeEach(() => {
  // Reset to clean state before each test
  const branches = experimentalBranches.list();
  for (const branch of branches) {
    if (branch.name !== 'main') {
      try {
        experimentalBranches.delete(branch.name);
      } catch {
        // Ignore deletion errors during cleanup
      }
    }
  }
  
  // Ensure main is active and enabled
  experimentalBranches.setActive('main');
  experimentalBranches.enable('main');
});

afterEach(() => {
  // Additional cleanup if needed
  // Currently no persistent state between tests
});

// Extend vitest types for custom matchers
declare module 'vitest' {
  interface Assertion<T = any> {
    toBeBranchRecord(): T;
    toBeBranchSummary(): T;
    toBeValidBranchName(): T;
  }
  interface AsymmetricMatchersContaining {
    toBeBranchRecord(): any;
    toBeBranchSummary(): any;
    toBeValidBranchName(): any;
  }
}