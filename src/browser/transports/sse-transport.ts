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
          
          // Hub will emit orchestrator.sse.event.sent for actual deliveries
          // This is just for high-level transport monitoring
          if (clientCount === 0) {
            safeEmit('orchestrator.sse.event.dropped', {
              eventType: event.type,
              reason: 'no_connections'
            }, { level: 'debug' });
          }
        }
      });

      this.running = true;

      // Emit start event
      safeEmit('orchestrator.sse.transport.started', {
        path: this.options.endpoint.path ?? '/__jitterbug/sse',
        cors: this.options.endpoint.cors ?? true,
        capabilities: getSSECapabilities()
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
    safeEmit('orchestrator.sse.transport.stopped', {
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

/**
 * Get current SSE capabilities and feature flags
 */
function getSSECapabilities() {
  return {
    filters: { 
      branches: false, // P3 - not yet implemented
      levels: false    // P3 - not yet implemented
    },
    ingestion: false,  // P2 - not yet implemented  
    resume: false,     // P5 - not yet implemented
    batching: false,   // P7 - not yet implemented
    heartbeat: false,  // P4 - not yet implemented
    auth: false,       // P6 - not yet implemented
    version: 1,
    supported: isSSESupported()
  } as const;
}

/**
 * Get SSE help and usage information
 */
function getSSEHelp() {
  return {
    description: 'Server-Sent Events transport for real-time log streaming',
    usage: {
      connect: 'debug.sse.connect() - Start SSE transport with default options',
      connectWithOptions: 'debug.sse.connect({ endpoint: { path: "/custom" } }) - Start with custom endpoint',
      checkSupport: 'debug.sse.isSupported() - Check browser SSE support',
      capabilities: 'debug.sse.capabilities() - Get current feature flags',
      help: 'debug.sse.help() - Show this help'
    },
    endpoint: {
      default: '/__jitterbug/sse',
      method: 'GET',
      cors: 'Enabled by default',
      format: 'Server-Sent Events (text/event-stream)'
    },
    examples: {
      basic: 'const sse = debug.sse.connect();',
      customPath: 'const sse = debug.sse.connect({ endpoint: { path: "/logs/stream" } });',
      checkStatus: 'sse.isRunning() // true if connected',
      stop: 'sse.stop() // disconnect'
    },
    limitations: {
      phase: 'P1 - Basic connectivity only',
      filters: 'Branch/level filtering not yet available (P3)',
      ingestion: 'Client → server sending not yet available (P2)',
      resume: 'Connection resume not yet available (P5)'
    }
  } as const;
}

// Internal module exports - not part of public surface, only for umbrella integration
export { connectSSE, isSSESupported, getSSECapabilities, getSSEHelp };

// Test-only exports (not in public surface)
if (process.env.NODE_ENV === 'test') {
  (globalThis as any).__JITTERBUG_SSE_TEST__ = { resetSSETransport };
}