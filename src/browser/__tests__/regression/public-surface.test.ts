/**
 * Public Surface Regression Test
 * 
 * Guards against accidental export bloat by maintaining a snapshot
 * of allowed public exports. Add new exports explicitly here.
 */

import { describe, it, expect } from 'vitest';

describe('Public Surface Regression Guard', () => {
  it('should maintain stable export surface', async () => {
    // Import the main entry point
    const pkg = await import('../../index.js');
    
    // Get all exported symbol names (excluding TypeScript type-only exports)
    const exportedSymbols = Object.keys(pkg).sort();
    
    // Current allowed exports (update this when adding new public APIs)
    const allowedExports = [
      'configPersistence',       // Task 3.4 - @experimental
      'emitJitterbugEvent',      // @experimental
      'ensureJitterbugReady',    // @experimental  
      'experimentalSafeEmit',    // @experimental
      'initializeJitterbug',     // @stable
      // 'logInspector',         // Task 3.5 - add when implementing
    ].sort();
    
    expect(exportedSymbols).toEqual(allowedExports);
  });
  
  it('should not exceed export budget', async () => {
    const pkg = await import('../../index.js');
    const exportCount = Object.keys(pkg).length;
    
    // Current budget: 5 exports (will be 6 after Task 3.5)
    const maxAllowedExports = 6;
    
    expect(exportCount).toBeLessThanOrEqual(maxAllowedExports);
  });
});