import { BaseSSETransport } from './base';
import type { SSETransportConfig, LogType } from '../../types';

export class Next15SSETransport extends BaseSSETransport {
    private writers: Map<string, WritableStreamDefaultWriter> = new Map();

    constructor(config: SSETransportConfig) {
        super(config);
    }

    private isValidPath(path: string): boolean {
        // Remove unnecessary escapes while maintaining the pattern
        return /^\/api\/.*(?:\?.*)?$/.test(path);
    }

    async connect(): Promise<void> {
        this.isConnected = true;
    }

    async disconnect(): Promise<void> {
        for (const writer of this.writers.values()) {
            try {
                await writer.close();
            } catch (error) {
                console.error('Error closing writer:', error);
            }
        }
        this.writers.clear();
        this.isConnected = false;
    }

    async handleRequest(req: Request): Promise<Response> {
        if (!this.validateRequest(req)) {
            return this.createErrorResponse(400, 'Invalid request');
        }

        const url = new URL(req.url);
        if (!this.isValidPath(url.pathname)) {
            return this.createErrorResponse(400, 'Invalid path');
        }

        // These values are guaranteed to be defined by the base class constructor
        const config = this.getConfig();
        const retryInterval = config.retryInterval!;
        const heartbeatInterval = config.heartbeatInterval!;
        const maxDuration = config.maxDuration!;
        const autoReconnect = config.autoReconnect ?? true;

        // Next.js 15 specific headers
        const headers = new Headers(this.getSSEHeaders());
        headers.set('X-Accel-Buffering', 'no');
        headers.set('Retry-After', retryInterval.toString());

        const stream = new TransformStream();
        const writer = stream.writable.getWriter();
        const encoder = new TextEncoder();

        // Store the writer for later use
        const clientId = url.searchParams.get('id') || 'default';
        this.writers.set(clientId, writer);

        try {
            await this.connect();
            // Send initial connection success with retry info
            await writer.write(encoder.encode(`retry: ${retryInterval}\nevent: connected\ndata: true\n\n`));

            // Setup heartbeat interval
            const heartbeat = setInterval(async () => {
                try {
                    await writer.write(encoder.encode(`event: heartbeat\ndata: ${Date.now()}\n\n`));
                } catch (error) {
                    console.error(`Heartbeat failed for client ${clientId}:`, error);
                    clearInterval(heartbeat);
                    this.writers.delete(clientId);
                    if (this.writers.size === 0) {
                        this.disconnect();
                    }
                }
            }, heartbeatInterval);

            // Setup max duration if configured
            if (maxDuration) {
                setTimeout(() => {
                    clearInterval(heartbeat);
                    if (autoReconnect) {
                        writer.write(encoder.encode(`event: info\ndata: {"message": "Max duration reached, reconnecting..."}\n\n`))
                            .catch(console.error);
                    }
                    this.writers.delete(clientId);
                    if (this.writers.size === 0) {
                        this.disconnect();
                    }
                }, maxDuration);
            }

            return new Response(stream.readable, {
                headers,
                status: 200
            });
        } catch (error) {
            console.error('SSE setup error:', error);
            await this.disconnect();
            return this.createErrorResponse(500, 'Internal Server Error');
        }
    }

    async write(data: LogType): Promise<void> {
        if (!this.isConnected) {
            throw new Error('Transport not connected');
        }

        const message = `event: message\ndata: ${JSON.stringify(data)}\n\n`;
        const encoder = new TextEncoder();

        for (const [clientId, writer] of this.writers.entries()) {
            try {
                await writer.write(encoder.encode(message));
            } catch (error) {
                console.error(`SSE write error for client ${clientId}:`, error);
                // Remove failed writer
                this.writers.delete(clientId);
            }
        }

        if (this.writers.size === 0) {
            await this.disconnect();
        }
    }
} 