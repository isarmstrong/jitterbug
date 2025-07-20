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
      
      expect(() => transport.setFilters?.({ branches: ['core'] })).not.toThrow();
      expect(() => transport.setFilters?.({ levels: ['error', 'warn'] })).not.toThrow();
      expect(() => transport.setFilters?.({ branches: ['ui'], levels: ['info'] })).not.toThrow();
    });

    it('should handle filter updates when not running', () => {
      transport = debug.sse.connect({ autoStart: false });
      
      // Should not throw when transport is stopped
      expect(() => transport.setFilters?.({ branches: ['core'] })).not.toThrow();
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
      transport.setFilters?.({ branches: ['core'] });
      
      // Setting same filters should not cause issues
      expect(() => transport.setFilters?.({ branches: ['core'] })).not.toThrow();
    });
  });
});