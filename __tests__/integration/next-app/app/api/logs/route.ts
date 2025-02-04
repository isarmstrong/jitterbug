import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createLogHandler } from '@jitterbug-next/api';
import { headers } from 'next/headers';

// Support both Edge and Node.js runtimes
export const runtime = 'edge';

// Connection states
type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'failed';
type ConnectionInfo = {
    controller: ReadableStreamDefaultController;
    state: ConnectionState;
    lastHeartbeat: number;
    retryCount: number;
    heapUsage: number;
};

// Configuration
const CONFIG = {
    INITIAL_RETRY_DELAY: 1000,
    MAX_RETRY_ATTEMPTS: 5,
    HEARTBEAT_INTERVAL: 30000,
    MAX_BACKOFF_DELAY: 32000,
    CLEANUP_INTERVAL: 60000,
    MAX_HEAP_USAGE: 100 * 1024 * 1024, // 100MB
    CONNECTION_TIMEOUT: 35000, // Slightly more than heartbeat interval
};

// Log version info for debugging
const versions = {
    next: process?.versions?.['next'] || '15.1.6',
    node: process?.versions?.node || '22',
    react: process?.versions?.['react'] || '18.2.0'
};

console.log('[Jitterbug Route] Initializing with versions:', versions);

// Track active connections with state
const connections = new Map<string, ConnectionInfo>();
let sequence = 0;
let cleanupInterval: NodeJS.Timeout;

// Memory monitoring
function getCurrentHeapUsage(): number {
    try {
        // @ts-ignore - Edge runtime specific
        return performance?.memory?.usedJSHeapSize || 0;
    } catch {
        return 0;
    }
}

// Cleanup stale connections
function setupCleanup() {
    if (cleanupInterval) clearInterval(cleanupInterval);

    cleanupInterval = setInterval(() => {
        const now = Date.now();
        Array.from(connections.entries()).forEach(([clientId, info]) => {
            // Check for stale connections
            if (now - info.lastHeartbeat > CONFIG.CONNECTION_TIMEOUT) {
                console.log('[Jitterbug Route] Cleaning up stale connection:', clientId);
                closeConnection(clientId, 'timeout');
            }

            // Check memory usage
            if (info.heapUsage > CONFIG.MAX_HEAP_USAGE) {
                console.warn('[Jitterbug Route] Memory limit exceeded for client:', clientId);
                closeConnection(clientId, 'memory');
            }
        });
    }, CONFIG.CLEANUP_INTERVAL);
}

function closeConnection(clientId: string, reason: string) {
    const info = connections.get(clientId);
    if (!info) return;

    try {
        info.controller.close();
    } catch (e) {
        console.error('[Jitterbug Route] Error closing controller for client:', clientId, e);
    }

    connections.delete(clientId);
    console.log('[Jitterbug Route] Connection closed:', { clientId, reason });
}

// Calculate exponential backoff delay
function getRetryDelay(retryCount: number): number {
    const delay = Math.min(
        CONFIG.INITIAL_RETRY_DELAY * Math.pow(2, retryCount),
        CONFIG.MAX_BACKOFF_DELAY
    );
    return delay + Math.random() * 1000; // Add jitter
}

// Create a single handler instance
const handler = createLogHandler({
    cors: true,
    processLogs: async (logs) => {
        console.log('[Jitterbug Route] Received logs:', logs);

        if (connections.size > 0) {
            try {
                const encoder = new TextEncoder();
                const message = encoder.encode(`id: ${sequence++}\ndata: ${JSON.stringify(logs)}\n\n`);

                // Send to all active connections
                Array.from(connections.entries()).forEach(([clientId, info]) => {
                    if (info.state !== 'connected') return;

                    try {
                        info.controller.enqueue(message);
                        info.heapUsage = getCurrentHeapUsage();
                    } catch (e) {
                        console.error('[Jitterbug Route] Failed to send to client:', clientId, e);
                        closeConnection(clientId, 'error');
                    }
                });
                console.log('[Jitterbug Route] Sent logs to', connections.size, 'connections');
            } catch (e) {
                console.error('[Jitterbug Route] Failed to encode logs:', e);
            }
        } else {
            console.warn('[Jitterbug Route] No active SSE connections to send logs');
        }
    }
});

