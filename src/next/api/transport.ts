import { NextRequest } from 'next/server';
import type { LogType } from '../../types/logs';

export interface SSETransportConfig {
    getInitialLogs?: (clientId: string) => Promise<LogType[]>;
    validateClientId?: (clientId: string) => Promise<boolean>;
}

export function createSSETransport(config: SSETransportConfig) {
    return async function handler(req: NextRequest) {
        const clientId = req.nextUrl.searchParams.get('clientId');

        if (!clientId) {
            return new Response('Client ID required', { status: 400 });
        }

        if (config.validateClientId) {
            const isValid = await config.validateClientId(clientId);
            if (!isValid) {
                return new Response('Invalid client ID', { status: 403 });
            }
        }

        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
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
                    controller.close();
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