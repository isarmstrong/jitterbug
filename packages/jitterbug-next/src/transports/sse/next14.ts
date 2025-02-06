import type { ValidationResult } from '@isarmstrong/jitterbug-core-types';
import type { LogType, SSETransportConfig } from '../../types';
import { BaseSSETransport } from './base';

export class Next14SSETransport extends BaseSSETransport {
    private encoder = new TextEncoder();
    private sequence = 0;
    private activeControllers = new Map<string, AbortController>();

    constructor(config: SSETransportConfig) {
        super(config);
    }

    public async handleRequest(req: Request): Promise<Response> {
        if (!this.validateRequest(req)) {
            return this.createErrorResponse(415, 'Unsupported Media Type');
        }

        const clientId = this.getClientId(req);
        const stream = await this.createStream(clientId);

        return new Response(stream, {
            headers: this.getSSEHeaders()
        });
    }

    private getClientId(req: Request): string {
        const matches = req.url.match(/\/logs\/([^/?]+)/);
        return matches?.[1] || `client-${Date.now()}`;
    }

    protected async createStream(clientId: string): Promise<ReadableStream> {
        // Next.js 14 uses TransformStream for better performance
        const { readable, writable } = new TransformStream();
        const writer = writable.getWriter();
        const controller = new AbortController();
        this.activeControllers.set(clientId, controller);

        // Handle stream initialization
        (async () => {
            try {
                this.isConnected = true;

                // Send initial connection message
                await this.write({
                    message: 'Connected to SSE stream',
                    level: 'INFO',
                    timestamp: new Date().toISOString(),
                    context: {
                        clientId,
                        transport: 'Next14SSE'
                    }
                });

                // Setup heartbeat
                const heartbeatInterval = setInterval(async () => {
                    if (!this.isConnected) {
                        clearInterval(heartbeatInterval);
                        return;
                    }

                    try {
                        const message = `id: ${this.sequence++}\ndata: ${JSON.stringify({
                            type: 'heartbeat',
                            timestamp: new Date().toISOString()
                        })}\n\n`;
                        await writer.write(this.encoder.encode(message));
                    } catch (error) {
                        console.error('[Next14SSE] Heartbeat failed:', error);
                        clearInterval(heartbeatInterval);
                        await this.disconnect();
                    }
                }, this.config.heartbeatInterval);

                // Setup max duration timeout
                if (this.config.maxDuration) {
                    setTimeout(async () => {
                        if (this.config.autoReconnect) {
                            const message = `id: ${this.sequence++}\ndata: ${JSON.stringify({
                                type: 'info',
                                message: 'Stream duration limit reached, reconnecting...',
                                timestamp: new Date().toISOString()
                            })}\n\n`;
                            await writer.write(this.encoder.encode(message));
                        }
                        await this.disconnect();
                    }, this.config.maxDuration);
                }

                // Cleanup on abort
                controller.signal.addEventListener('abort', () => {
                    clearInterval(heartbeatInterval);
                    this.disconnect();
                });

            } catch (error) {
                console.error('[Next14SSE] Stream initialization failed:', error);
                await this.disconnect();
            }
        })();

        return readable;
    }

    public async write(log: LogType): Promise<void> {
        if (!this.isConnected) return;

        const message = `id: ${this.sequence++}\ndata: ${JSON.stringify(log)}\n\n`;
        const encoded = this.encoder.encode(message);

        // Write to all active streams
        const writePromises = Array.from(this.activeControllers.entries()).map(async ([clientId]) => {
            try {
                const { writable } = new TransformStream();
                const writer = writable.getWriter();
                await writer.write(encoded);
            } catch (error) {
                console.error(`[Next14SSE] Failed to write to client ${clientId}:`, error);
                await this.disconnect();
            }
        });

        await Promise.all(writePromises);
    }

    public async connect(): Promise<ValidationResult> {
        this.isConnected = true;
        return { isValid: true };
    }

    public async disconnect(): Promise<ValidationResult> {
        this.isConnected = false;

        // Abort all active controllers
        this.activeControllers.forEach((controller, clientId) => {
            try {
                controller.abort();
            } catch (error) {
                console.error(`[Next14SSE] Error disconnecting client ${clientId}:`, error);
            }
        });

        this.activeControllers.clear();

        return { isValid: true };
    }
} 