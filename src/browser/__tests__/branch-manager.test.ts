/**
 * Branch Manager Tests
 * Basic functionality tests for Task 3.2 implementation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { BranchManager } from '../branch-manager.js';

describe('BranchManager', () => {
  let manager: BranchManager;

  beforeEach(() => {
    manager = new BranchManager();
  });

  describe('initialization', () => {
    it('should start with main branch as active', () => {
      expect(manager.getActiveBranch()).toBe('main');
    });

    it('should have main branch in branches list', () => {
      const branches = manager.getBranches();
      expect(branches).toHaveLength(1);
      expect(branches[0].name).toBe('main');
      expect(branches[0].active).toBe(true);
      expect(branches[0].enabled).toBe(true);
    });
  });

  describe('createBranch', () => {
    it('should create a new branch successfully', () => {
      const result = manager.createBranch('test-branch');
      
      expect(result.name).toBe('test-branch');
      expect(result.active).toBe(false);
      expect(result.enabled).toBe(true);
      expect(result.parent).toBeUndefined();
    });

    it('should create branch with parent', () => {
      const result = manager.createBranch('child-branch', { parent: 'main' });
      
      expect(result.parent).toBe('main');
    });

    it('should auto-activate if requested', () => {
      manager.createBranch('auto-active', { autoActivate: true });
      
      expect(manager.getActiveBranch()).toBe('auto-active');
    });

    it('should reject invalid branch names', () => {
      expect(() => manager.createBranch('')).toThrow();
      expect(() => manager.createBranch('invalid-name-with-way-too-many-characters-exceeding-limit')).toThrow();
      expect(() => manager.createBranch('.starts-with-dot')).toThrow();
      expect(() => manager.createBranch('ends-with-dot.')).toThrow();
    });

    it('should reject duplicate branch names', () => {
      manager.createBranch('duplicate');
      expect(() => manager.createBranch('duplicate')).toThrow();
    });

    it('should reject non-existent parent', () => {
      expect(() => manager.createBranch('orphan', { parent: 'non-existent' })).toThrow();
    });

    it('should prevent circular references', () => {
      manager.createBranch('parent');
      manager.createBranch('child', { parent: 'parent' });
      
      expect(() => manager.createBranch('parent', { parent: 'child' })).toThrow();
    });
  });

  describe('getBranches and listActiveBranches', () => {
    beforeEach(() => {
      manager.createBranch('branch1');
      manager.createBranch('branch2', { autoActivate: true });
      manager.createBranch('branch3');
    });

    it('should return all branches', () => {
      const branches = manager.getBranches();
      expect(branches).toHaveLength(4); // main + 3 created
      
      const names = branches.map(b => b.name);
      expect(names).toContain('main');
      expect(names).toContain('branch1');
      expect(names).toContain('branch2');
      expect(names).toContain('branch3');
    });

    it('should return only active branches', () => {
      const activeBranches = manager.listActiveBranches();
      expect(activeBranches).toHaveLength(1);
      expect(activeBranches[0].name).toBe('branch2');
    });
  });

  describe('branch activation', () => {
    beforeEach(() => {
      manager.createBranch('test-branch');
    });

    it('should set active branch', () => {
      manager.setActiveBranch('test-branch');
      expect(manager.getActiveBranch()).toBe('test-branch');
    });

    it('should deactivate previous branch', () => {
      manager.setActiveBranch('test-branch');
      
      const branches = manager.getBranches();
      const mainBranch = branches.find(b => b.name === 'main');
      const testBranch = branches.find(b => b.name === 'test-branch');
      
      expect(mainBranch?.active).toBe(false);
      expect(testBranch?.active).toBe(true);
    });

    it('should reject non-existent branch', () => {
      expect(() => manager.setActiveBranch('non-existent')).toThrow();
    });
  });

  describe('branch enable/disable', () => {
    beforeEach(() => {
      manager.createBranch('test-branch');
    });

    it('should disable and enable branches', () => {
      expect(manager.isBranchEnabled('test-branch')).toBe(true);
      
      manager.disableBranch('test-branch');
      expect(manager.isBranchEnabled('test-branch')).toBe(false);
      
      manager.enableBranch('test-branch');
      expect(manager.isBranchEnabled('test-branch')).toBe(true);
    });

    it('should not allow disabling main branch', () => {
      expect(() => manager.disableBranch('main')).toThrow();
    });

    it('should reject non-existent branches', () => {
      expect(() => manager.enableBranch('non-existent')).toThrow();
      expect(() => manager.disableBranch('non-existent')).toThrow();
    });
  });

  describe('deleteBranch', () => {
    beforeEach(() => {
      manager.createBranch('test-branch');
    });

    it('should delete branch successfully', () => {
      const result = manager.deleteBranch('test-branch');
      expect(result).toBe(true);
      
      const branches = manager.getBranches();
      expect(branches.find(b => b.name === 'test-branch')).toBeUndefined();
    });

    it('should not allow deleting main branch', () => {
      expect(() => manager.deleteBranch('main')).toThrow();
    });

    it('should switch to main if deleting active branch', () => {
      manager.setActiveBranch('test-branch');
      manager.deleteBranch('test-branch');
      
      expect(manager.getActiveBranch()).toBe('main');
    });

    it('should prevent deleting branch with children', () => {
      manager.createBranch('child', { parent: 'test-branch' });
      
      expect(() => manager.deleteBranch('test-branch')).toThrow();
    });

    it('should return false for non-existent branch', () => {
      const result = manager.deleteBranch('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('event recording', () => {
    beforeEach(() => {
      manager.createBranch('test-branch');
    });

    it('should record events for enabled branches', () => {
      manager.recordEventForBranch('test-branch');
      
      const branch = manager.getBranch('test-branch');
      expect(branch?.eventCount).toBe(1);
      expect(branch?.errorCount).toBe(0);
    });

    it('should record errors separately', () => {
      manager.recordEventForBranch('test-branch', true);
      
      const branch = manager.getBranch('test-branch');
      expect(branch?.eventCount).toBe(1);
      expect(branch?.errorCount).toBe(1);
    });

    it('should not record for disabled branches', () => {
      manager.disableBranch('test-branch');
      manager.recordEventForBranch('test-branch');
      
      const branch = manager.getBranch('test-branch');
      expect(branch?.eventCount).toBe(0);
    });

    it('should update lastActivity timestamp', () => {
      const beforeTime = new Date().toISOString();
      manager.recordEventForBranch('test-branch');
      const afterTime = new Date().toISOString();
      
      const branch = manager.getBranch('test-branch');
      expect(branch?.lastActivity).toBeDefined();
      expect(branch?.lastActivity! >= beforeTime).toBe(true);
      expect(branch?.lastActivity! <= afterTime).toBe(true);
    });
  });
});