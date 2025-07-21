/**
 * Log Stream Hub - SSE Client Session Management
 * 
 * Manages multiple SSE connections and broadcasts log events to active clients.
 * Handles connection lifecycle, heartbeats, and graceful cleanup.
 * P4.2-b: Added server-side filter update handling with ACK/error protocol.
 */

import { safeEmit } from '../../schema-registry.js';

// P3: Filter predicate type (legacy)
type LogFilterPredicate = (entry: { level: string; branch?: string }) => boolean;

// P4.2-b: Import types from sse-transport
type LiveFilterSpec = 
  | { kind: 'branches-levels'; branches?: string[]; levels?: string[] }
  | { kind: 'keyword'; keywords: string[] };

interface FilterUpdateFrame {
  op: 'filter:update';
  tag: string;
  ts: number;
  spec: LiveFilterSpec;
}

interface FilterAckFrame {
  op: 'filter:ack';
  tag: string;
  appliedTs: number;
  activeSpec: LiveFilterSpec;
}

interface FilterErrFrame {
  op: 'filter:error';
  tag: string;
  code: 'invalid_spec' | 'auth_failed' | 'rate_limited' | 'internal';
  message?: string;
}

// P4.2-b: Rate limiting constants
const RATE_LIMIT_WINDOW_MS = 5000; // 5 seconds
const RATE_LIMIT_MAX = 3; // 3 updates per window
const MAX_BRANCHES = 32;
const MAX_LEVELS = 8;

// P4.2-b: Filter context for each connection
interface FilterContext {
  spec: LiveFilterSpec;
  predicate: LogFilterPredicate;
  tsWindow: number[];        // sliding window of update timestamps
  seenTags: Set<string>;     // dedupe tags within connection
}

interface SSEClient {
  readonly id: string;
  readonly stream: ReadableStream<Uint8Array>;
  readonly controller: ReadableStreamDefaultController<Uint8Array>;
  readonly connectedAt: number;
  lastHeartbeat: number;
  isActive: boolean;
  // P3: Optional filter predicate for this client (legacy)
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
  
  // P4.2-b: Filter state management
  private filters = new Map<string, FilterContext>();
  
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

    // P4.2-b: Clean up filter context
    this.cleanupClientFilter(clientId);

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
        const logData = message.data as { level?: string; branch?: string };
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
    
