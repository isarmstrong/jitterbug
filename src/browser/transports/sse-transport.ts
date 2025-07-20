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
const registerLogTap = (_callback: (event: JitterbugEvent) => void): (() => void) => {
  // TODO: Properly integrate with log capture system
  return () => {}; // Unsubscribe function
};

// P2: Client log envelope for ingestion
interface ClientLogEnvelope {
  t: number;          // timestamp
  level: string;      // log level
  branch?: string;    // branch identifier
  msg: string;        // message
  data?: unknown;     // payload data
  id?: string;        // client-generated ID for dedupe
  seq?: number;       // per-connection sequence
}


interface SSETransportOptions {
  enabled?: boolean;
  autoStart?: boolean;
  endpoint?: SSEEndpointConfig;
  filters?: {
    branches?: string[];
    levels?: string[];
  };
  auth?: {
    token?: string;
    getToken?: () => Promise<string>;
  };
}

interface SSETransportDiagnostics {
  transport: {
    running: boolean;
    enabled: boolean;
    options?: Required<SSETransportOptions>;
  };
  endpoint?: {
    path: string;
    cors: boolean;
    uptime: number;
  };
  hub?: {
    activeClients: number;
    totalConnections: number;
    uptime: number;
    messagesDispatched: number;
  };
}

type SSETransportController = {
  start(): void;
  stop(): void;
  isRunning(): boolean;
  handleRequest(request: SSERequest): SSEResponse;
  getDiagnostics(): SSETransportDiagnostics;
  getOptions(): Readonly<Required<SSETransportOptions>>;
  updateOptions(options: Partial<SSETransportOptions>): void;
  send?(level: string, message: string, data?: unknown): void; // P2: client ingestion
};

const DEFAULT_OPTIONS: Required<SSETransportOptions> = {
  enabled: true,
  autoStart: true,
  endpoint: {
    path: '/__jitterbug/sse',
    cors: true,
    heartbeatMs: 30000,
    clientTimeoutMs: 60000
  },
  filters: {},
  auth: {}
};


class SSETransport {
  private endpoint: SSEEndpoint | null = null;
  private tapUnsubscribe: (() => void) | null = null;
  private running = false;
  
  // P2: Outbound buffer for client ingestion
  private outboundBuffer: ClientLogEnvelope[] = [];
  private outboundSeq = 0;
  private flushTimer?: NodeJS.Timeout;
  private readonly MAX_BUFFER_SIZE = 200;
  private readonly FLUSH_TIME_MS = 500;
  private readonly FLUSH_SIZE_THRESHOLD = 5;
  private droppedOutbound = 0;
  private pageHideListener?: () => void;

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

      // P2: Set up beacon fallback on page hide
      this.setupBeaconFallback();

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

    // P2: Flush any remaining outbound entries before stopping
    this.flushOutbound(true); // force flush

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