function createSSEStream(clientId: string) {
    console.log('[Jitterbug Route] Creating SSE stream for client:', clientId);
    let heartbeatInterval: NodeJS.Timeout;

    return new ReadableStream({
        start(controller) {
            // Initialize connection info
            connections.set(clientId, {
                controller,
                state: 'connecting',
                lastHeartbeat: Date.now(),
                retryCount: 0,
                heapUsage: getCurrentHeapUsage()
            });

            console.log('[Jitterbug Route] SSE stream started for client:', clientId);

            // Send initial connection message
            const encoder = new TextEncoder();
            try {
                controller.enqueue(encoder.encode(`id: ${sequence++}\ndata: {"type":"connected","clientId":"${clientId}","timestamp":"${new Date().toISOString()}"}\n\n`));

                // Update connection state
                const info = connections.get(clientId);
                if (info) {
                    info.state = 'connected';
                    info.lastHeartbeat = Date.now();
                }

                console.log('[Jitterbug Route] Connection established for client:', clientId);
            } catch (e) {
                console.error('[Jitterbug Route] Failed to send initial message to client:', clientId, e);
                closeConnection(clientId, 'init_error');
                return;
            }

            // Setup heartbeat
            heartbeatInterval = setInterval(() => {
                const info = connections.get(clientId);
                if (!info || info.state !== 'connected') {
                    clearInterval(heartbeatInterval);
                    return;
                }

                try {
                    controller.enqueue(encoder.encode(`id: ${sequence++}\ndata: {"type":"heartbeat","clientId":"${clientId}","timestamp":"${new Date().toISOString()}"}\n\n`));
                    info.lastHeartbeat = Date.now();
                    info.heapUsage = getCurrentHeapUsage();
                } catch (e) {
                    console.error('[Jitterbug Route] Heartbeat failed for client:', clientId, e);
                    closeConnection(clientId, 'heartbeat_error');
                }
            }, CONFIG.HEARTBEAT_INTERVAL);

            // Ensure cleanup interval is running
            setupCleanup();
        },
        cancel() {
            console.log('[Jitterbug Route] SSE stream cancelled for client:', clientId);
            clearInterval(heartbeatInterval);

            const info = connections.get(clientId);
            if (!info) return;

            info.state = 'disconnected';
            info.retryCount++;

            // Handle reconnection with exponential backoff
            if (info.retryCount < CONFIG.MAX_RETRY_ATTEMPTS) {
                const delay = getRetryDelay(info.retryCount);
                console.log('[Jitterbug Route] Scheduling reconnection attempt', info.retryCount, 'for client:', clientId, 'in', delay, 'ms');

                setTimeout(() => {
                    if (connections.has(clientId)) {
                        console.log('[Jitterbug Route] Attempting reconnection for client:', clientId);
                        info.state = 'connecting';
                    }
                }, delay);
            } else {
                console.log('[Jitterbug Route] Max reconnection attempts reached for client:', clientId);
                closeConnection(clientId, 'max_retries');
            }
        }
    });
}

// Helper to convert NextRequest to standard Request
function toStandardRequest(req: NextRequest): Request {
    return new Request(req.url, {
        method: req.method,
        headers: req.headers,
        body: req.body,
        cache: req.cache,
        credentials: req.credentials,
        integrity: req.integrity,
        keepalive: req.keepalive,
        mode: req.mode,
        redirect: req.redirect,
        referrer: req.referrer,
        referrerPolicy: req.referrerPolicy,
        signal: req.signal
    });
}

export async function GET(req: NextRequest) {
    const standardReq = toStandardRequest(req);
    const headersList = await headers();
    const accept = headersList.get('accept') || '';
    const method = standardReq.method;

    // Extract client ID from URL path
    const url = new URL(standardReq.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const clientId = pathParts[pathParts.length - 1];

    // Log the request details for debugging
    console.log('[Jitterbug Route] Request details:', {
        method,
        accept,
        url: standardReq.url,
        pathParts,
        clientId
    });

    // Handle SSE requests
    if (method === 'GET' && accept.includes('text/event-stream')) {
        // Initial connection without client ID
        if (!clientId || pathParts.length <= 2) {
            console.log('[Jitterbug Route] Initial SSE connection request without client ID');
            return new NextResponse('Client ID required', { status: 400 });
        }

        // Validate client ID format (timestamp-random)
        const isValidClientId = /^\d+-[a-z0-9]+$/.test(clientId);
        if (!isValidClientId) {
            console.warn('[Jitterbug Route] Invalid client ID format:', clientId);
            return new NextResponse('Invalid client ID format', { status: 400 });
        }

        console.log('[Jitterbug Route] SSE connection requested for client:', clientId);

        // Check if client is already connected
        if (connections.has(clientId)) {
            console.log('[Jitterbug Route] Client already connected:', clientId);
            const existingConnection = connections.get(clientId);
            if (existingConnection?.state === 'connected') {
                return new NextResponse('Client already connected', { status: 409 });
            }
            // Clean up existing connection if not in connected state
            closeConnection(clientId, 'reconnect');
        }

        const stream = createSSEStream(clientId);
        console.log('[Jitterbug Route] Created SSE stream for client:', clientId);

        const response = new NextResponse(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache, no-transform',
                'Connection': 'keep-alive',
                'X-Accel-Buffering': 'no',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, HEAD, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
                'Access-Control-Expose-Headers': 'Content-Type'
            }
        });

        console.log('[Jitterbug Route] Returning SSE response');
        return response;
    }

    // Handle HEAD requests (used for connection checks)
    if (method === 'HEAD') {
        console.log('[Jitterbug Route] HEAD request headers:', headersList);
        return new NextResponse(null, { status: 200 });
    }

    // Handle other requests through the standard handler
    return handler.GET(standardReq);
}

export async function POST(req: NextRequest) {
    const standardReq = toStandardRequest(req);
    return handler.POST(standardReq);
}

export async function HEAD(req: NextRequest) {
    const standardReq = toStandardRequest(req);
    // Allow HEAD requests for EventSource health checks
    const headersList = await headers();
    console.log('[Jitterbug Route] HEAD request headers:', headersList);

    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, HEAD, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
            'Access-Control-Expose-Headers': 'Content-Type'
        }
    });
}

export async function OPTIONS(req: NextRequest) {
    return handler.OPTIONS();
} 