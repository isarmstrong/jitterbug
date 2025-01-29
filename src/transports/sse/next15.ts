import { BaseTransport } from '../types';
import type { TransportConfig } from '../types';
import type { LogEntry } from '../../types/core';
import { LogLevels } from '../../types/enums';

interface SSEConfig extends TransportConfig {
    endpoint: string;
    heartbeatInterval?: number;
    retryInterval?: number;
    maxDuration?: number;
    autoReconnect?: boolean;
}

export class Next15SSETransport extends BaseTransport {
    private writers: Map<string, WritableStreamDefaultWriter> = new Map();
    private isConnected: boolean = false;
    public readonly config: Required<SSEConfig>;

    constructor(config: SSEConfig) {
        super(config);
        this.config = {
            ...config,
            enabled: config.enabled ?? true,
            level: config.level ?? LogLevels.INFO,
            format: config.format ?? 'json',
            endpoint: config.endpoint,
            heartbeatInterval: config.heartbeatInterval ?? 30000,
            retryInterval: config.retryInterval ?? 1000,
            maxDuration: config.maxDuration ?? 25000,
            autoReconnect: config.autoReconnect ?? true
        } as Required<SSEConfig>;
    }

    private isValidPath(path: string): boolean {
        return /^\/api\/.*(?:\?.*)?$/.test(path);
    }

    async connect(): Promise<void> {
        await Promise.resolve();
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
            return new Response('Invalid request', { status: 400 });
        }

        const url = new URL(req.url);
        if (!this.isValidPath(url.pathname)) {
            return new Response('Invalid path', { status: 400 });
        }

        const config = this.config;
        const retryInterval = config.retryInterval;
        const heartbeatInterval = config.heartbeatInterval;
        const maxDuration = config.maxDuration;
        const autoReconnect = config.autoReconnect;

        // Next.js 15 specific headers
        const headers = new Headers({
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no'
        });

        const stream = new TransformStream();
        const writer = stream.writable.getWriter();
        const encoder = new TextEncoder();

        // Store the writer for later use with explicit null check
        const rawClientId = url.searchParams.get('id');
        const clientId = rawClientId !== null && rawClientId.length > 0 ? rawClientId : 'default';
        this.writers.set(clientId, writer);

        try {
            await this.connect();
            // Send initial connection success with retry info
            await writer.write(encoder.encode(`retry: ${retryInterval}\nevent: connected\ndata: true\n\n`));

            // Setup heartbeat interval
            const heartbeat = setInterval((): void => {
                void (async (): Promise<void> => {
                    try {
                        await writer.write(encoder.encode(`event: heartbeat\ndata: ${Date.now()}\n\n`));
                    } catch (error) {
                        console.error(`Heartbeat failed for client ${clientId}:`, error);
                        clearInterval(heartbeat);
                        this.writers.delete(clientId);
                        if (this.writers.size === 0) {
                            void this.disconnect();
                        }
                    }
                })();
            }, heartbeatInterval);

            // Setup max duration if configured
            if (maxDuration) {
                setTimeout(() => {
                    clearInterval(heartbeat);
                    if (autoReconnect) {
                        void (async (): Promise<void> => {
                            try {
                                await writer.write(encoder.encode(`event: info\ndata: {"message": "Max duration reached, reconnecting..."}\n\n`));
                            } catch (error) {
                                console.error('Error sending reconnect message:', error);
                            }
                        })();
                    }
                    this.writers.delete(clientId);
                    if (this.writers.size === 0) {
                        void this.disconnect();
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
            return new Response('Internal Server Error', { status: 500 });
        }
    }

    async write<T extends Record<string, unknown>>(entry: LogEntry<T>): Promise<void> {
        if (!this.isConnected) {
            throw new Error('Transport not connected');
        }

        const message = `event: message\ndata: ${JSON.stringify(entry)}\n\n`;
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

    protected validateRequest(req: Request): boolean {
        const accept = req.headers.get('accept');
        return accept !== null && accept.length > 0 && accept.includes('text/event-stream');
    }

    public close(): void {
        this.disconnect().catch(console.error);
    }
}

