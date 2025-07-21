/**
 * Client-Side SSE Transport - P4.4-b-1
 * Receives server push frames via Server-Sent Events
 * Handles HMAC verification for signed frames
 */

import { processFrame, isSignedFrame } from './verify.js';
import { safeEmit } from '../../schema-registry.js';
import type { AnyPushFrame } from '../../../hub/emitters/registry.js';

interface SSEClientConfig {
  url?: string;
  reconnectMs?: number;
  maxReconnectAttempts?: number;
}

const DEFAULT_CONFIG: Required<SSEClientConfig> = {
  url: '/__jitterbug/push',
  reconnectMs: 5_000,
  maxReconnectAttempts: 5
};

export class SSETransport {
  private eventSource: EventSource | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private connected = false;
  private readonly config: Required<SSEClientConfig>;

  constructor(config: SSEClientConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  connect(): void {
    if (this.eventSource) {
      console.warn('[SSETransport] Already connected');
      return;
    }

    try {
      this.eventSource = new EventSource(this.config.url);
      this.setupEventHandlers();
      
      safeEmit('orchestrator.sse.client.connecting', {
        url: this.config.url
      }, { level: 'debug' });
      
    } catch (error) {
      console.error('[SSETransport] Failed to connect:', error);
      this.scheduleReconnect();
    }
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    this.connected = false;
    this.reconnectAttempts = 0;
  }

  private setupEventHandlers(): void {
    if (!this.eventSource) return;

    this.eventSource.onopen = () => {
      this.connected = true;
      this.reconnectAttempts = 0;
      
      safeEmit('orchestrator.sse.client.connected', {
        url: this.config.url
      }, { level: 'info' });
    };

    this.eventSource.onmessage = (event: MessageEvent) => {
      this.handleMessage(event);
    };

    this.eventSource.onerror = (_event) => {
      this.connected = false;
      
      safeEmit('orchestrator.sse.client.error', {
        error: 'connection_failed',
        readyState: this.eventSource?.readyState
      }, { level: 'warn' });

      // EventSource will automatically reconnect, but we handle our own logic
      this.scheduleReconnect();
    };
  }

  private handleMessage(event: MessageEvent<string>): void {
    try {
      // Parse JSON message
      let parsed: unknown;
      try {
        parsed = JSON.parse(event.data);
      } catch {
        console.warn('[SSETransport] Failed to parse message:', event.data);
        return;
      }

      // Process frame (verify if signed, pass-through if unsigned)
      const frame = processFrame(parsed);
      
      // Log verification success
      if (isSignedFrame(parsed)) {
        safeEmit('orchestrator.sse.signature.verified', {
          kid: parsed.kid,
          clientId: 'browser'
        }, { level: 'debug' });
      }

      // Dispatch validated frame to application
      this.dispatch(frame);

    } catch (error) {
      // Handle verification failures
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Re-parse to check if it's a signed frame for error reporting
      let parsedForError: unknown;
      try {
        parsedForError = JSON.parse(event.data);
      } catch {
        parsedForError = null;
      }
      
      if (isSignedFrame(parsedForError)) {
        const signedFrame = parsedForError as any;
        safeEmit('orchestrator.sse.signature.invalid', {
          clientId: 'browser',
          kid: signedFrame.kid || 'unknown',
          error: errorMessage
        }, { level: 'warn' });
      } else {
        safeEmit('orchestrator.sse.signature.key_missing', {
          clientId: 'browser',
          kid: 'unknown',
          error: errorMessage
        }, { level: 'error' });
      }
      
      console.warn('[SSETransport] Dropped frame:', errorMessage);
    }
  }

  private dispatch(frame: AnyPushFrame): void {
    // TODO: Integrate with application's push frame handling
    // For now, emit telemetry event
    safeEmit('orchestrator.push.frame.received', {
      type: frame.t,
      timestamp: frame.ts,
      source: 'sse'
    }, { level: 'debug' });

    // Log frame for debugging
    console.debug('[SSETransport] Received frame:', frame);
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error('[SSETransport] Max reconnect attempts reached');
      safeEmit('orchestrator.sse.client.failed', {
        attempts: this.reconnectAttempts,
        maxAttempts: this.config.maxReconnectAttempts
      }, { level: 'error' });
      return;
    }

    if (this.reconnectTimer) return; // Already scheduled

    this.reconnectAttempts++;
    const delay = this.config.reconnectMs * Math.pow(1.5, this.reconnectAttempts - 1);
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      
      if (this.eventSource) {
        this.eventSource.close();
        this.eventSource = null;
      }
      
      safeEmit('orchestrator.sse.client.reconnecting', {
        attempt: this.reconnectAttempts,
        delayMs: delay
      }, { level: 'info' });
      
      this.connect();
    }, delay);
  }

  isConnected(): boolean {
    return this.connected;
  }

  getStats(): {
    connected: boolean;
    url: string;
    reconnectAttempts: number;
  } {
    return {
      connected: this.connected,
      url: this.config.url,
      reconnectAttempts: this.reconnectAttempts
    };
  }
}

// Singleton client instance
let sseTransport: SSETransport | null = null;

/**
 * Get or create SSE transport instance
 */
export function getSSETransport(config?: SSEClientConfig): SSETransport {
  if (!sseTransport) {
    sseTransport = new SSETransport(config);
  }
  return sseTransport;
}

/**
 * Connect to server push stream
 */
export function connectPushStream(config?: SSEClientConfig): SSETransport {
  const transport = getSSETransport(config);
  transport.connect();
  return transport;
}