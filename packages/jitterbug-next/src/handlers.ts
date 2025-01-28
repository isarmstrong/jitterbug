import { NextRequest, NextResponse } from 'next/server';
import type { LogType, LogHandlerConfig } from './types';
import { EdgeTransport, type EdgeTransportConfig } from '@isarmstrong/jitterbug/transports/edge';
import { ConsoleTransport, LogLevels, createJitterbug } from '@isarmstrong/jitterbug';
import { detectNextEnvironment, detectNextRuntime, isNext15Plus } from './utils';

// Default configuration that enhances Jitterbug's core defaults for Next.js
const DEFAULT_CONFIG: Required<LogHandlerConfig> = {
    maxEntries: 1000,
    maxPayloadSize: 128 * 1024, // 128KB
    enableSSE: process.env.NODE_ENV === 'development',
    maxSSEDuration: 25000, // 25 seconds
    autoReconnectSSE: true,
    onLog: () => { } // Add default no-op handler
};

/**
 * Creates a handler for processing log requests with SSE support for Next.js
 */
export function createLogHandler(userConfig: LogHandlerConfig = {}) {
    // Merge user config with defaults
    const config: Required<LogHandlerConfig> = {
        ...DEFAULT_CONFIG,
        ...userConfig
    };

    const logs: LogType[] = [];
    const encoder = new TextEncoder();

    // Create a Jitterbug logger instance for internal use
    const logger = createJitterbug({
        namespace: 'jitterbug-next',
        environment: detectNextEnvironment(),
        runtime: detectNextRuntime()
    });

    return async function handleRequest(req: NextRequest): Promise<NextResponse> {
        const isModernNext = isNext15Plus();
        logger.debug('Handling request', { method: req.method, isModernNext });

        // Handle CORS preflight
        if (req.method === 'OPTIONS') {
            return new NextResponse(null, {
                status: 204,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type'
                }
            });
        }

        // Handle SSE request
        if (req.method === 'GET' && config.enableSSE) {
            logger.debug('Setting up SSE connection');

            const stream = new ReadableStream({
                start(controller) {
                    const start = Date.now();
                    let timer: NodeJS.Timeout;

                    // Send initial logs
                    if (logs.length > 0) {
                        controller.enqueue(
                            encoder.encode(`data: ${JSON.stringify(logs)}\n\n`)
                        );
                    }

                    // Set up interval to check for new logs
                    timer = setInterval(() => {
                        const now = Date.now();
                        if (now - start >= config.maxSSEDuration) {
                            if (config.autoReconnectSSE) {
                                controller.enqueue(
                                    encoder.encode('data: {"type": "end"}\n\n')
                                );
                            }
                            clearInterval(timer);
                            controller.close();
                            return;
                        }

                        // Send any new logs
                        if (logs.length > 0) {
                            controller.enqueue(
                                encoder.encode(`data: ${JSON.stringify(logs)}\n\n`)
                            );
                            logs.length = 0;
                        }
                    }, 1000);

                    // Clean up on client disconnect - Next.js 15+ only
                    if (isModernNext && req.signal) {
                        req.signal.addEventListener('abort', () => {
                            logger.debug('Client disconnected, cleaning up SSE');
                            clearInterval(timer);
                            controller.close();
                        });
                    }

                    return () => {
                        logger.debug('Stream ended, cleaning up SSE');
                        clearInterval(timer);
                    };
                }
            });

            return new NextResponse(stream, {
                headers: {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }

        // Handle POST request to add logs
        if (req.method === 'POST') {
            const body = await req.json();
            const newLogs: LogType[] = Array.isArray(body) ? body : [body];

            // Enforce max payload size
            const payloadSize = JSON.stringify(newLogs).length;
            if (payloadSize > config.maxPayloadSize) {
                logger.warn('Payload too large', { size: payloadSize, limit: config.maxPayloadSize });
                return NextResponse.json(
                    { error: 'Payload too large' },
                    { status: 413 }
                );
            }

            // Add new logs and maintain max entries limit using Jitterbug's core functionality
            logs.push(...newLogs.map(log => ({
                ...log,
                timestamp: log.timestamp || new Date().toISOString()
            })));

            if (logs.length > config.maxEntries) {
                logs.splice(0, logs.length - config.maxEntries);
            }

            return NextResponse.json({ success: true }, { status: 204 });
        }

        // Handle unsupported methods
        logger.warn('Method not allowed', { method: req.method });
        return NextResponse.json(
            { error: 'Method not allowed' },
            { status: 405 }
        );
    };
} 