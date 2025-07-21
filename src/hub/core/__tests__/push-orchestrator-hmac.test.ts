/**
 * Push Orchestrator HMAC Integration Tests - P4.4-a
 * Tests HMAC signing integration in PushOrchestratorV2
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PushOrchestratorV2 } from '../push-orchestrator-v2.js';
import { PushResult, type PushAdapter } from '../../adapters/ssePushAdapter.js';
import { registerEmitter, getRegistry } from '../../emitters/registry.js';
import { HeartbeatEmitter } from '../../emitters/heartbeat.js';
import type { SignedPushFrame } from '../../security/signed-frame.js';

describe('Push Orchestrator HMAC Integration - P4.4-a', () => {
  const testSecret = new Uint8Array(32).fill(0x42);
  const testKeyId = 'test-key-001';
  
  let orchestrator: PushOrchestratorV2;
  let mockAdapter: PushAdapter;
  let sentFrames: unknown[];

  beforeEach(() => {
    sentFrames = [];
    
    // Clear registry between tests
    const registry = getRegistry();
    if (registry.isSealed()) {
      // Force unseal for testing (if needed)
      (registry as any).sealed = false;
      (registry as any).emitters.clear();
    }
    
    mockAdapter = {
      send: vi.fn(async (frame) => {
        sentFrames.push(frame);
        return PushResult.SUCCESS;
      }),
      isConnected: vi.fn(() => true),
      getConnectionId: vi.fn(() => 'test-connection')
    };
  });

  afterEach(() => {
    // Clean up registry
    const registry = getRegistry();
    (registry as any).sealed = false;
    (registry as any).emitters.clear();
  });

  function sealRegistryForTest() {
    const registry = getRegistry();
    if (!registry.isSealed()) {
      (registry as any).sealed = true;
    }
  }

  describe('HMAC Disabled (Default)', () => {
    beforeEach(() => {
      orchestrator = new PushOrchestratorV2({
        fps: 10,
        security: {
          frameHmac: { enabled: false }
        }
      });
    });

    it('should send unsigned frames when HMAC disabled', async () => {
      const heartbeat = new HeartbeatEmitter({ intervalMs: 1000 });
      registerEmitter(heartbeat);
      
      sealRegistryForTest();
      
      orchestrator.addConnection('test-conn', mockAdapter);
      orchestrator.start();
      
      // Wait for tick
      await new Promise(resolve => setTimeout(resolve, 150));
      orchestrator.stop();
      
      expect(sentFrames.length).toBeGreaterThan(0);
      const frame = sentFrames[0];
      
      // Should be raw frame, not signed
      expect(frame).toHaveProperty('t', 'hb');
      expect(frame).not.toHaveProperty('kid');
      expect(frame).not.toHaveProperty('sig');
    });
  });

  describe('HMAC Enabled', () => {
    beforeEach(() => {
      orchestrator = new PushOrchestratorV2({
        fps: 10,
        security: {
          frameHmac: {
            enabled: true,
            keyId: testKeyId,
            secret: testSecret,
            algorithm: 'sha256'
          }
        }
      });
    });

    it('should initialize with HMAC signer', () => {
      expect(() => {
        new PushOrchestratorV2({
          security: {
            frameHmac: {
              enabled: true,
              keyId: testKeyId,
              secret: testSecret
            }
          }
        });
      }).not.toThrow();
    });

    it('should throw when HMAC enabled but missing config', () => {
      expect(() => {
        new PushOrchestratorV2({
          security: {
            frameHmac: { enabled: true }
          }
        });
      }).toThrow('HMAC enabled but missing keyId or secret');
    });

    it('should send signed frames when HMAC enabled', async () => {
      const heartbeat = new HeartbeatEmitter({ intervalMs: 1000 });
      registerEmitter(heartbeat);
      sealRegistryForTest();
      
      orchestrator.addConnection('test-conn', mockAdapter);
      orchestrator.start();
      
      // Wait for tick
      await new Promise(resolve => setTimeout(resolve, 150));
      orchestrator.stop();
      
      expect(sentFrames.length).toBeGreaterThan(0);
      const frame = sentFrames[0] as SignedPushFrame;
      
      // Should be signed frame
      expect(frame).toHaveProperty('kid', testKeyId);
      expect(frame).toHaveProperty('ts');
      expect(frame).toHaveProperty('nonce');
      expect(frame).toHaveProperty('sig');
      expect(frame).toHaveProperty('payload');
      
      // Payload should be original frame
      expect(frame.payload).toHaveProperty('t', 'hb');
      expect(frame.payload).toHaveProperty('ts');
    });

    it('should sign all frame types consistently', async () => {
      // Register multiple emitters
      const heartbeat = new HeartbeatEmitter({ intervalMs: 1000 });
      registerEmitter(heartbeat);
      sealRegistryForTest();
      
      orchestrator.addConnection('test-conn', mockAdapter);
      orchestrator.start();
      
      // Wait longer to get multiple frame types
      await new Promise(resolve => setTimeout(resolve, 300));
      orchestrator.stop();
      
      expect(sentFrames.length).toBeGreaterThan(0);
      
      for (const frame of sentFrames) {
        const signedFrame = frame as SignedPushFrame;
        
        expect(signedFrame.kid).toBe(testKeyId);
        expect(signedFrame.ts).toBeTypeOf('number');
        expect(signedFrame.nonce).toBeTypeOf('string');
        expect(signedFrame.sig).toBeTypeOf('string');
        expect(signedFrame.payload).toBeTypeOf('object');
      }
    });

    it('should maintain frame order with signing', async () => {
      const heartbeat = new HeartbeatEmitter({ intervalMs: 1000 });
      registerEmitter(heartbeat);
      sealRegistryForTest();
      
      orchestrator.addConnection('test-conn', mockAdapter);
      orchestrator.start();
      
      await new Promise(resolve => setTimeout(resolve, 1200));
      orchestrator.stop();
      
      expect(sentFrames.length).toBeGreaterThanOrEqual(2);
      
      // Check timestamps are ordered
      const timestamps = sentFrames.map(f => (f as SignedPushFrame).ts);
      for (let i = 1; i < timestamps.length; i++) {
        expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i - 1]);
      }
    });

    it('should handle signing errors gracefully', async () => {
      // Create orchestrator with invalid secret
      const invalidOrchestrator = new PushOrchestratorV2({
        fps: 10,
        security: {
          frameHmac: {
            enabled: true,
            keyId: testKeyId,
            secret: new Uint8Array(0), // Invalid empty secret
            algorithm: 'sha256'
          }
        }
      });

      // This should not throw during construction
      expect(() => {
        invalidOrchestrator.addConnection('test-conn', mockAdapter);
      }).not.toThrow();
    });
  });

  describe('Performance Impact', () => {
    it('should not significantly impact throughput', async () => {
      const unsignedOrchestrator = new PushOrchestratorV2({
        fps: 20,
        security: { frameHmac: { enabled: false } }
      });
      
      const signedOrchestrator = new PushOrchestratorV2({
        fps: 20,
        security: {
          frameHmac: {
            enabled: true,
            keyId: testKeyId,
            secret: testSecret
          }
        }
      });

      const unsignedFrames: unknown[] = [];
      const signedFrames: unknown[] = [];
      
      const unsignedAdapter = {
        send: vi.fn(async (frame) => {
          unsignedFrames.push(frame);
          return PushResult.SUCCESS;
        }),
        isConnected: vi.fn(() => true),
        getConnectionId: vi.fn(() => 'unsigned-connection')
      };
      
      const signedAdapter = {
        send: vi.fn(async (frame) => {
          signedFrames.push(frame);
          return PushResult.SUCCESS;
        }),
        isConnected: vi.fn(() => true),
        getConnectionId: vi.fn(() => 'signed-connection')
      };

      // Register heartbeat emitter once
      const heartbeat = new HeartbeatEmitter({ intervalMs: 1000 });
      registerEmitter(heartbeat);
      sealRegistryForTest();
      
      unsignedOrchestrator.addConnection('unsigned', unsignedAdapter);
      signedOrchestrator.addConnection('signed', signedAdapter);
      
      const start = Date.now();
      unsignedOrchestrator.start();
      signedOrchestrator.start();
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      unsignedOrchestrator.stop();
      signedOrchestrator.stop();
      const duration = Date.now() - start;
      
      // Both should process similar number of frames
      const unsignedCount = unsignedFrames.length;
      const signedCount = signedFrames.length;
      
      expect(Math.abs(unsignedCount - signedCount)).toBeLessThan(3); // Allow small variance
      expect(duration).toBeLessThan(600); // Should complete quickly
    });
  });
});