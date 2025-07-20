/**
 * Test Fixtures for Branch Management Testing
 * Provides reusable test data and state setups
 */

export interface TestBranchOptions {
  parent?: string;
  metadata?: Record<string, unknown>;
  autoActivate?: boolean;
}

export interface TestBranchData {
  name: string;
  options?: TestBranchOptions;
  shouldActivate?: boolean;
}

/**
 * Standard test branch configurations
 */
export const testBranches = {
  simple: {
    name: 'test-branch',
    options: {}
  },
  
  withParent: {
    name: 'child-branch', 
    options: { parent: 'main' }
  },
  
  withMetadata: {
    name: 'feature-branch',
    options: { 
      metadata: { 
        type: 'feature', 
        priority: 'high',
        tags: ['experimental', 'api'] 
      }
    }
  },
  
  autoActivate: {
    name: 'active-branch',
    options: { autoActivate: true }
  },
  
  complex: {
    name: 'complex-branch',
    options: {
      parent: 'main',
      metadata: { 
        complexity: 'high',
        estimated_hours: 8,
        dependencies: ['auth', 'database'],
        features: ['logging', 'metrics', 'alerts']
      }
    }
  }
} as const;

/**
 * Invalid branch names for testing validation
 */
export const invalidBranchNames = [
  '', // empty
  'a'.repeat(50), // too long
  '.starts-with-dot', // starts with dot
  'ends-with-dot.', // ends with dot
  'has spaces', // has spaces
  'has@special!chars', // special characters
  'has/slashes', // slashes
  'has\\backslashes' // backslashes
] as const;

/**
 * Valid edge case branch names
 */
export const validEdgeCaseBranchNames = [
  'a', // minimum length
  'a'.repeat(40), // maximum length
  'kebab-case-name', // hyphens
  'snake_case_name', // underscores
  'dot.separated.name', // dots
  'mixed-case_Name.123', // mixed everything
  'all-lowercase-123',
  'ALL-UPPERCASE-123'
] as const;

/**
 * Create a predictable set of branches for testing
 */
export function createTestBranchSet() {
  return [
    { name: 'main', active: true, enabled: true }, // Always present
    { name: 'feature-a', active: false, enabled: true },
    { name: 'debug-session', active: false, enabled: true },
    { name: 'experimental', active: false, enabled: false }
  ];
}

/**
 * Expected error messages for validation testing
 */
export const expectedErrors = {
  emptyName: 'Branch name must be a non-empty string',
  tooLong: 'Branch name must be 1-40 characters: letters, numbers, hyphens, underscores, dots only',
  invalidChars: 'Branch name must be 1-40 characters: letters, numbers, hyphens, underscores, dots only',
  startsWithDot: 'Branch name cannot start or end with a dot',
  endsWithDot: 'Branch name cannot start or end with a dot',
  duplicate: (name: string) => `Branch '${name}' already exists`,
  nonExistentParent: (parent: string) => `Parent branch '${parent}' does not exist`,
  circularReference: (name: string, parent: string) => `Creating branch '${name}' with parent '${parent}' would create a cycle`,
  deleteMain: 'Cannot delete the main branch',
  disableMain: 'Cannot disable the main branch',
  deleteWithChildren: (name: string, count: number) => `Cannot delete branch '${name}': has ${count} child branches`,
  branchNotFound: (name: string) => `Branch '${name}' does not exist`
} as const;

/**
 * Create a hierarchy of test branches
 */
export function createBranchHierarchy() {
  return {
    main: {
      name: 'main',
      children: ['feature', 'hotfix']
    },
    feature: {
      name: 'feature',
      parent: 'main',
      children: ['feature-auth', 'feature-api']
    },
    hotfix: {
      name: 'hotfix', 
      parent: 'main',
      children: []
    },
    'feature-auth': {
      name: 'feature-auth',
      parent: 'feature',
      children: []
    },
    'feature-api': {
      name: 'feature-api',
      parent: 'feature',
      children: []
    }
  };
}

/**
 * Event capture helper for testing emissions
 */
export function createEventCapture() {
  const events: any[] = [];
  
  const capture = (event: any) => {
    events.push({
      type: event.type,
      payload: event.payload,
      timestamp: event.t,
      level: event.level,
      branch: event.branch
    });
  };
  
  const getEvents = () => [...events];
  const clear = () => events.splice(0, events.length);
  const getEventTypes = () => events.map(e => e.type);
  const getEventsOfType = (type: string) => events.filter(e => e.type === type);
  
  return {
    capture,
    getEvents,
    clear,
    getEventTypes,
    getEventsOfType
  };
}