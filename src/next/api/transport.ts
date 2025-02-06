import type { NextApiRequest, NextApiResponse } from 'next';
import type { NextRequest } from 'next/server';
import type { LogEntry } from '../../types/core';
import type { LogType } from '../../types/logs';
import type { TransportConfig } from '../../types/transports';

export interface SSETransportConfig {
    getInitialLogs?: (clientId: string) => Promise<LogType[]>;
    validateClientId?: (clientId: string) => Promise<boolean>;
}

export function createSSETransport(config: SSETransportConfig): (req: NextRequest) => Promise<Response> {
    return async function handler(req: NextRequest): Promise<Response> {
        const clientId = req.headers.get('x-client-id') || 'anonymous';

        if (config.validateClientId) {
            const isValid = await config.validateClientId(clientId);
            if (!isValid) {
                return new Response('Invalid client ID', { status: 403 });
            }
        }

        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller): Promise<void> {
                if (config.getInitialLogs) {
                    const initialLogs = await config.getInitialLogs(clientId);
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(initialLogs)}\n\n`));
                }

                // Keep connection alive
                const keepAlive = setInterval(() => {
                    controller.enqueue(encoder.encode(': keepalive\n\n'));
                }, 30000);

                // Cleanup on close
                req.signal.addEventListener('abort', () => {
                    clearInterval(keepAlive);
                });
            }
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive'
            }
        });
    };
}

/**
 * Handles transport configuration updates
 */
export async function configureTransport(
    _config: TransportConfig,
    _req: NextApiRequest,
    _res: NextApiResponse
): Promise<void> {
    return Promise.resolve();
}

/**
 * Processes log entries through the transport
 */
export async function processLogEntry(
    _entry: LogEntry,
    _config: TransportConfig
): Promise<void> {
    return Promise.resolve();
}

/**
 * Validates transport configuration
 */
export function validateConfig(config: TransportConfig): boolean {
    return Boolean(config);
}

export const runtime = 'edge'; 