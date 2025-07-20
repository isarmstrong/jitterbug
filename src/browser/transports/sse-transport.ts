/**
 * SSE Transport - Task 5 Phase P1
 * 
 * Server-Sent Events transport for real-time log streaming.
 * Integrates with jitterbug event system to broadcast logs to connected clients.
 */

import type { JitterbugEvent } from '../types.js';
import { SSEEndpoint, type SSEEndpointConfig, type SSERequest, type SSEResponse } from './sse/sse-endpoint.js';
import { safeEmit } from '../schema-registry.js';

// Mock registerLogTap for now - will be properly imported when internal path is resolved
const registerLogTap = (_callback: (event: JitterbugEvent) => void) => {
  // TODO: Properly integrate with log capture system
  return () => {}; // Unsubscribe function
};

interface SSETransportOptions {
  enabled?: boolean;
  autoStart?: boolean;
  endpoint?: SSEEndpointConfig;
}

type SSETransportController = {
  start(): void;
  stop(): void;
  isRunning(): boolean;
  handleRequest(request: SSERequest): SSEResponse;
  getDiagnostics(): any;
  getOptions(): Readonly<Required<SSETransportOptions>>;
  updateOptions(options: Partial<SSETransportOptions>): void;
};

const DEFAULT_OPTIONS: Required<SSETransportOptions> = {
  enabled: true,
  autoStart: true,
  endpoint: {
    path: '/__jitterbug/sse',
    cors: true,
    heartbeatMs: 30000,
    clientTimeoutMs: 60000
  }
};

class SSETransport {
  private endpoint: SSEEndpoint | null = null;
  private tapUnsubscribe: (() => void) | null = null;
  private running = false;

  constructor(private options: Required<SSETransportOptions>) {}

  start(): void {
    if (this.running || !this.options.enabled) {
      return;
    }

    try {
      // Create SSE endpoint
      this.endpoint = new SSEEndpoint(this.options.endpoint);

      // Register log tap to receive jitterbug events
      this.tapUnsubscribe = registerLogTap((event: JitterbugEvent) => {
        if (this.endpoint) {
          const clientCount = this.endpoint.broadcastLog(event);
          
          // Emit instrumentation event for monitoring
          safeEmit('orchestrator.transport.sse.broadcast', {
            eventType: event.type,
            clientCount,
            success: clientCount > 0
          }, { level: 'debug' });
        }
      });

      this.running = true;

      // Emit start event
      safeEmit('orchestrator.transport.sse.started', {
        path: this.options.endpoint.path ?? '/__jitterbug/sse',
        cors: this.options.endpoint.cors ?? true
      }, { level: 'info' });
    } catch (error) {
      console.error('Failed to start SSE transport:', error);
      this.cleanup();
      throw error;
    }
  }

  stop(): void {
    if (!this.running) {
      return;
    }

    const diagnostics = this.endpoint ? this.endpoint.getDiagnostics() : null;
    const uptime = diagnostics?.hub.uptime ?? 0;
    const clientsDisconnected = diagnostics?.hub.activeClients ?? 0;

    this.cleanup();
    this.running = false;

    // Emit stop event
    safeEmit('orchestrator.transport.sse.stopped', {
      uptime,
      clientsDisconnected
    }, { level: 'info' });
  }

  private cleanup(): void {
    if (this.tapUnsubscribe) {
      this.tapUnsubscribe();
      this.tapUnsubscribe = null;
    }

    if (this.endpoint) {
      this.endpoint.shutdown();
      this.endpoint = null;
    }
  }

  isRunning(): boolean {
    return this.running;
  }

  handleRequest(request: SSERequest): SSEResponse {
    if (!this.endpoint) {
      return {
        status: 503,
        headers: {},
        body: 'SSE Transport not running'
      };
    }

    return this.endpoint.handleRequest(request);
  }

  getDiagnostics() {
    if (!this.endpoint) {
      return {
        transport: {
          running: false,
          enabled: this.options.enabled
        }
      };
    }

    return {
      transport: {
        running: this.running,
        enabled: this.options.enabled,
        options: this.options
      },
      ...this.endpoint.getDiagnostics()
    };
  }

  getOptions(): Readonly<Required<SSETransportOptions>> {
    return { ...this.options };
  }

  updateOptions(newOptions: Partial<SSETransportOptions>): void {
    const wasRunning = this.running;
    
    if (wasRunning) {
      this.stop();
    }

    // Deep merge options
    this.options = {
      ...this.options,
      ...newOptions,
      endpoint: {
        ...this.options.endpoint,
        ...newOptions.endpoint
      }
    };

    if (wasRunning && this.options.enabled) {
      this.start();
    }
  }
}

// Singleton transport instance
let activeTransport: SSETransport | null = null;

// For testing - internal reset
function resetSSETransport(): void {
  if (activeTransport) {
    activeTransport.stop();
    activeTransport = null;
  }
}

/**
 * Connect to SSE transport with idempotent behavior
 */
function connectSSE(
  options: Partial<SSETransportOptions> = {}
): SSETransportController {
  // Merge with defaults
  const mergedOptions = {
    ...DEFAULT_OPTIONS,
    ...options,
    endpoint: {
      ...DEFAULT_OPTIONS.endpoint,
      ...options.endpoint
    }
  };

  // Create or update existing transport
  if (activeTransport) {
    activeTransport.updateOptions(options);
  } else {
    activeTransport = new SSETransport(mergedOptions);
    
    if (mergedOptions.autoStart) {
      activeTransport.start();
    }
  }

  // Return controller interface
  return {
    start: () => activeTransport!.start(),
    stop: () => activeTransport!.stop(),
    isRunning: () => activeTransport!.isRunning(),
    handleRequest: (request: SSERequest) => activeTransport!.handleRequest(request),
    getDiagnostics: () => activeTransport!.getDiagnostics(),
    getOptions: () => activeTransport!.getOptions(),
    updateOptions: (opts: Partial<SSETransportOptions>) => activeTransport!.updateOptions(opts)
  };
}

/**
 * Check if SSE is supported in current environment
 */
function isSSESupported(): boolean {
  return typeof EventSource !== 'undefined' && typeof ReadableStream !== 'undefined';
}

// Internal module exports - not part of public surface, only for umbrella integration
export { connectSSE, isSSESupported };

// Test-only exports (not in public surface)
if (process.env.NODE_ENV === 'test') {
  (globalThis as any).__JITTERBUG_SSE_TEST__ = { resetSSETransport };
}