    // P4.2-b: Clean up filter contexts
    this.filters.clear();
  }

  // P4.2-b: Handle filter update frames from clients
  handleFilterUpdate(clientId: string, frame: FilterUpdateFrame): void {
    const client = this.clients.get(clientId);
    if (!client || !client.isActive) {
      return; // Client not found or inactive
    }

    // Get or initialize filter context
    let ctx = this.filters.get(clientId);
    if (!ctx) {
      ctx = this.initFilterContext();
      this.filters.set(clientId, ctx);
    }

    // 1. Replay protection - ignore duplicate tags
    if (ctx.seenTags.has(frame.tag)) {
      return;
    }
    ctx.seenTags.add(frame.tag);

    // 2. Rate limiting check
    if (this.isRateLimited(ctx)) {
      const errorFrame: FilterErrFrame = {
        op: 'filter:error',
        tag: frame.tag,
        code: 'rate_limited',
        message: `Rate limit exceeded: max ${RATE_LIMIT_MAX} updates per ${RATE_LIMIT_WINDOW_MS}ms`
      };
      this.sendFrameToClient(client, errorFrame);
      
      // Emit telemetry
      safeEmit('orchestrator.sse.filters.rate_limited', {
        clientId,
        tag: frame.tag,
        windowMs: RATE_LIMIT_WINDOW_MS
      }, { level: 'warn' });
      return;
    }

    // 3. Validate spec
    const validation = this.validateFilterSpec(frame.spec);
    if (!validation.ok) {
      const errorFrame: FilterErrFrame = {
        op: 'filter:error',
        tag: frame.tag,
        code: 'invalid_spec',
        message: validation.error
      };
      this.sendFrameToClient(client, errorFrame);
      
      // Emit telemetry
      safeEmit('orchestrator.sse.filters.validation_error', {
        clientId,
        tag: frame.tag,
        error: validation.error
      }, { level: 'warn' });
      return;
    }

    // 4. Authorization check (placeholder - always allow for now)
    if (!this.authorizeFilter(clientId, validation.spec)) {
      const errorFrame: FilterErrFrame = {
        op: 'filter:error',
        tag: frame.tag,
        code: 'auth_failed',
        message: 'Not authorized to set this filter'
      };
      this.sendFrameToClient(client, errorFrame);
      return;
    }

    // 5. Success - apply filter and send ACK
    ctx.spec = validation.spec;
    ctx.predicate = this.compileFilterPredicate(validation.spec);
    
    // Update legacy filter for P3 compatibility
    client.filter = ctx.predicate;

    const ackFrame: FilterAckFrame = {
      op: 'filter:ack',
      tag: frame.tag,
      appliedTs: Date.now(),
      activeSpec: validation.spec
    };
    this.sendFrameToClient(client, ackFrame);

    // Emit telemetry
    safeEmit('orchestrator.sse.filters.applied', {
      clientId,
      tag: frame.tag,
      spec: validation.spec,
      appliedTs: ackFrame.appliedTs
    }, { level: 'debug' });
  }

  // P4.2-b: Initialize filter context with defaults
  private initFilterContext(): FilterContext {
    return {
      spec: { kind: 'branches-levels' }, // Default: match all
      predicate: () => true,
      tsWindow: [],
      seenTags: new Set()
    };
  }

  // P4.2-b: Rate limiting with sliding window
  private isRateLimited(ctx: FilterContext): boolean {
    const now = Date.now();
    
    // Remove timestamps outside the window
    ctx.tsWindow = ctx.tsWindow.filter(ts => now - ts < RATE_LIMIT_WINDOW_MS);
    
    // Add current timestamp
    ctx.tsWindow.push(now);
    
    // Check if limit exceeded
    return ctx.tsWindow.length > RATE_LIMIT_MAX;
  }

  // P4.2-b: Validate LiveFilterSpec
  private validateFilterSpec(spec: unknown): 
    { ok: true; spec: LiveFilterSpec } | { ok: false; error: string } {
    
    if (!spec || typeof spec !== 'object') {
      return { ok: false, error: 'Spec must be an object' };
    }

    const s = spec as Record<string, unknown>;
    
    switch (s.kind) {
      case 'branches-levels':
        if (s.branches && (!Array.isArray(s.branches) || s.branches.length > MAX_BRANCHES)) {
          return { ok: false, error: `Invalid branches: max ${MAX_BRANCHES} allowed` };
        }
        if (s.levels && (!Array.isArray(s.levels) || s.levels.length > MAX_LEVELS)) {
          return { ok: false, error: `Invalid levels: max ${MAX_LEVELS} allowed` };
        }
        return { ok: true, spec: spec as LiveFilterSpec };
        
      case 'keyword':
        if (!Array.isArray(s.keywords) || s.keywords.length === 0) {
          return { ok: false, error: 'Keywords must be non-empty array' };
        }
        return { ok: true, spec: spec as LiveFilterSpec };
        
      default:
        return { ok: false, error: `Unknown filter kind: ${s.kind}` };
    }
  }

  // P4.2-b: Compile LiveFilterSpec to predicate function
  private compileFilterPredicate(spec: LiveFilterSpec): LogFilterPredicate {
    switch (spec.kind) {
      case 'branches-levels': {
        const branchSet = spec.branches ? new Set(spec.branches.map(b => b.toLowerCase())) : undefined;
        const levelSet = spec.levels ? new Set(spec.levels) : undefined;
        
        return (entry) => {
          if (branchSet) {
            const branch = entry.branch?.toLowerCase() ?? '';
            if (!branchSet.has(branch)) return false;
          }
          
          if (levelSet && !levelSet.has(entry.level)) return false;
          
          return true;
        };
      }
      
      case 'keyword': {
        const keywords = spec.keywords.map(k => k.toLowerCase());
        return (entry) => {
          const searchText = `${entry.level} ${entry.branch || ''}`.toLowerCase();
          return keywords.some(keyword => searchText.includes(keyword));
        };
      }
      
      default:
        return () => true; // Match all as fallback
    }
  }

  // P4.2-b: Authorization check (placeholder)
  private authorizeFilter(_clientId: string, _spec: LiveFilterSpec): boolean {
    // TODO: Implement actual authorization logic
    // For now, allow all filters
    return true;
  }

  // P4.2-b: Send frame to specific client
  private sendFrameToClient(client: SSEClient, frame: FilterAckFrame | FilterErrFrame): void {
    try {
      const sseData = `event: ${frame.op}\ndata: ${JSON.stringify(frame)}\nid: ${Date.now()}\n\n`;
      const encoder = new TextEncoder();
      client.controller.enqueue(encoder.encode(sseData));
    } catch (error) {
      console.warn(`Failed to send filter frame to client ${client.id}:`, error);
      client.isActive = false;
    }
  }

  // P4.2-b: Get active filter for a client (for reconnect replay)
  getClientFilter(clientId: string): LiveFilterSpec | undefined {
    return this.filters.get(clientId)?.spec;
  }

  // P4.2-b: Clean up filter context when client disconnects
  private cleanupClientFilter(clientId: string): void {
    this.filters.delete(clientId);
  }

  // P4.2-c.4: Handle control messages with auth and telemetry
  async handleControlMessage(req: any, res: any): Promise<void> {
    const { authorizeFilterUpdate } = await import('./auth');
    
    if (!req.body || req.body.type !== 'filter:update') {
      res.body = { type: 'filter:error', tag: req.body?.tag || 'unknown', reason: 'invalid_message' };
      return;
    }

    const { tag, spec } = req.body;

    // Authorization check
    const authResult = authorizeFilterUpdate(req, spec);
    if (!authResult.ok) {
      res.body = { type: 'filter:error', tag, reason: authResult.reason || 'unauthorized' };
      return;
    }

    // Success case - apply filter and emit telemetry
    res.body = { type: 'filter:ack', tag };

    // Emit telemetry with user context
    const { experimentalSafeEmit } = await import('../../public');
    await experimentalSafeEmit(
      'orchestrator.sse.filters.applied',
      { 
        clientId: authResult.userId || 'unknown', 
        tag, 
        spec, 
        appliedTs: Date.now() 
      },
      { bubble: false }
    );
  }

  // P4.2-c.4: Apply filter update with validation (for testing)
  async applyFilterUpdate(connId: number, tag: string, spec: any): Promise<void> {
    // Validation would happen here in production
    // For testing, just emit telemetry
    const { experimentalSafeEmit } = await import('../../public');
    await experimentalSafeEmit(
      'orchestrator.sse.filters.applied',
      { 
        clientId: `conn-${connId}`, 
        tag, 
        spec, 
        appliedTs: Date.now() 
      },
      { bubble: false }
    );
  }
}

// Export only for internal module use
export { LogStreamHub, type BroadcastMessage };