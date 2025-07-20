/**
 * SSE Transport Tests - Task 5 Phase P1
 * 
 * Tests for LogStreamHub, SSEEndpoint, and SSETransport functionality.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LogStreamHub, type BroadcastMessage } from '../transports/sse/log-stream-hub.js';
import { SSEEndpoint, type SSERequest } from '../transports/sse/sse-endpoint.js';
import { debug } from '../public.js';

// Mock dependencies to avoid dependency cycles in tests
vi.mock('../schema-registry.js', () => ({
  safeEmit: vi.fn(),
  setGlobalEmitFn: vi.fn()
}));

vi.mock('../logs/internal/attach.js', () => ({
  registerLogTap: vi.fn(() => () => {}), // Returns unsubscribe function
  attachLogCapture: vi.fn()
}));

describe('LogStreamHub', () => {
  let hub: LogStreamHub;

  beforeEach(() => {
    hub = new LogStreamHub(100, 200); // Short intervals for testing
  });

  afterEach(() => {
    hub.shutdown();
  });

  describe('Client Management', () => {
    it('should add clients successfully', () => {
      const client = hub.addClient('test-client-1');
      
      expect(client.id).toBe('test-client-1');
      expect(client.isActive).toBe(true);
      expect(client.connectedAt).toBeGreaterThan(0);
      expect(client.stream).toBeInstanceOf(ReadableStream);
      
      const diagnostics = hub.getDiagnostics();
      expect(diagnostics.activeClients).toBe(1);
      expect(diagnostics.totalConnections).toBe(1);
    });

    it('should prevent duplicate client IDs', () => {
      hub.addClient('duplicate-id');
      
      expect(() => {
        hub.addClient('duplicate-id');
      }).toThrow('Client duplicate-id already exists');
    });

    it('should remove clients successfully', () => {
      const client = hub.addClient('test-client-1');
      expect(hub.getActiveClients()).toEqual(['test-client-1']);
      
      const removed = hub.removeClient('test-client-1');
      expect(removed).toBe(true);
      expect(hub.getActiveClients()).toEqual([]);
      expect(client.isActive).toBe(false);
    });

    it('should handle removing non-existent clients', () => {
      const removed = hub.removeClient('non-existent');
      expect(removed).toBe(false);
    });

    it('should get client by ID', () => {
      const client = hub.addClient('test-client-1');
      const retrieved = hub.getClient('test-client-1');
      
      expect(retrieved).toBe(client);
      expect(hub.getClient('non-existent')).toBeUndefined();
    });
  });

  describe('Message Broadcasting', () => {
    it('should broadcast to all active clients', () => {
      hub.addClient('client-1');
      hub.addClient('client-2');
      hub.addClient('client-3');
      
      const message: BroadcastMessage = {
        type: 'log',
        data: { test: 'data' },
        timestamp: Date.now()
      };
      
      const successCount = hub.broadcast(message);
      expect(successCount).toBe(3);
      
      const diagnostics = hub.getDiagnostics();
      expect(diagnostics.messagesDispatched).toBe(3);
    });

    it('should handle empty client list', () => {
      const message: BroadcastMessage = {
        type: 'log',
        data: { test: 'data' },
        timestamp: Date.now()
      };
      
      const successCount = hub.broadcast(message);
      expect(successCount).toBe(0);
    });

    it('should clean up inactive clients during broadcast', () => {
      const client1 = hub.addClient('client-1');
      hub.addClient('client-2');
      
      // Manually mark one client as inactive
      client1.isActive = false;
      
      const message: BroadcastMessage = {
        type: 'log',
        data: { test: 'data' },
        timestamp: Date.now()
      };
      
      const successCount = hub.broadcast(message);
      expect(successCount).toBe(1); // Only client-2 should receive
      expect(hub.getActiveClients()).toEqual(['client-2']);
    });
  });

  describe('Heartbeat System', () => {
    it('should track heartbeats', async () => {
      const client = hub.addClient('test-client');
      const initialHeartbeat = client.lastHeartbeat;
      
      // Wait a bit and send heartbeat
      await new Promise(resolve => setTimeout(resolve, 10));
      
      hub.broadcast({
        type: 'heartbeat',
        data: { timestamp: Date.now() },
        timestamp: Date.now()
      });
      
      expect(client.lastHeartbeat).toBeGreaterThan(initialHeartbeat);
    });
  });

  describe('Diagnostics', () => {
    it('should provide accurate diagnostics', () => {
      hub.addClient('client-1');
      hub.addClient('client-2');
      hub.removeClient('client-1');
      
      hub.broadcast({
        type: 'log',
        data: { test: 'data' },
        timestamp: Date.now()
      });
      
      const diagnostics = hub.getDiagnostics();
      
      expect(diagnostics.activeClients).toBe(1);
      expect(diagnostics.totalConnections).toBe(2);
      expect(diagnostics.messagesDispatched).toBe(1);
      expect(diagnostics.uptime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Shutdown', () => {
    it('should clean up all clients on shutdown', () => {
      hub.addClient('client-1');
      hub.addClient('client-2');
      
      expect(hub.getDiagnostics().activeClients).toBe(2);
      
      hub.shutdown();
      
      expect(hub.getDiagnostics().activeClients).toBe(0);
    });
  });
});

describe('SSEEndpoint', () => {
  let endpoint: SSEEndpoint;

  beforeEach(() => {
    endpoint = new SSEEndpoint({
      path: '/test-sse',
      cors: true,
      heartbeatMs: 100,
      clientTimeoutMs: 200
    });
  });

  afterEach(() => {
    endpoint.shutdown();
  });

  describe('Request Handling', () => {
    it('should handle CORS preflight requests', () => {
      const request: SSERequest = {
        method: 'OPTIONS',
        url: 'http://localhost/test-sse',
        headers: {}
      };

      const response = endpoint.handleRequest(request);

      expect(response.status).toBe(204);
      expect(response.headers['Access-Control-Allow-Origin']).toBe('*');
      expect(response.headers['Access-Control-Allow-Methods']).toBe('GET, OPTIONS');
    });

    it('should return 404 for wrong path', () => {
      const request: SSERequest = {
        method: 'GET',
        url: 'http://localhost/wrong-path',
        headers: {}
      };

      const response = endpoint.handleRequest(request);

      expect(response.status).toBe(404);
      expect(response.body).toBe('Not Found');
    });

    it('should return 405 for wrong method', () => {
      const request: SSERequest = {
        method: 'POST',
        url: 'http://localhost/test-sse',
        headers: {}
      };

      const response = endpoint.handleRequest(request);

      expect(response.status).toBe(405);
      expect(response.headers['Allow']).toBe('GET');
    });

    it('should create SSE response for valid requests', () => {
      const request: SSERequest = {
        method: 'GET',
        url: 'http://localhost/test-sse',
        headers: {}
      };

      const response = endpoint.handleRequest(request);

      expect(response.status).toBe(200);
      expect(response.headers['Content-Type']).toBe('text/event-stream');
      expect(response.headers['Cache-Control']).toBe('no-cache');
      expect(response.headers['Connection']).toBe('keep-alive');
      expect(response.body).toBeInstanceOf(ReadableStream);
    });
  });

  describe('Log Broadcasting', () => {
    it('should broadcast logs to connected clients', () => {
      // Create a client connection
      const request: SSERequest = {
        method: 'GET',
        url: 'http://localhost/test-sse',
        headers: {}
      };

      const response = endpoint.handleRequest(request);
      expect(response.status).toBe(200);

      // Broadcast a log event
      const logEvent = {
        id: 'test-id',
        type: 'orchestrator.step.started',
        timestamp: Date.now(),
        level: 'info',
        payload: { stepId: 'test-step' }
      };

      const clientCount = endpoint.broadcastLog(logEvent);
      expect(clientCount).toBe(1);

      const diagnostics = endpoint.getDiagnostics();
      expect(diagnostics.hub.activeClients).toBe(1);
    });
  });

  describe('Diagnostics', () => {
    it('should provide endpoint diagnostics', () => {
      const diagnostics = endpoint.getDiagnostics();

      expect(diagnostics.endpoint.path).toBe('/test-sse');
      expect(diagnostics.endpoint.cors).toBe(true);
      expect(diagnostics.hub.activeClients).toBe(0);
      expect(diagnostics.hub.totalConnections).toBe(0);
    });
  });
});

describe('SSETransport Integration', () => {
  // Use structural typing instead of exported types
  let transport: ReturnType<typeof debug.sse.connect>;

  afterEach(() => {
    if (transport) {
      transport.stop();
    }
    
    // Reset the singleton for clean tests
    const testHook = (globalThis as any).__JITTERBUG_SSE_TEST__;
    if (testHook) {
      testHook.resetSSETransport();
    }
  });

  describe('Transport Lifecycle', () => {
    it('should create transport with default options', () => {
      transport = debug.sse.connect();
      
      expect(transport.isRunning()).toBe(true); // autoStart is true by default
      
      const options = transport.getOptions();
      expect(options.enabled).toBe(true);
      expect(options.autoStart).toBe(true);
      expect(options.endpoint.path).toBe('/__jitterbug/sse');
    });

    it('should create transport without auto-start', () => {
      transport = debug.sse.connect({ autoStart: false });
      
      expect(transport.isRunning()).toBe(false);
      
      transport.start();
      expect(transport.isRunning()).toBe(true);
    });

    it('should handle start/stop cycles', () => {
      transport = debug.sse.connect({ autoStart: false });
      
      expect(transport.isRunning()).toBe(false);
      
      transport.start();
      expect(transport.isRunning()).toBe(true);
      
      transport.stop();
      expect(transport.isRunning()).toBe(false);
      
      // Should be idempotent
      transport.stop();
      expect(transport.isRunning()).toBe(false);
    });

    it('should update options and restart if running', () => {
      transport = debug.sse.connect({ autoStart: true });
      expect(transport.isRunning()).toBe(true);
      
      transport.updateOptions({
        endpoint: { path: '/custom-sse' }
      });
      
      const newOptions = transport.getOptions();
      expect(newOptions.endpoint.path).toBe('/custom-sse');
      expect(transport.isRunning()).toBe(true); // Should restart automatically
    });
  });

  describe('HTTP Request Handling', () => {
    it('should handle SSE requests', () => {
      transport = debug.sse.connect({
        endpoint: { path: '/test-sse' }
      });

      const request: SSERequest = {
        method: 'GET',
        url: 'http://localhost/test-sse',
        headers: {}
      };

      const response = transport.handleRequest(request);
      expect(response.status).toBe(200);
      expect(response.headers['Content-Type']).toBe('text/event-stream');
    });

    it('should return 503 when transport is stopped', () => {
      transport = debug.sse.connect({ autoStart: false });

      const request: SSERequest = {
        method: 'GET',
        url: 'http://localhost/__jitterbug/sse',
        headers: {}
      };

      const response = transport.handleRequest(request);
      expect(response.status).toBe(503);
      expect(response.body).toBe('SSE Transport not running');
    });
  });

  describe('Diagnostics', () => {
    it('should provide transport diagnostics', () => {
      transport = debug.sse.connect();
      
      const diagnostics = transport.getDiagnostics();
      
      expect(diagnostics.transport.running).toBe(true);
      expect(diagnostics.transport.enabled).toBe(true);
      expect(diagnostics.endpoint).toBeDefined();
      expect(diagnostics.hub).toBeDefined();
    });

    it('should provide minimal diagnostics when stopped', () => {
      transport = debug.sse.connect({ autoStart: false });
      
      const diagnostics = transport.getDiagnostics();
      
      expect(diagnostics.transport.running).toBe(false);
      expect(diagnostics.transport.enabled).toBe(true);
      expect(diagnostics.endpoint).toBeUndefined();
      expect(diagnostics.hub).toBeUndefined();
    });
  });
});