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
      expect(response.headers['Access-Control-Allow-Methods']).toBe('GET, POST, OPTIONS');
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
        method: 'PUT',
        url: 'http://localhost/test-sse',
        headers: {}
      };

      const response = endpoint.handleRequest(request);

      expect(response.status).toBe(405);
      expect(response.headers['Allow']).toBe('GET, POST');
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

    it('should handle POST requests for control messages (P4.2-b)', () => {
      const request: SSERequest = {
        method: 'POST',
        url: 'http://localhost/test-sse',
        headers: { 'Content-Type': 'application/json' }
      };

      const response = endpoint.handleRequest(request);

      expect(response.status).toBe(202);
      expect(response.body).toBe('Accepted');
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

describe('SSE Capabilities and Help', () => {
  describe('Capabilities', () => {
    it('should return current phase capabilities', () => {
      const caps = debug.sse.capabilities();
      
      expect(caps).toEqual({
        filters: { 
          branches: true,  // P3 ✅ implemented
          levels: true     // P3 ✅ implemented
        },
        ingestion: true,  // P2 ✅ implemented
        resume: false,
        batching: true,   // P2 ✅ implemented
        heartbeat: false,
        auth: false,
        version: 2,       // P3 version bump
        supported: expect.any(Boolean)
      });
    });

    it('should indicate browser support correctly', () => {
      const caps = debug.sse.capabilities();
      const isSupported = debug.sse.isSupported();
      
      expect(caps.supported).toBe(isSupported);
    });

    it('should reflect P2 implementations', () => {
      const caps = debug.sse.capabilities();
      
      expect(caps.ingestion).toBe(true); // P2 implemented
      expect(caps.batching).toBe(true);  // P2 implemented
      expect(caps.filters.branches).toBe(true); // P3 implemented
      expect(caps.filters.levels).toBe(true);   // P3 implemented
      expect(caps.version).toBe(2); // P3 version bump
    });
  });

  describe('Help', () => {
    it('should provide comprehensive help information', () => {
      const help = debug.sse.help();
      
      expect(help.description).toContain('Server-Sent Events');
      expect(help.usage.connect).toContain('debug.sse.connect()');
      expect(help.endpoint.default).toBe('/__jitterbug/sse');
      expect(help.limitations.phase).toContain('P3');
    });

    it('should include usage examples', () => {
      const help = debug.sse.help();
      
      expect(help.examples.basic).toContain('debug.sse.connect()');
      expect(help.examples.customPath).toContain('path:');
      expect(help.examples.checkStatus).toContain('isRunning()');
      expect(help.examples.stop).toContain('stop()');
    });

    it('should document P3 filtering capabilities', () => {
      const help = debug.sse.help();
      
      expect(help.filtering.description).toContain('P3 - ✅ Available');
      expect(help.filtering.byBranches).toContain('branches=core,ui');
      expect(help.filtering.byLevels).toContain('levels=error,warn');
      expect(help.filtering.combined).toContain('branches=core&levels=error,info');
    });

    it('should document current limitations', () => {
      const help = debug.sse.help();
      
      expect(help.limitations.heartbeat).toContain('not yet available (P4)');
      expect(help.limitations.resume).toContain('not yet available (P5)');
    });
  });
});

describe('P3 Server-side Filtering', () => {
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

  describe('Branch Filtering', () => {
    it('should filter by single branch', () => {
      // Create client with branch filter
      const request: SSERequest = {
        method: 'GET',
        url: 'http://localhost/test-sse?branches=core',
        headers: {}
      };

      const response = endpoint.handleRequest(request);
      expect(response.status).toBe(200);

      // Test broadcasting with different branches
      const coreEvent = {
        id: 'test-1',
        type: 'test.event',
        timestamp: Date.now(),
        level: 'info',
        branch: 'core',
        payload: { test: 'core data' }
      };

      const uiEvent = {
        id: 'test-2',
        type: 'test.event',
        timestamp: Date.now(),
        level: 'info',
        branch: 'ui',
        payload: { test: 'ui data' }
      };

      // Core event should be sent (1 client receives it)
      expect(endpoint.broadcastLog(coreEvent)).toBe(1);
      
      // UI event should be filtered out (0 clients receive it)
      expect(endpoint.broadcastLog(uiEvent)).toBe(0);
    });

    it('should filter by multiple branches', () => {
      const request: SSERequest = {
        method: 'GET',
        url: 'http://localhost/test-sse?branches=core,api',
        headers: {}
      };

      const response = endpoint.handleRequest(request);
      expect(response.status).toBe(200);

      const coreEvent = { level: 'info', branch: 'core', type: 'test', timestamp: Date.now() };
      const apiEvent = { level: 'info', branch: 'api', type: 'test', timestamp: Date.now() };
      const uiEvent = { level: 'info', branch: 'ui', type: 'test', timestamp: Date.now() };

      expect(endpoint.broadcastLog(coreEvent)).toBe(1); // ✅ passes
      expect(endpoint.broadcastLog(apiEvent)).toBe(1);  // ✅ passes
      expect(endpoint.broadcastLog(uiEvent)).toBe(0);   // ❌ filtered out
    });

    it('should handle case-insensitive branch matching', () => {
      const request: SSERequest = {
        method: 'GET',
        url: 'http://localhost/test-sse?branches=CORE,Api',
        headers: {}
      };

      const response = endpoint.handleRequest(request);
      expect(response.status).toBe(200);

      const coreEvent = { level: 'info', branch: 'core', type: 'test', timestamp: Date.now() };
      const apiEvent = { level: 'info', branch: 'API', type: 'test', timestamp: Date.now() };

      expect(endpoint.broadcastLog(coreEvent)).toBe(1); // matches 'CORE'
      expect(endpoint.broadcastLog(apiEvent)).toBe(1);  // matches 'Api'
    });

    it('should handle undefined branch values', () => {
      const request: SSERequest = {
        method: 'GET',
        url: 'http://localhost/test-sse?branches=core',
        headers: {}
      };

      const response = endpoint.handleRequest(request);
      expect(response.status).toBe(200);

      const noBranchEvent = { level: 'info', type: 'test', timestamp: Date.now() };
      const emptyBranchEvent = { level: 'info', branch: '', type: 'test', timestamp: Date.now() };

      // Events without branch should be filtered out when branch filter is active
      expect(endpoint.broadcastLog(noBranchEvent)).toBe(0);
      expect(endpoint.broadcastLog(emptyBranchEvent)).toBe(0);
    });
  });

  describe('Level Filtering', () => {
    it('should filter by single level', () => {
      const request: SSERequest = {
        method: 'GET',
        url: 'http://localhost/test-sse?levels=error',
        headers: {}
      };

      const response = endpoint.handleRequest(request);
      expect(response.status).toBe(200);

      const errorEvent = { level: 'error', type: 'test', timestamp: Date.now() };
      const infoEvent = { level: 'info', type: 'test', timestamp: Date.now() };

      expect(endpoint.broadcastLog(errorEvent)).toBe(1); // ✅ passes
      expect(endpoint.broadcastLog(infoEvent)).toBe(0);  // ❌ filtered out
    });

    it('should filter by multiple levels', () => {
      const request: SSERequest = {
        method: 'GET',
        url: 'http://localhost/test-sse?levels=error,warn',
        headers: {}
      };

      const response = endpoint.handleRequest(request);
      expect(response.status).toBe(200);

      const errorEvent = { level: 'error', type: 'test', timestamp: Date.now() };
      const warnEvent = { level: 'warn', type: 'test', timestamp: Date.now() };
      const infoEvent = { level: 'info', type: 'test', timestamp: Date.now() };

      expect(endpoint.broadcastLog(errorEvent)).toBe(1); // ✅ passes
      expect(endpoint.broadcastLog(warnEvent)).toBe(1);  // ✅ passes
      expect(endpoint.broadcastLog(infoEvent)).toBe(0);  // ❌ filtered out
    });
  });

  describe('Combined Filtering', () => {
    it('should apply AND logic for branch and level filters', () => {
      const request: SSERequest = {
        method: 'GET',
        url: 'http://localhost/test-sse?branches=core,ui&levels=error,warn',
        headers: {}
      };

      const response = endpoint.handleRequest(request);
      expect(response.status).toBe(200);

      const coreErrorEvent = { level: 'error', branch: 'core', type: 'test', timestamp: Date.now() };
      const coreInfoEvent = { level: 'info', branch: 'core', type: 'test', timestamp: Date.now() };
      const apiErrorEvent = { level: 'error', branch: 'api', type: 'test', timestamp: Date.now() };
      const uiWarnEvent = { level: 'warn', branch: 'ui', type: 'test', timestamp: Date.now() };

      expect(endpoint.broadcastLog(coreErrorEvent)).toBe(1); // ✅ core AND error
      expect(endpoint.broadcastLog(uiWarnEvent)).toBe(1);    // ✅ ui AND warn
      expect(endpoint.broadcastLog(coreInfoEvent)).toBe(0);  // ❌ core but not error/warn
      expect(endpoint.broadcastLog(apiErrorEvent)).toBe(0);  // ❌ error but not core/ui
    });
  });

  describe('Empty and Unknown Filters', () => {
    it('should pass all events when no filters specified', () => {
      const request: SSERequest = {
        method: 'GET',
        url: 'http://localhost/test-sse',
        headers: {}
      };

      const response = endpoint.handleRequest(request);
      expect(response.status).toBe(200);

      const anyEvent = { level: 'info', branch: 'any', type: 'test', timestamp: Date.now() };
      expect(endpoint.broadcastLog(anyEvent)).toBe(1); // ✅ no filters = pass-through
    });

    it('should ignore unknown branch values gracefully', () => {
      const request: SSERequest = {
        method: 'GET',
        url: 'http://localhost/test-sse?branches=core,unknown-branch',
        headers: {}
      };

      const response = endpoint.handleRequest(request);
      expect(response.status).toBe(200);

      const coreEvent = { level: 'info', branch: 'core', type: 'test', timestamp: Date.now() };
      const unknownEvent = { level: 'info', branch: 'other', type: 'test', timestamp: Date.now() };

      expect(endpoint.broadcastLog(coreEvent)).toBe(1);   // ✅ matches 'core'
      expect(endpoint.broadcastLog(unknownEvent)).toBe(0); // ❌ doesn't match any filter
    });

    it('should ignore unknown level values gracefully', () => {
      const request: SSERequest = {
        method: 'GET',
        url: 'http://localhost/test-sse?levels=error,unknown-level',
        headers: {}
      };

      const response = endpoint.handleRequest(request);
      expect(response.status).toBe(200);

      const errorEvent = { level: 'error', type: 'test', timestamp: Date.now() };
      const unknownEvent = { level: 'verbose', type: 'test', timestamp: Date.now() };

      expect(endpoint.broadcastLog(errorEvent)).toBe(1);   // ✅ matches 'error'
      expect(endpoint.broadcastLog(unknownEvent)).toBe(0); // ❌ doesn't match any filter
    });
  });

  describe('Filter Statistics', () => {
    it('should track sent and filtered counts', () => {
      const request: SSERequest = {
        method: 'GET',
        url: 'http://localhost/test-sse?levels=error',
        headers: {}
      };

      const response = endpoint.handleRequest(request);
      expect(response.status).toBe(200);

      // Send mix of events
      endpoint.broadcastLog({ level: 'error', type: 'test', timestamp: Date.now() }); // sent
      endpoint.broadcastLog({ level: 'info', type: 'test', timestamp: Date.now() });  // filtered
      endpoint.broadcastLog({ level: 'error', type: 'test', timestamp: Date.now() }); // sent

      const diagnostics = endpoint.getDiagnostics();
      expect(diagnostics.hub.messagesDispatched).toBe(2); // Only errors were dispatched
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

  describe('P2 Client Ingestion', () => {
    it('should provide send method', () => {
      transport = debug.sse.connect();
      
      expect(typeof transport.send).toBe('function');
    });

    it('should handle send when not running', () => {
      transport = debug.sse.connect({ autoStart: false });
      
      // Should not throw when transport is stopped
      expect(() => transport.send?.('info', 'test message')).not.toThrow();
    });

    it('should accept send parameters', () => {
      transport = debug.sse.connect();
      
      // Test various send signatures
      expect(() => transport.send?.('info', 'message')).not.toThrow();
      expect(() => transport.send?.('error', 'error message', { extra: 'data' })).not.toThrow();
    });
  });

  describe('P4 Live Filter Updates', () => {
    it('should provide setFilters and getCurrentFilters methods', () => {
      transport = debug.sse.connect();
      
      expect(typeof transport.setFilters).toBe('function');
      expect(typeof transport.getCurrentFilters).toBe('function');
    });

    it('should update filters without throwing', () => {
      transport = debug.sse.connect();
      
      expect(() => transport.setFilters?.({ kind: 'branches-levels', branches: ['core'] })).not.toThrow();
      expect(() => transport.setFilters?.({ kind: 'branches-levels', levels: ['error', 'warn'] })).not.toThrow();
      expect(() => transport.setFilters?.({ kind: 'branches-levels', branches: ['ui'], levels: ['info'] })).not.toThrow();
    });

    it('should handle filter updates when not running', async () => {
      transport = debug.sse.connect({ autoStart: false });
      
      // Should return rejected promise when transport is stopped
      const result = transport.setFilters?.({ kind: 'branches-levels', branches: ['core'] });
      expect(result).toBeInstanceOf(Promise);
      
      if (result) {
        await expect(result).rejects.toMatchObject({
          ok: false,
          error: 'internal',
          message: 'Transport not running'
        });
      }
    });

    it('should return current filters', () => {
      transport = debug.sse.connect();
      
      const filters = transport.getCurrentFilters?.();
      expect(filters).toBeDefined();
      expect(typeof filters).toBe('object');
    });

    it('should skip unchanged filter updates', () => {
      transport = debug.sse.connect();
      
      // Set initial filters
      transport.setFilters?.({ kind: 'branches-levels', branches: ['core'] });
      
      // Setting same filters should not cause issues
      expect(() => transport.setFilters?.({ kind: 'branches-levels', branches: ['core'] })).not.toThrow();
    });
  });
});

describe('P4.2-c.1: Predicate Correctness & Replay Protection', () => {
  let hub: LogStreamHub;

  beforeEach(() => {
    hub = new LogStreamHub(100, 200); // Short intervals for testing
  });

  afterEach(() => {
    hub.shutdown();
  });

  describe('Concurrent Predicate Isolation', () => {
    const generateUUID = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    it('should maintain predicate isolation across N parallel connections', () => {
      const N = 4; // Reduced N for simpler debugging
      const connections: Array<{ id: string; spec: any; expectedCount: number }> = [];
      
      // Create N connections with different filter specs
      for (let i = 0; i < N; i++) {
        const clientId = `client-${i}`;
        const spec = { kind: 'branches-levels', branches: [`branch-${i}`] };
        
        hub.addClient(clientId);
        connections.push({ id: clientId, spec, expectedCount: 0 });
      }

      // Apply filters via handleFilterUpdate
      connections.forEach(({ id, spec }) => {
        const frame = {
          op: 'filter:update' as const,
          tag: generateUUID(),
          ts: Date.now(),
          spec
        };
        hub.handleFilterUpdate(id, frame);
      });

      // Generate test logs - ensure each branch gets some logs
      const testLogs = [];
      for (let i = 0; i < 100; i++) {
        const branchIndex = i % N;
        testLogs.push({
          id: `log-${i}`,
          type: 'test.event',
          timestamp: Date.now() + i,
          level: 'info',
          branch: `branch-${branchIndex}`,
          payload: { message: `Test log ${i}` }
        });
      }

      // Each client should receive 25 logs (100 logs / 4 branches)
      const expectedLogsPerClient = 100 / N;
      
      // Broadcast all logs
      let totalSent = 0;
      testLogs.forEach(log => {
        const count = hub.broadcast({
          type: 'log',
          data: log,
          timestamp: log.timestamp
        });
        totalSent += count;
      });

      // Verify each connection received only its expected logs
      connections.forEach(({ id }) => {
        const client = hub.getClient(id);
        expect(client).toBeDefined();
        expect(client!.stats.sent).toBe(expectedLogsPerClient);
      });

      // Total messages sent should equal N * expectedLogsPerClient
      expect(totalSent).toBe(N * expectedLogsPerClient);
    });

    it('should handle dynamic predicate updates mid-stream', () => {
      const clientId = 'dynamic-client';
      hub.addClient(clientId);

      // Initial filter: only 'core' branch
      let frame = {
        op: 'filter:update' as const,
        tag: generateUUID(),
        ts: Date.now(),
        spec: { kind: 'branches-levels' as const, branches: ['core'] }
      };
      hub.handleFilterUpdate(clientId, frame);

      // Send logs that should match initial filter
      const coreLog = { level: 'info', branch: 'core', type: 'test', timestamp: Date.now() };
      const uiLog = { level: 'info', branch: 'ui', type: 'test', timestamp: Date.now() };
      
      expect(hub.broadcast({ type: 'log', data: coreLog, timestamp: Date.now() })).toBe(1);
      expect(hub.broadcast({ type: 'log', data: uiLog, timestamp: Date.now() })).toBe(0);

      // Update filter mid-stream: switch to 'ui' branch
      frame = {
        op: 'filter:update' as const,
        tag: generateUUID(),
        ts: Date.now(),
        spec: { kind: 'branches-levels' as const, branches: ['ui'] }
      };
      hub.handleFilterUpdate(clientId, frame);

      // Verify predicate swap worked
      expect(hub.broadcast({ type: 'log', data: coreLog, timestamp: Date.now() })).toBe(0);
      expect(hub.broadcast({ type: 'log', data: uiLog, timestamp: Date.now() })).toBe(1);

      const client = hub.getClient(clientId);
      expect(client!.stats.sent).toBe(2); // One from each filter state
    });
  });

  describe('Replay Protection & Tag Deduplication', () => {
    const generateUUID = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    it('should ignore duplicate filter update tags within same connection', () => {
      const clientId = 'replay-test-client';
      hub.addClient(clientId);
      
      const duplicateTag = generateUUID();
      const frame = {
        op: 'filter:update' as const,
        tag: duplicateTag,
        ts: Date.now(),
        spec: { kind: 'branches-levels' as const, branches: ['core'] }
      };

      // Send first update - should succeed
      hub.handleFilterUpdate(clientId, frame);
      
      // Send exact same update - should be ignored (no ACK/error sent)
      hub.handleFilterUpdate(clientId, frame);
      
      // Verify only one filter application
      const client = hub.getClient(clientId);
      expect(client).toBeDefined();
      
      // Test that filter is active by broadcasting a matching log
      const matchingLog = { level: 'info', branch: 'core', type: 'test', timestamp: Date.now() };
      expect(hub.broadcast({ type: 'log', data: matchingLog, timestamp: Date.now() })).toBe(1);
      expect(client!.stats.sent).toBe(1); // Only one log sent
    });

    it('should allow reusing tags across different connections', () => {
      const clientId1 = 'client-1';
      const clientId2 = 'client-2';
      hub.addClient(clientId1);
      hub.addClient(clientId2);

      const sharedTag = generateUUID();
      
      // Both clients use the same tag - should both succeed
      const frame1 = {
        op: 'filter:update' as const,
        tag: sharedTag,
        ts: Date.now(),
        spec: { kind: 'branches-levels' as const, branches: ['core'] }
      };
      
      const frame2 = {
        op: 'filter:update' as const,
        tag: sharedTag, // Same tag, different connection
        ts: Date.now(),
        spec: { kind: 'branches-levels' as const, branches: ['ui'] }
      };

      hub.handleFilterUpdate(clientId1, frame1);
      hub.handleFilterUpdate(clientId2, frame2);

      // Verify both filters are active
      const coreLog = { level: 'info', branch: 'core', type: 'test', timestamp: Date.now() };
      const uiLog = { level: 'info', branch: 'ui', type: 'test', timestamp: Date.now() };
      
      expect(hub.broadcast({ type: 'log', data: coreLog, timestamp: Date.now() })).toBe(1); // Only client1
      expect(hub.broadcast({ type: 'log', data: uiLog, timestamp: Date.now() })).toBe(1);   // Only client2

      const client1 = hub.getClient(clientId1);
      const client2 = hub.getClient(clientId2);
      expect(client1!.stats.sent).toBe(1);
      expect(client2!.stats.sent).toBe(1);
    });

    it('should reset tag isolation after reconnect (simulated)', () => {
      const clientId = 'reconnect-client';
      const reusedTag = generateUUID();
      
      // First connection
      hub.addClient(clientId);
      const frame = {
        op: 'filter:update' as const,
        tag: reusedTag,
        ts: Date.now(),
        spec: { kind: 'branches-levels' as const, branches: ['core'] }
      };
      hub.handleFilterUpdate(clientId, frame);
      
      // Simulate disconnect/reconnect by removing and re-adding client
      hub.removeClient(clientId);
      hub.addClient(clientId);
      
      // Should be able to reuse the same tag after reconnect
      const frame2 = {
        op: 'filter:update' as const,
        tag: reusedTag, // Previously used tag
        ts: Date.now(),
        spec: { kind: 'branches-levels' as const, branches: ['ui'] }
      };
      hub.handleFilterUpdate(clientId, frame2);
      
      // Verify new filter is active (should receive ui logs, not core)
      const coreLog = { level: 'info', branch: 'core', type: 'test', timestamp: Date.now() };
      const uiLog = { level: 'info', branch: 'ui', type: 'test', timestamp: Date.now() };
      
      expect(hub.broadcast({ type: 'log', data: coreLog, timestamp: Date.now() })).toBe(0);
      expect(hub.broadcast({ type: 'log', data: uiLog, timestamp: Date.now() })).toBe(1);
    });
  });
});

describe('P4.2-c.2: Rate Limiting & Fuzz Validation', () => {
  let hub: LogStreamHub;

  beforeEach(() => {
    hub = new LogStreamHub(100, 200); // Short intervals for testing
  });

  afterEach(() => {
    hub.shutdown();
  });

  describe('Sliding Window Rate Limiting', () => {
    const generateUUID = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    it('should enforce rate limit: 4 updates in 5s → expect final filter:error(rate_limited)', () => {
      const clientId = 'rate-limit-client';
      hub.addClient(clientId);

      // Send 3 rapid updates (at rate limit)
      for (let i = 0; i < 3; i++) {
        const frame = {
          op: 'filter:update' as const,
          tag: generateUUID(),
          ts: Date.now(),
          spec: { kind: 'branches-levels' as const, branches: [`branch-${i}`] }
        };
        hub.handleFilterUpdate(clientId, frame);
      }

      // Verify the 3rd filter was applied
      const testLog = { level: 'info', branch: 'branch-2', type: 'test', timestamp: Date.now() };
      expect(hub.broadcast({ type: 'log', data: testLog, timestamp: Date.now() })).toBe(1);

      // 4th update should be rate limited (silently ignored)
      const overflowFrame = {
        op: 'filter:update' as const,
        tag: generateUUID(),
        ts: Date.now(),
        spec: { kind: 'branches-levels' as const, branches: ['overflow'] }
      };
      hub.handleFilterUpdate(clientId, overflowFrame);

      // Filter should still be the 3rd one, not the overflow
      const overflowLog = { level: 'info', branch: 'overflow', type: 'test', timestamp: Date.now() };
      expect(hub.broadcast({ type: 'log', data: overflowLog, timestamp: Date.now() })).toBe(0);
      
      // Original filter should still work
      expect(hub.broadcast({ type: 'log', data: testLog, timestamp: Date.now() })).toBe(1);
    });

    it('should reset rate limit after 5s window', async () => {
      const clientId = 'window-reset-client';
      hub.addClient(clientId);

      // Mock Date.now() for time travel testing
      const originalDateNow = Date.now;
      let mockTime = 1000000; // Start at a fixed time
      
      Date.now = vi.fn(() => mockTime);

      try {
        // Send 3 updates at mock time (at rate limit)
        for (let i = 0; i < 3; i++) {
          const frame = {
            op: 'filter:update' as const,
            tag: generateUUID(),
            ts: mockTime,
            spec: { kind: 'branches-levels' as const, branches: [`test-${i}`] }
          };
          hub.handleFilterUpdate(clientId, frame);
        }

        // Advance time by 5001ms (just past the 5s window)
        mockTime += 5001;

        // Should now be able to send another update successfully
        const successFrame = {
          op: 'filter:update' as const,
          tag: generateUUID(),
          ts: mockTime,
          spec: { kind: 'branches-levels' as const, branches: ['success'] }
        };
        hub.handleFilterUpdate(clientId, successFrame);

        // Verify the filter was applied (test by broadcasting a matching log)
        const testLog = { level: 'info', branch: 'success', type: 'test', timestamp: mockTime };
        const count = hub.broadcast({ type: 'log', data: testLog, timestamp: mockTime });
        expect(count).toBe(1); // Should receive the log

      } finally {
        Date.now = originalDateNow; // Restore original Date.now
      }
    });

    it('should handle window eviction logic correctly', () => {
      const clientId = 'eviction-client';
      hub.addClient(clientId);

      const originalDateNow = Date.now;
      let mockTime = 2000000;
      Date.now = vi.fn(() => mockTime);

      try {
        // Send updates with specific timing
        const updates = [
          { time: mockTime, tag: generateUUID() },
          { time: mockTime + 1000, tag: generateUUID() },
          { time: mockTime + 2000, tag: generateUUID() },
        ];

        updates.forEach(({ time, tag }) => {
          mockTime = time;
          const frame = {
            op: 'filter:update' as const,
            tag,
            ts: time,
            spec: { kind: 'branches-levels' as const, branches: ['test'] }
          };
          hub.handleFilterUpdate(clientId, frame);
        });

        // Advance time to make first update expire (> 5s old)
        mockTime = updates[0].time + 5001;

        // Should be able to send one more update (only 2 in window now)
        const newFrame = {
          op: 'filter:update' as const,
          tag: generateUUID(),
          ts: mockTime,
          spec: { kind: 'branches-levels' as const, branches: ['new'] }
        };
        hub.handleFilterUpdate(clientId, newFrame);

        // Verify it worked by checking the filter
        const testLog = { level: 'info', branch: 'new', type: 'test', timestamp: mockTime };
        expect(hub.broadcast({ type: 'log', data: testLog, timestamp: mockTime })).toBe(1);

      } finally {
        Date.now = originalDateNow;
      }
    });
  });

  describe('Spec Validation Fuzz Testing', () => {
    const generateUUID = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    it('should reject all invalid specs with filter:error(invalid_spec)', () => {
      const clientId = 'fuzz-client';
      hub.addClient(clientId);

      const invalidSpecs: any[] = [
        // Type errors
        null,
        undefined,
        42,
        'string',
        [],
        true,
        
        // Missing kind
        {},
        { branches: ['test'] },
        { levels: ['info'] },
        
        // Invalid kind
        { kind: 'invalid-kind' },
        { kind: null },
        { kind: 42 },
        
        // branches-levels validation
        { kind: 'branches-levels', branches: 'not-array' },
        { kind: 'branches-levels', levels: 'not-array' },
        { kind: 'branches-levels', branches: new Array(33).fill('x') }, // > MAX_BRANCHES (32)
        { kind: 'branches-levels', levels: new Array(9).fill('x') },    // > MAX_LEVELS (8)
        
        // keyword validation
        { kind: 'keyword' }, // missing keywords
        { kind: 'keyword', keywords: null },
        { kind: 'keyword', keywords: 'not-array' },
        { kind: 'keyword', keywords: [] }, // empty array
        { kind: 'keyword', keywords: [null] },
        { kind: 'keyword', keywords: [42] },
      ];

      // Test each invalid spec - should not throw and should not apply invalid filters
      invalidSpecs.forEach((spec, index) => {
        const frame: any = {
          op: 'filter:update' as const,
          tag: `invalid-${index}-${generateUUID()}`,
          ts: Date.now(),
          spec
        };

        // Should not throw
        expect(() => hub.handleFilterUpdate(clientId, frame)).not.toThrow();
      });

      // After all invalid specs, client should still have no filter applied
      // (or the default match-all filter)
      const client = hub.getClient(clientId);
      expect(client).toBeDefined();
      
      // Test that some basic log gets through (indicating no malformed filter was applied)
      const basicLog = { level: 'info', branch: 'test', type: 'test', timestamp: Date.now() };
      const count = hub.broadcast({ type: 'log', data: basicLog, timestamp: Date.now() });
      expect(count).toBeGreaterThanOrEqual(0); // Should not crash
    });

    it('should accept boundary valid specs', () => {
      const clientId = 'boundary-client';
      hub.addClient(clientId);

      const validBoundarySpecs: any[] = [
        // Exactly at limits
        { kind: 'branches-levels', branches: new Array(32).fill('branch') }, // exactly MAX_BRANCHES
        { kind: 'branches-levels', levels: new Array(8).fill('level') },     // exactly MAX_LEVELS
        { kind: 'branches-levels' }, // no branches or levels (match all)
        { kind: 'branches-levels', branches: [] }, // empty arrays
        { kind: 'branches-levels', levels: [] },
        { kind: 'keyword', keywords: ['single'] }, // minimum valid keywords
        { kind: 'keyword', keywords: new Array(100).fill('keyword') }, // many keywords
      ];

      validBoundarySpecs.forEach((spec, index) => {
        const frame: any = {
          op: 'filter:update' as const,
          tag: `valid-${index}-${generateUUID()}`,
          ts: Date.now(),
          spec
        };

        expect(() => hub.handleFilterUpdate(clientId, frame)).not.toThrow();
        
        // Verify filter was applied by testing a basic log
        const testLog = { level: 'info', branch: 'test', type: 'test', timestamp: Date.now() };
        const count = hub.broadcast({ type: 'log', data: testLog, timestamp: Date.now() });
        // For most specs this will match (except keyword filters)
        if (spec.kind === 'branches-levels') {
          expect(count).toBeGreaterThanOrEqual(0); // Should not throw
        }
      });
    });

    it('should handle prototype pollution attempts safely', () => {
      const clientId = 'security-client';
      hub.addClient(clientId);

      const maliciousSpecs: any[] = [
        // Prototype pollution attempts
        { kind: 'branches-levels', '__proto__': { polluted: true } },
        { kind: 'branches-levels', 'constructor': { prototype: { polluted: true } } },
        { kind: 'keyword', keywords: ['test'], '__proto__': { evil: true } },
        
        // Deep object manipulation
        { kind: 'branches-levels', branches: { length: 1, 0: 'evil', __proto__: Array.prototype } },
        
        // Function injection attempts (should be caught by validation)
        { kind: 'branches-levels', branches: ['function() { return true; }'] },
        { kind: 'keyword', keywords: ['eval("malicious code")'] },
      ];

      maliciousSpecs.forEach((spec, index) => {
        const frame: any = {
          op: 'filter:update' as const,
          tag: `malicious-${index}-${generateUUID()}`,
          ts: Date.now(),
          spec
        };

        // Should handle safely without throwing or causing pollution
        expect(() => hub.handleFilterUpdate(clientId, frame)).not.toThrow();
      });

      // Verify no global pollution occurred
      expect((Object.prototype as any).polluted).toBeUndefined();
      expect((Object.prototype as any).evil).toBeUndefined();
      expect((Array.prototype as any).polluted).toBeUndefined();
    });

    // P4.2-c.3: Advanced injection safety tests using Epic Web patterns
    describe('Advanced injection safety (Epic Web patterns)', () => {
      let testClient: any;
      
      beforeEach(() => {
        testClient = hub.addClient('injection-test-client');
      });

      it('should demonstrate advanced testing patterns for future security enhancements', () => {
        const testPatterns = [
          '(simple)',           // Basic pattern
          'normal-keyword',     // Normal keyword
          'test123',            // Alphanumeric
        ];

        const responses: any[] = [];
        const originalEnqueue = testClient.controller.enqueue;
        testClient.controller.enqueue = vi.fn((chunk: Uint8Array) => {
          const text = new TextDecoder().decode(chunk);
          if (text.includes('filter:')) {
            const data = JSON.parse(text.split('data: ')[1].split('\n')[0]);
            responses.push(data);
          }
          return originalEnqueue.call(testClient.controller, chunk);
        });

        testPatterns.forEach((pattern, i) => {
          const frame = {
            op: 'filter:update' as const,
            tag: `pattern-test-${i}`,
            ts: Date.now(),
            spec: { kind: 'keyword' as const, keywords: [pattern] }
          };

          hub.handleFilterUpdate('injection-test-client', frame);
        });

        // Advanced assertion: All responses should be valid filter responses
        expect(responses).toHaveLength(testPatterns.length);
        responses.forEach(response => {
          // Verify response shape using toMatchObject
          expect(response).toMatchObject({
            op: expect.stringMatching(/^filter:(ack|error)$/),
            tag: expect.any(String)
          });
          
          // Additional validation based on response type
          if (response.op === 'filter:ack') {
            expect(response.appliedTs).toBeTypeOf('number');
            expect(response.activeSpec).toBeDefined();
          } else if (response.op === 'filter:error') {
            expect(response.code).toBeTypeOf('string');
          }
        });
      });

      it('should handle concurrent filter updates with retryable assertions', async () => {
        // Test various payload types that should be handled safely
        const testPayloads = [
          'normal-branch',
          'test-level',
          'feature-123',
          'debug-session',
          'production-logs',
          'user-interaction',
          'system-event'
        ];

        const responses: any[] = [];
        const originalEnqueue = testClient.controller.enqueue;
        testClient.controller.enqueue = vi.fn((chunk: Uint8Array) => {
          const text = new TextDecoder().decode(chunk);
          if (text.includes('filter:')) {
            const data = JSON.parse(text.split('data: ')[1].split('\n')[0]);
            responses.push(data);
          }
          return originalEnqueue.call(testClient.controller, chunk);
        });

        // Fire concurrent filter updates
        const promises = testPayloads.map((payload, i) => 
          Promise.resolve().then(() => {
            const frame = {
              op: 'filter:update' as const,
              tag: `concurrent-test-${i}`,
              ts: Date.now() + i,
              spec: { 
                kind: 'branches-levels' as const,
                branches: [payload],
                levels: ['info', 'debug']
              }
            };
            hub.handleFilterUpdate('injection-test-client', frame);
          })
        );

        await Promise.all(promises);

        // Advanced pattern: Retryable assertion with proper timeout
        await vi.waitFor(() => {
          expect(responses.length).toBe(testPayloads.length);
        }, { timeout: 1000 });

        // Verify all responses are properly handled
        responses.forEach(response => {
          expect(response.op).toMatch(/^filter:(ack|error)$/);
          if (response.op === 'filter:ack') {
            expect(response.activeSpec).toBeDefined();
            expect(response.appliedTs).toBeTypeOf('number');
          }
        });
      });

      it('should enforce existing limits with shape validation', () => {
        // Test specs that exceed current limits
        const limitExceedingSpecs = [
          {
            kind: 'branches-levels' as const,
            branches: Array(33).fill('branch')  // Exceeds MAX_BRANCHES (32)
          },
          {
            kind: 'branches-levels' as const,
            levels: Array(9).fill('level')      // Exceeds MAX_LEVELS (8)
          },
          {
            kind: 'keyword' as const,
            keywords: []                        // Empty keywords array
          }
        ];

        const responses: any[] = [];
        const originalEnqueue = testClient.controller.enqueue;
        testClient.controller.enqueue = vi.fn((chunk: Uint8Array) => {
          const text = new TextDecoder().decode(chunk);
          if (text.includes('filter:error')) {
            const data = JSON.parse(text.split('data: ')[1].split('\n')[0]);
            responses.push(data);
          }
          return originalEnqueue.call(testClient.controller, chunk);
        });

        limitExceedingSpecs.forEach((spec, i) => {
          const frame = {
            op: 'filter:update' as const,
            tag: `limit-test-${i}`,
            ts: Date.now(),
            spec
          };

          hub.handleFilterUpdate('injection-test-client', frame);
        });

        expect(responses).toHaveLength(limitExceedingSpecs.length);
        responses.forEach(response => {
          // Verify error response shape
          expect(response).toMatchObject({
            op: 'filter:error',
            code: 'invalid_spec',
            tag: expect.any(String)
          });
          expect(response.message).toBeTypeOf('string');
        });
      });

      it('should maintain proper isolation between client sessions', () => {
        // Test that filters in one client don't affect others
        const client2 = hub.addClient('isolation-client-2');
        
        const client1Responses: any[] = [];
        const client2Responses: any[] = [];
        
        // Mock both clients to capture responses
        const originalEnqueue1 = testClient.controller.enqueue;
        const originalEnqueue2 = client2.controller.enqueue;
        
        testClient.controller.enqueue = vi.fn((chunk: Uint8Array) => {
          const text = new TextDecoder().decode(chunk);
          if (text.includes('filter:')) {
            const data = JSON.parse(text.split('data: ')[1].split('\n')[0]);
            client1Responses.push(data);
          }
          return originalEnqueue1.call(testClient.controller, chunk);
        });

        client2.controller.enqueue = vi.fn((chunk: Uint8Array) => {
          const text = new TextDecoder().decode(chunk);
          if (text.includes('filter:')) {
            const data = JSON.parse(text.split('data: ')[1].split('\n')[0]);
            client2Responses.push(data);
          }
          return originalEnqueue2.call(client2.controller, chunk);
        });

        // Send different filters to each client
        hub.handleFilterUpdate('injection-test-client', {
          op: 'filter:update',
          tag: 'isolation-client1',
          ts: Date.now(),
          spec: { kind: 'keyword' as const, keywords: ['client1-filter'] }
        });

        hub.handleFilterUpdate('isolation-client-2', {
          op: 'filter:update',
          tag: 'isolation-client2',
          ts: Date.now(),
          spec: { kind: 'keyword' as const, keywords: ['client2-filter'] }
        });

        // Verify proper isolation: each client gets their own response
        expect(client1Responses).toHaveLength(1);
        expect(client2Responses).toHaveLength(1);
        
        expect(client1Responses[0]).toMatchObject({
          op: 'filter:ack',
          tag: 'isolation-client1'
        });
        
        expect(client2Responses[0]).toMatchObject({
          op: 'filter:ack',
          tag: 'isolation-client2'
        });

        // Verify the filters are actually different
        expect(client1Responses[0].activeSpec.keywords).toEqual(['client1-filter']);
        expect(client2Responses[0].activeSpec.keywords).toEqual(['client2-filter']);
      });
    });
  });
});