    // P2: Clean up flush timer
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = undefined;
    }

    // P2: Clean up beacon fallback listener
    if (this.pageHideListener) {
      document.removeEventListener('visibilitychange', this.pageHideListener);
      window.removeEventListener('beforeunload', this.pageHideListener);
      this.pageHideListener = undefined;
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

  getDiagnostics(): SSETransportDiagnostics {
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

  // P2: Client ingestion - send log entry to server
  send(level: string, message: string, data?: unknown): void {
    if (!this.running) {
      return; // Silently ignore if transport not running
    }

    const envelope: ClientLogEnvelope = {
      t: Date.now(),
      level,
      msg: message,
      data,
      seq: ++this.outboundSeq,
      id: crypto.randomUUID() // For dedupe
    };

    // Add to buffer
    if (this.outboundBuffer.length >= this.MAX_BUFFER_SIZE) {
      // Drop oldest entries (backpressure)
      this.outboundBuffer.shift();
      this.droppedOutbound++;
    }

    this.outboundBuffer.push(envelope);

    // Check flush triggers
    if (this.outboundBuffer.length >= this.FLUSH_SIZE_THRESHOLD) {
      this.flushOutbound();
    } else if (!this.flushTimer) {
      // Arm timer if this is first entry
      this.flushTimer = setTimeout(() => {
        this.flushOutbound();
      }, this.FLUSH_TIME_MS);
    }
  }


  // P2: Set up beacon fallback for page hide events
  private setupBeaconFallback(): void {
    this.pageHideListener = (): void => {
      if (this.outboundBuffer.length > 0) {
        this.flushOutbound(true, true); // force flush with beacon
      }
    };

    // Listen for page visibility changes and beforeunload
    document.addEventListener('visibilitychange', this.pageHideListener);
    window.addEventListener('beforeunload', this.pageHideListener);
  }

  // P2: Enhanced flush with optional beacon fallback
  private flushOutbound(force = false, useBeacon = false): void {
    if (this.outboundBuffer.length === 0 && !force) {
      return;
    }

    const entries = [...this.outboundBuffer];
    const dropped = this.droppedOutbound;
    this.outboundBuffer.length = 0; // Clear buffer
    this.droppedOutbound = 0;

    // Clear timer
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = undefined;
    }

    if (entries.length === 0) {
      return;
    }

    const startTime = Date.now();
    const endpoint = this.options.endpoint.path || '/__jitterbug/sse';

    // Prepare payload
    const flushPayload = {
      entries,
      metadata: {
        sessionId: `sse-${Date.now()}`, // TODO: Proper session ID
        timestamp: startTime,
        dropped
      }
    };

    if (useBeacon && 'sendBeacon' in navigator) {
      // Try beacon for page unload scenarios
      const blob = new Blob([JSON.stringify(flushPayload)], { type: 'application/json' });
      const success = navigator.sendBeacon(endpoint, blob);
      
      if (success) {
        // Beacon telemetry (can't measure latency)
        safeEmit('orchestrator.sse.ingest.flush', {
          count: entries.length,
          dropped,
          latencyMs: 0 // Unknown for beacon
        }, { level: 'debug' });
      }
      return; // Beacon is fire-and-forget
    }

    // Regular fetch fallback
    fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.options.endpoint.cors ? { 'Origin': window.location.origin } : {})
      },
      body: JSON.stringify(flushPayload)
    }).then(response => {
      const latencyMs = Date.now() - startTime;
      
      if (response.ok) {
        safeEmit('orchestrator.sse.ingest.flush', {
          count: entries.length,
          dropped,
          latencyMs
        }, { level: 'debug' });
      } else {
        safeEmit('orchestrator.sse.ingest.error', {
          reason: `http_${response.status}`,
          retryInMs: 0
        }, { level: 'warn' });
      }
    }).catch(error => {
      safeEmit('orchestrator.sse.ingest.error', {
        reason: `network_${error.name || 'unknown'}`,
        retryInMs: 0
      }, { level: 'warn' });
    });
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
    updateOptions: (opts: Partial<SSETransportOptions>) => activeTransport!.updateOptions(opts),
    send: (level: string, message: string, data?: unknown) => activeTransport!.send(level, message, data)
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
function getSSECapabilities(): {
  filters: { branches: boolean; levels: boolean };
  ingestion: boolean;
  resume: boolean;
  batching: boolean;
  heartbeat: boolean;
  auth: boolean;
  version: number;
  supported: boolean;
} {
  return {
    filters: { 
      branches: true,  // P3 - ✅ implemented (query param filtering)
      levels: true     // P3 - ✅ implemented (query param filtering)
    },
    ingestion: true,   // P2 - ✅ implemented (controller.send)
    resume: false,     // P5 - not yet implemented
    batching: true,    // P2 - ✅ outbound buffering implemented
    heartbeat: false,  // P4 - not yet implemented
    auth: false,       // P6 - not yet implemented
    version: 2,        // Bumped for P3 filter feature
    supported: isSSESupported()
  } as const;
}

/**
 * Get SSE help and usage information
 */
function getSSEHelp(): {
  description: string;
  usage: Record<string, string>;
  endpoint: Record<string, string>;
  examples: Record<string, string>;
  filtering: Record<string, string>;
  reserved: Record<string, string>;
  limitations: Record<string, string>;
} {
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
      method: 'GET (downlink), POST (uplink when available)',
      cors: 'Enabled by default',
      format: 'Server-Sent Events (text/event-stream)'
    },
    examples: {
      basic: 'const controller = debug.sse.connect();',
      customPath: 'const controller = debug.sse.connect({ endpoint: { path: "/logs/stream" } });',
      checkStatus: 'controller.isRunning() // true if connected',
      sendLogs: 'controller.send("info", "message", data) // P2: client → server (future)',
      stop: 'controller.stop() // disconnect'
    },
    filtering: {
      description: 'Server-side event filtering (P3 - ✅ Available)',
      byBranches: 'debug.sse.connect() + URL: /__jitterbug/sse?branches=core,ui',
      byLevels: 'debug.sse.connect() + URL: /__jitterbug/sse?levels=error,warn',
      combined: 'Both: /__jitterbug/sse?branches=core&levels=error,info',
      behavior: 'Empty filter = pass-through, unknown values ignored gracefully'
    },
    reserved: {
      auth: 'P6: { token?: string, getToken?: () => Promise<string> } - authentication',
      resume: 'P5: connection resume with lastEventId'
    },
    limitations: {
      phase: 'P3 - Bidirectional streaming with server-side filtering',
      heartbeat: 'Automatic reconnection not yet available (P4)',
      resume: 'Connection resume not yet available (P5)',
      clientFilters: 'Client-side filtering deferred (use server filters instead)'
    }
  } as const;
}

// Internal module exports - not part of public surface, only for umbrella integration
export { connectSSE, isSSESupported, getSSECapabilities, getSSEHelp };

// Test-only exports (not in public surface)
if (process.env.NODE_ENV === 'test') {
  (globalThis as Record<string, unknown>).__JITTERBUG_SSE_TEST__ = { resetSSETransport };
}