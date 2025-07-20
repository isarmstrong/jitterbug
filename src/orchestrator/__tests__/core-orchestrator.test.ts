/**
 * Core Orchestrator Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CoreOrchestrator } from '../core-orchestrator.js';
import { createBranchName } from '../types.js';
import type { DebugBranch, LogEntry } from '../types.js';

// Mock branch implementation
class MockBranch implements DebugBranch {
  name = createBranchName('test');
  version = '1.0.0';
  capabilities = ['logging'] as const;
  
  private state: 'initializing' | 'active' | 'suspended' | 'failed' | 'destroyed' = 'initializing';

  async initialize(): Promise<void> {
    this.state = 'active';
  }

  async cleanup(): Promise<void> {
    this.state = 'destroyed';
  }

  async suspend(): Promise<void> {
    this.state = 'suspended';
  }

  async resume(): Promise<void> {
    this.state = 'active';
  }

  async processLog(entry: LogEntry): Promise<void> {
    console.log(`MockBranch processing: ${entry.message}`);
  }

  async handleEvent(): Promise<void> {
    // Mock implementation
  }

  getState() {
    return this.state;
  }

  getConfig(): Record<string, unknown> {
    return {};
  }
}

describe('CoreOrchestrator', () => {
  let orchestrator: CoreOrchestrator;
  let mockBranch: MockBranch;

  beforeEach(async () => {
    orchestrator = new CoreOrchestrator();
    mockBranch = new MockBranch();
    await orchestrator.initialize();
  });

  it('should initialize successfully', () => {
    expect(orchestrator.initialized).toBe(true);
    expect(orchestrator.shuttingDown).toBe(false);
  });

  it('should register and retrieve branches', async () => {
    await orchestrator.registerBranch(mockBranch);
    
    const retrieved = orchestrator.getBranch(mockBranch.name);
    expect(retrieved).toBe(mockBranch);
    expect(orchestrator.getBranchNames()).toContain(mockBranch.name);
  });

  it('should process logs through registered branches', async () => {
    const processLogSpy = vi.spyOn(mockBranch, 'processLog');
    await orchestrator.registerBranch(mockBranch);

    const logEntry: LogEntry = {
      id: '1',
      timestamp: Date.now(),
      level: 'info',
      message: 'Test log message',
      metadata: {
        branch: mockBranch.name,
      },
    };

    await orchestrator.processLog(logEntry);
    expect(processLogSpy).toHaveBeenCalledWith(logEntry);
  });

  it('should unregister branches', async () => {
    await orchestrator.registerBranch(mockBranch);
    await orchestrator.unregisterBranch(mockBranch.name);
    
    expect(orchestrator.getBranch(mockBranch.name)).toBeNull();
    expect(orchestrator.getBranchNames()).not.toContain(mockBranch.name);
  });

  it('should track statistics', async () => {
    await orchestrator.registerBranch(mockBranch);
    
    const logEntry: LogEntry = {
      id: '1',
      timestamp: Date.now(),
      level: 'info',
      message: 'Test log message',
    };

    await orchestrator.processLog(logEntry);
    
    const stats = orchestrator.getStats();
    expect(stats.totalLogs).toBe(1);
    expect(stats.logsProcessed).toBe(1);
    expect(stats.logsFailed).toBe(0);
  });

  it('should shutdown gracefully', async () => {
    await orchestrator.registerBranch(mockBranch);
    await orchestrator.shutdown();
    
    expect(orchestrator.initialized).toBe(false);
    expect(orchestrator.shuttingDown).toBe(false);
    expect(orchestrator.getBranchNames()).toHaveLength(0);
  });
});