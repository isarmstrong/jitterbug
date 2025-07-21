/**
 * Push Orchestrator Back-pressure Tests - P4.3 Micro-Task B
 * Tests basic orchestrator mechanics and connection management
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PushOrchestratorV2 } from '../core/push-orchestrator-v2.js';
import { PushResult, type PushAdapter } from '../adapters/ssePushAdapter.js';

// Mock adapter for testing
class MockPushAdapter implements PushAdapter {
  private connected = true;
  private shouldReturnSlow = false;
  private shouldError = false;
  public sentFrames: any[] = [];

  constructor(private connectionId: string) {}

  async send(frame: any): Promise<PushResult> {
    if (this.shouldError) {
      return PushResult.ERROR;
    }

    this.sentFrames.push(frame);
    
    if (this.shouldReturnSlow) {
      return PushResult.SLOW;
    }
    
    return PushResult.SUCCESS;
  }

  isConnected(): boolean {
    return this.connected;
  }

  getConnectionId(): string {
    return this.connectionId;
  }

  // Test helpers
  setSlowMode(slow: boolean): void {
    this.shouldReturnSlow = slow;
  }

  setErrorMode(error: boolean): void {
    this.shouldError = error;
    if (error) {
      this.connected = false; // Errors cause disconnection
    }
  }

  disconnect(): void {
    this.connected = false;
  }

  getSentFrames(): any[] {
    return [...this.sentFrames];
  }
}

describe('Push Orchestrator Back-pressure - P4.3 Micro-Task B', () => {
  let orchestrator: PushOrchestratorV2;
  
  beforeEach(() => {
    vi.useFakeTimers();
    orchestrator = new PushOrchestratorV2({
      fps: 10, // 100ms ticks for easier testing
      frameCapacityPerConnection: 5, // Small buffer for testing overflow
      maxFramesPerTick: 3
    });
  });

  afterEach(() => {
    orchestrator.stop();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('Basic orchestrator lifecycle', () => {
    it('should start and stop cleanly', () => {
      expect(orchestrator.getMetrics().connectionCount).toBe(0);
      
      orchestrator.start();
      orchestrator.stop();
      
      // Should be idempotent
      orchestrator.stop();
    });

    it('should prevent double start', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      orchestrator.start();
      orchestrator.start(); // Should warn
      
      expect(consoleSpy).toHaveBeenCalledWith('[PushOrchestratorV2] Already running');
      consoleSpy.mockRestore();
    });

    it('should validate configuration', () => {
      expect(() => new PushOrchestratorV2({ fps: 0 })).toThrow('FPS must be between 1 and 60');
      expect(() => new PushOrchestratorV2({ fps: 70 })).toThrow('FPS must be between 1 and 60');
      expect(() => new PushOrchestratorV2({ maxFramesPerTick: 100 })).toThrow('maxFramesPerTick cannot exceed 50 for DoS protection');
    });
  });

  describe('Connection management', () => {
    it('should add and remove connections', () => {
      const adapter = new MockPushAdapter('test-conn');
      
      orchestrator.addConnection('test-conn', adapter);
      expect(orchestrator.getMetrics().connectionCount).toBe(1);
      
      orchestrator.removeConnection('test-conn');
      expect(orchestrator.getMetrics().connectionCount).toBe(0);
    });

    it('should prevent duplicate connections', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const adapter = new MockPushAdapter('test-conn');
      
      orchestrator.addConnection('test-conn', adapter);
      orchestrator.addConnection('test-conn', adapter); // Should warn
      
      expect(consoleSpy).toHaveBeenCalledWith('[PushOrchestratorV2] Connection test-conn already exists');
      expect(orchestrator.getMetrics().connectionCount).toBe(1);
      
      consoleSpy.mockRestore();
    });

    it('should remove disconnected connections during tick', () => {
      const adapter = new MockPushAdapter('test-conn');
      orchestrator.addConnection('test-conn', adapter);
      orchestrator.start();
      
      // Disconnect the adapter
      adapter.disconnect();
      
      // Advance time to trigger tick
      vi.advanceTimersByTime(100);
      
      // Connection should be removed when tick detects disconnection
      expect(orchestrator.getMetrics().connectionCount).toBe(0);
    });
  });

  describe('Basic tick functionality', () => {
    it('should run tick loop at configured FPS', () => {
      const adapter = new MockPushAdapter('tick-test');
      orchestrator.addConnection('tick-test', adapter);
      
      orchestrator.start();
      
      // No frames should be sent without emitters
      vi.advanceTimersByTime(500); // 5 ticks
      
      const sentFrames = adapter.getSentFrames();
      expect(sentFrames).toHaveLength(0);
    });

    it('should handle adapter errors gracefully', () => {
      const adapter = new MockPushAdapter('error-conn');
      adapter.setErrorMode(true);
      
      orchestrator.addConnection('error-conn', adapter);
      orchestrator.start();
      
      // Even with error mode, tick should continue running
      vi.advanceTimersByTime(200);
      
      // Connection should be removed on error
      expect(orchestrator.getMetrics().connectionCount).toBe(0);
    });
  });

  describe('Metrics and monitoring', () => {
    it('should provide basic metrics', () => {
      const metrics = orchestrator.getMetrics();
      expect(metrics).toHaveProperty('framesSent');
      expect(metrics).toHaveProperty('framesDropped');
      expect(metrics).toHaveProperty('backoffEvents');
      expect(metrics).toHaveProperty('emissionErrors');
      expect(metrics).toHaveProperty('connectionCount');
    });

    it('should provide connection statistics', () => {
      const adapter1 = new MockPushAdapter('conn-1');
      const adapter2 = new MockPushAdapter('conn-2');
      
      orchestrator.addConnection('conn-1', adapter1);
      orchestrator.addConnection('conn-2', adapter2);
      
      const stats = orchestrator.getConnectionStats();
      expect(stats).toHaveLength(2);
      expect(stats[0].id).toBe('conn-1');
      expect(stats[1].id).toBe('conn-2');
      expect(stats[0].bufferStats).toHaveProperty('capacity');
      expect(stats[0].bufferStats).toHaveProperty('size');
      expect(stats[0]).toHaveProperty('backoffMs');
    });
  });

  describe('RingBuffer integration', () => {
    it('should track buffer statistics', () => {
      const adapter = new MockPushAdapter('buffer-test');
      orchestrator.addConnection('buffer-test', adapter);
      
      const stats = orchestrator.getConnectionStats();
      expect(stats[0].bufferStats.capacity).toBe(5); // From config
      expect(stats[0].bufferStats.size).toBe(0);
      expect(stats[0].bufferStats.dropped).toBe(0);
    });
  });
});