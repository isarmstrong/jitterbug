/**
 * SSE Endpoint Handler
 * 
 * Provides /__jitterbug/sse endpoint for Server-Sent Events log streaming.
 * Phase P1: Basic functionality without batching or authentication.
 */

import { LogStreamHub, type BroadcastMessage } from './log-stream-hub.js';

// P3: Filter predicate type
type LogFilterPredicate = (entry: { level: string; branch?: string }) => boolean;

// P3: Parse filter query parameters
function parseFilters(url: URL): LogFilterPredicate | undefined {
  const branches = url.searchParams.get('branches');
  const levels = url.searchParams.get('levels');
  
  if (!branches && !levels) return undefined;
  
  const branchSet = branches ? new Set(branches.split(',').map(b => b.trim().toLowerCase())) : undefined;
  const levelSet = levels ? new Set(levels.split(',').map(l => l.trim())) : undefined;
  
  if (branchSet && levelSet) {
    return (entry) => {
      const branch = entry.branch?.toLowerCase() ?? '';
      return branchSet.has(branch) && levelSet.has(entry.level);
    };
  }
  
  if (branchSet) {
    return (entry) => {
      const branch = entry.branch?.toLowerCase() ?? '';
      return branchSet.has(branch);
    };
  }
  
  // levels only
  return (entry) => levelSet!.has(entry.level);
}

interface SSEEndpointConfig {
  path?: string;
  cors?: boolean;
  heartbeatMs?: number;
  clientTimeoutMs?: number;
}

interface SSERequest {
  method: string;
  url: string;
  headers: Record<string, string>;
}

interface SSEResponse {
  status: number;
  headers: Record<string, string>;
  body?: ReadableStream<Uint8Array> | string;
}

class SSEEndpoint {
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

    // Handle GET requests for SSE stream
    if (request.method === 'GET') {
      return this.createSSEResponse(request);
    }

    // P4.2-b: Handle POST requests for filter updates and client ingestion
    if (request.method === 'POST') {
      return this.handleControlMessage(request);
    }

    // Method not allowed
    return {
      status: 405,
      headers: { 'Allow': 'GET, POST' },
      body: 'Method Not Allowed'
    };
  }

  /**
   * P4.2-b: Handle control messages (filter updates, client ingestion)
   */
  private handleControlMessage(_request: SSERequest): SSEResponse {
    try {
      // TODO: Parse request body to get control frames
      // For now, return success - this will be implemented when we integrate with transport
      return {
        status: 202,
        headers: this.config.cors ? { 'Access-Control-Allow-Origin': '*' } : {},
        body: 'Accepted'
      };
    } catch (error) {
      console.error('Failed to handle control message:', error);
      return {
        status: 500,
        headers: {},
        body: 'Internal Server Error'
      };
    }
  }

  /**
   * Create CORS preflight response
   */
  private createCORSResponse(): SSEResponse {
    return {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Cache-Control, Content-Type',
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
      // P3: Parse filters from query parameters
      const url = new URL(request.url, 'http://localhost');
      const filter = parseFilters(url);
      
      const client = this.hub.addClient(clientId, filter);
      
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
  broadcastLog(logEvent: unknown): number {
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
  getDiagnostics(): {
    endpoint: {
      path: string;
      cors: boolean;
      uptime: number;
    };
    hub: {
      activeClients: number;
      totalConnections: number;
      uptime: number;
      messagesDispatched: number;
    };
  } {
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

// Internal module exports - not part of public surface
export { SSEEndpoint, type SSEEndpointConfig, type SSERequest, type SSEResponse };