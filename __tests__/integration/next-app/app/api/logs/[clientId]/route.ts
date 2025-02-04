import { createLogHandler, createSSETransport, type LogHandler, type LogType } from '@jitterbug-next/api';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Support both Edge and Node.js runtimes
export const runtime = 'edge';

// Connection states
type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'failed';
type ConnectionInfo = {
    controller: ReadableStreamDefaultController<any> | null;
    state: 'connecting' | 'connected' | 'closed';
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
    console.log('[Jitterbug Route] Connection closed:', { clientId, reason });
    connections.delete(clientId);
}

// Calculate exponential backoff delay
function getRetryDelay(retryCount: number): number {
    const delay = Math.min(
        CONFIG.INITIAL_RETRY_DELAY * Math.pow(2, retryCount),
        CONFIG.MAX_BACKOFF_DELAY
    );
    return delay + Math.random() * 1000; // Add jitter
}

// Create SSE transport instance
const transport = createSSETransport({
    endpoint: '/api/logs',
    heartbeatInterval: 30000,
    maxDuration: 35000
});

// Create a single handler instance
const handler = createLogHandler({
    cors: true,
    processLogs: async (logs: LogType[]) => {
        console.log('[Jitterbug Route] Received logs:', logs);
        await transport.write(logs);
    }
}) as LogHandler;

function createSSEStream(clientId: string) {
    let heartbeatInterval: NodeJS.Timeout;
    const encoder = new TextEncoder();

    return new ReadableStream({
        start(controller) {
            // Initialize connection info with a simpler state
            const connectionInfo: ConnectionInfo = {
                controller,
                state: 'connecting' as const,
                lastHeartbeat: Date.now(),
                retryCount: 0,
                heapUsage: getCurrentHeapUsage()
            };
            connections.set(clientId, connectionInfo);

            console.log('[Jitterbug Route] SSE stream started for client:', clientId);

            try {
                // Send initial connection message
                controller.enqueue(encoder.encode(`id: ${sequence++}\ndata: {"type":"connected","clientId":"${clientId}","timestamp":"${new Date().toISOString()}"}\n\n`));

                // Update state immediately after successful initial message
                connectionInfo.state = 'connected';
                connectionInfo.lastHeartbeat = Date.now();

                // Setup heartbeat with simpler error handling
                heartbeatInterval = setInterval(() => {
                    if (!connections.has(clientId)) {
                        clearInterval(heartbeatInterval);
                        return;
                    }

                    try {
                        controller.enqueue(encoder.encode(`id: ${sequence++}\ndata: {"type":"heartbeat","clientId":"${clientId}","timestamp":"${new Date().toISOString()}"}\n\n`));
                        connectionInfo.lastHeartbeat = Date.now();
                        connectionInfo.heapUsage = getCurrentHeapUsage();
                    } catch (e) {
                        console.error('[Jitterbug Route] Heartbeat failed for client:', clientId, e);
                        clearInterval(heartbeatInterval);
                        connections.delete(clientId);
                    }
                }, CONFIG.HEARTBEAT_INTERVAL);

            } catch (e) {
                console.error('[Jitterbug Route] Failed to initialize connection for client:', clientId, e);
                connections.delete(clientId);
            }
        },
        cancel() {
            console.log('[Jitterbug Route] SSE stream cancelled for client:', clientId);
            clearInterval(heartbeatInterval);
            connections.delete(clientId);
        }
    });
}

export async function GET(
    req: NextRequest,
    { params }: { params: { clientId: string } }
) {
    const resolvedParams = await params;
    const clientId = resolvedParams.clientId;
    const accept = req.headers.get('accept') || '';

    if (accept.includes('text/event-stream')) {
        return transport.handleRequest(req);
    }

    return handler.GET(req);
}

export async function POST(
    req: NextRequest,
    { params }: { params: { clientId: string } }
) {
    const resolvedParams = await params;
    const clientId = resolvedParams.clientId;
    return handler.POST(req);
}

export async function HEAD(
    req: NextRequest,
    { params }: { params: { clientId: string } }
) {
    const resolvedParams = await params;
    const clientId = resolvedParams.clientId;
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}

export async function OPTIONS(
    req: NextRequest,
    { params }: { params: { clientId: string } }
) {
    const resolvedParams = await params;
    const clientId = resolvedParams.clientId;
    return new NextResponse(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, HEAD, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Max-Age': '86400',
        },
    });
} 
