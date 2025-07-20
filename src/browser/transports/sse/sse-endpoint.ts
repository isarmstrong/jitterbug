/**
 * SSE Endpoint Handler
 * 
 * Provides /__jitterbug/sse endpoint for Server-Sent Events log streaming.
 * Phase P1: Basic functionality without batching or authentication.
 */

import { LogStreamHub, type BroadcastMessage } from './log-stream-hub.js';

export interface SSEEndpointConfig {
  path?: string;
  cors?: boolean;
  heartbeatMs?: number;
  clientTimeoutMs?: number;
}

export interface SSERequest {
  method: string;
  url: string;
  headers: Record<string, string>;
}

export interface SSEResponse {
  status: number;
  headers: Record<string, string>;
  body?: ReadableStream<Uint8Array> | string;
}

export class SSEEndpoint {
  private hub: LogStreamHub;
  private readonly config: Required<SSEEndpointConfig>;
  private clientSequence = 0;

  constructor(config: SSEEndpointConfig = {}) {
    this.config = {
      path: '/__jitterbug/sse',
      cors: true,
      heartbeatMs: 30000,
      clientTimeoutMs: 60000,
      ...config
    };

    this.hub = new LogStreamHub(this.config.heartbeatMs, this.config.clientTimeoutMs);
  }

  /**
   * Handle incoming HTTP request
   */
  handleRequest(request: SSERequest): SSEResponse {
    const url = new URL(request.url, 'http://localhost');

    // Handle CORS preflight
    if (request.method === 'OPTIONS' && this.config.cors) {
      return this.createCORSResponse();
    }

    // Check if this is our SSE endpoint
    if (url.pathname !== this.config.path) {
      return {
        status: 404,
        headers: {},
        body: 'Not Found'
      };
    }

    // Only allow GET for SSE
    if (request.method !== 'GET') {
      return {
        status: 405,
        headers: { 'Allow': 'GET' },
        body: 'Method Not Allowed'
      };
    }

    return this.createSSEResponse(request);
  }

  /**
   * Create CORS preflight response
   */
  private createCORSResponse(): SSEResponse {
    return {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Cache-Control',
        'Access-Control-Max-Age': '86400'
      }
    };
  }

  /**
   * Create SSE response with client stream
   */
  private createSSEResponse(request: SSERequest): SSEResponse {
    const clientId = `client-${++this.clientSequence}-${Date.now()}`;
    
    try {
      const client = this.hub.addClient(clientId);
      
      const headers: Record<string, string> = {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      };

      if (this.config.cors) {
        headers['Access-Control-Allow-Origin'] = '*';
        headers['Access-Control-Allow-Credentials'] = 'false';
      }

      return {
        status: 200,
        headers,
        body: client.stream
      };
    } catch (error) {
      console.error(`Failed to create SSE client ${clientId}:`, error);
      return {
        status: 500,
        headers: {},
        body: 'Internal Server Error'
      };
    }
  }

  /**
   * Broadcast log event to all connected clients
   */
  broadcastLog(logEvent: any): number {
    const message: BroadcastMessage = {
      type: 'log',
      data: logEvent,
      timestamp: Date.now()
    };

    return this.hub.broadcast(message);
  }

  /**
   * Get endpoint diagnostics
   */
  getDiagnostics() {
    const hubDiagnostics = this.hub.getDiagnostics();
    
    return {
      endpoint: {
        path: this.config.path,
        cors: this.config.cors,
        uptime: hubDiagnostics.uptime
      },
      hub: hubDiagnostics
    };
  }

  /**
   * Shutdown endpoint and clean up resources
   */
  shutdown(): void {
    this.hub.shutdown();
  }

  /**
   * Get reference to underlying hub (for testing)
   */
  getHub(): LogStreamHub {
    return this.hub;
  }
}