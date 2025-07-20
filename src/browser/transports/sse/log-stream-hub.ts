/**
 * Log Stream Hub - SSE Client Session Management
 * 
 * Manages multiple SSE connections and broadcasts log events to active clients.
 * Handles connection lifecycle, heartbeats, and graceful cleanup.
 */

import { safeEmit } from '../../schema-registry.js';

// P3: Filter predicate type
type LogFilterPredicate = (entry: { level: string; branch?: string }) => boolean;

interface SSEClient {
  readonly id: string;
  readonly stream: ReadableStream<Uint8Array>;
  readonly controller: ReadableStreamDefaultController<Uint8Array>;
  readonly connectedAt: number;
  lastHeartbeat: number;
  isActive: boolean;
  // P3: Optional filter predicate for this client
  filter?: LogFilterPredicate;
  // P3: Filter stats
  stats: {
    sent: number;
    filteredOut: number;
    lastDispatchTs?: number;
  };
}

interface BroadcastMessage {
  type: 'log' | 'heartbeat' | 'ready';
  data: unknown;
  timestamp: number;
}

interface HubDiagnostics {
  activeClients: number;
  totalConnections: number;
  uptime: number;
  messagesDispatched: number;
}

class LogStreamHub {
  private clients = new Map<string, SSEClient>();
  private totalConnections = 0;
  private messagesDispatched = 0;
  private readonly startTime = Date.now();
  private heartbeatInterval?: NodeJS.Timeout;
  
  constructor(
    private readonly heartbeatMs = 30000,
    private readonly clientTimeoutMs = 60000
  ) {
    this.startHeartbeat();
  }

  /**
   * Add a new SSE client to the hub
   */
  addClient(clientId: string, filter?: LogFilterPredicate): SSEClient {
    if (this.clients.has(clientId)) {
      throw new Error(`Client ${clientId} already exists`);
    }

    let controller: ReadableStreamDefaultController<Uint8Array>;
    
    const stream = new ReadableStream<Uint8Array>({
      start(ctrl): void {
        controller = ctrl;
      },
      cancel: (): void => {
        // Client disconnected - will be cleaned up by hub
      }
    });

    const client: SSEClient = {
      id: clientId,
      stream,
      controller: controller!,
      connectedAt: Date.now(),
      lastHeartbeat: Date.now(),
      isActive: true,
      filter,
      stats: {
        sent: 0,
        filteredOut: 0
      }
    };

    this.clients.set(clientId, client);
    this.totalConnections++;

    // Send ready message to new client
    this.sendToClient(client, {
      type: 'ready',
      data: { clientId, connectedAt: client.connectedAt },
      timestamp: Date.now()
    });

    // Emit connection event
    safeEmit('orchestrator.sse.connection.opened', {
      connectionId: clientId,
      since: client.connectedAt,
      filters: {}, // P3: will include actual filter config
      totalConnections: this.clients.size
    }, { level: 'debug' });

    return client;
  }

  /**
   * Remove a client from the hub
   */
  removeClient(clientId: string): boolean {
    const client = this.clients.get(clientId);
    if (!client) {
      return false;
    }

    const uptime = Date.now() - client.connectedAt;
    client.isActive = false;
    
    try {
      client.controller.close();
    } catch {
      // Controller may already be closed
    }

    this.clients.delete(clientId);

    // Emit disconnection event
    safeEmit('orchestrator.sse.connection.closed', {
      connectionId: clientId,
      reason: 'client_disconnect', // TODO P4: distinguish close reasons
      durationMs: uptime,
      totalConnections: this.clients.size
    }, { level: 'debug' });

    return true;
  }

  /**
   * Broadcast a message to all active clients
   */
  broadcast(message: BroadcastMessage): number {
    let successCount = 0;
    let filteredCount = 0;
    const deadClients: string[] = [];

    for (const [clientId, client] of this.clients) {
      if (!client.isActive) {
        deadClients.push(clientId);
        continue;
      }

      // P3: Apply filter for log messages (skip filtering for heartbeat/ready)
      if (message.type === 'log' && client.filter) {
        const logData = message.data;
        const filterEntry = {
          level: logData.level || 'info',
          branch: logData.branch
        };
        
        if (!client.filter(filterEntry)) {
          client.stats.filteredOut++;
          filteredCount++;
          continue;
        }
      }

      if (this.sendToClient(client, message)) {
        client.stats.sent++;
        client.stats.lastDispatchTs = message.timestamp;
        successCount++;
      } else {
        deadClients.push(clientId);
      }
    }

    // Clean up dead clients
    deadClients.forEach(id => this.removeClient(id));
    
    this.messagesDispatched += successCount;

    // Emit batch send telemetry (only for actual log events, not heartbeat)
    if (message.type === 'log' && successCount > 0) {
      safeEmit('orchestrator.sse.event.sent', {
        count: successCount,
        messageType: message.type,
        activeConnections: this.clients.size,
        filteredOut: filteredCount
      }, { level: 'debug' });
    }
    
    return successCount;
  }

  /**
   * Send message to specific client
   */
  private sendToClient(client: SSEClient, message: BroadcastMessage): boolean {
    if (!client.isActive) {
      return false;
    }

    try {
      const sseData = this.formatSSEMessage(message);
      const encoder = new TextEncoder();
      client.controller.enqueue(encoder.encode(sseData));
      
      if (message.type === 'heartbeat') {
        client.lastHeartbeat = Date.now();
      }
      
      return true;
    } catch (error) {
      console.warn(`Failed to send message to client ${client.id}:`, error);
      client.isActive = false;
      return false;
    }
  }

  /**
   * Format message as SSE protocol
   */
  private formatSSEMessage(message: BroadcastMessage): string {
    const data = JSON.stringify(message.data);
    return `event: ${message.type}\ndata: ${data}\nid: ${message.timestamp}\n\n`;
  }

  /**
   * Start heartbeat system
   */
  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      return;
    }

    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      const timeoutThreshold = now - this.clientTimeoutMs;
      const deadClients: string[] = [];

      // Check for dead clients
      for (const [clientId, client] of this.clients) {
        if (client.lastHeartbeat < timeoutThreshold) {
          deadClients.push(clientId);
        }
      }

      // Remove dead clients
      deadClients.forEach(id => this.removeClient(id));

      // Send heartbeat to remaining clients
      if (this.clients.size > 0) {
        this.broadcast({
          type: 'heartbeat',
          data: { timestamp: now, clients: this.clients.size },
          timestamp: now
        });
      }
    }, this.heartbeatMs);
  }

  /**
   * Get client by ID
   */
  getClient(clientId: string): SSEClient | undefined {
    return this.clients.get(clientId);
  }

  /**
   * Get all active client IDs
   */
  getActiveClients(): string[] {
    return Array.from(this.clients.keys()).filter(id => 
      this.clients.get(id)?.isActive
    );
  }

  /**
   * Get hub diagnostics
   */
  getDiagnostics(): HubDiagnostics {
    return {
      activeClients: this.clients.size,
      totalConnections: this.totalConnections,
      uptime: Date.now() - this.startTime,
      messagesDispatched: this.messagesDispatched
    };
  }

  /**
   * Shutdown the hub and clean up all clients
   */
  shutdown(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }

    // Close all client streams
    for (const [clientId] of this.clients) {
      this.removeClient(clientId);
    }

    this.clients.clear();
  }
}

// Export only for internal module use
export { LogStreamHub, type BroadcastMessage };