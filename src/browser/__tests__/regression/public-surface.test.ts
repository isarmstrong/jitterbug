/**
 * Public Surface Regression Test
 * 
 * Guards against accidental export bloat by maintaining a snapshot
 * of allowed public exports. Add new exports explicitly here.
 * 
 * CRITICAL: Update EXPECTED_EXPORTS deliberately when adding APIs.
 */

import { describe, it, expect } from 'vitest';

// Locked surface snapshot - update deliberately only
const EXPECTED_EXPORTS = [
  'configPersistence',       // Task 3.4 - @experimental (config API - schema volatile)
  'emitJitterbugEvent',      // @experimental (programmatic emission)
  'ensureJitterbugReady',    // @experimental (initialization utility)
  'experimentalSafeEmit',    // @experimental (low-level emission - prefer jitterbug.emit())
  'initializeJitterbug',     // @stable (primary entry point)
  'logInspector',            // Task 3.5 Phase 1 - @experimental (query-only log inspection)
].sort();

const TIER_LIMITS = {
  stable: 5,      // Hard limit for stable APIs
  experimental: 8, // Reasonable limit for experimental APIs
  total: 10       // Overall budget to prevent surface explosion
};

describe('Public Surface Regression Guard', () => {
  it('should maintain exact export surface snapshot', async () => {
    // Import the main entry point
    const pkg = await import('../../index.js');
    
    // Get all exported symbol names (excluding TypeScript type-only exports)
    const exportedSymbols = Object.keys(pkg).sort();
    
    expect(exportedSymbols).toEqual(EXPECTED_EXPORTS);
  });
  
  it('should stay within tier-based export budgets', async () => {
    const pkg = await import('../../index.js');
    const exportCount = Object.keys(pkg).length;
    
    // Enforce total budget
    expect(exportCount).toBeLessThanOrEqual(TIER_LIMITS.total);
    
    // Note: Individual tier counting requires JSDoc parsing, not implemented yet
    // Future: Parse @stable/@experimental JSDoc to enforce tier-specific limits
  });

  it('should require deliberate surface changes', () => {
    // This test exists to make surface changes visible in PR diffs
    // When adding exports, you must update EXPECTED_EXPORTS above
    expect(EXPECTED_EXPORTS.length).toBeGreaterThan(0);
    expect(EXPECTED_EXPORTS.length).toBeLessThanOrEqual(TIER_LIMITS.total);
  });
  
  it('should prevent accidental type-only exports becoming runtime', async () => {
    const pkg = await import('../../index.js');
    
    // Verify all exports are functions or objects (not undefined/types)
    for (const [_name, value] of Object.entries(pkg)) {
      expect(typeof value).not.toBe('undefined');
      expect(value).not.toBeNull();
      // Note: TypeScript types should not appear in runtime Object.keys()
    }
  });
});