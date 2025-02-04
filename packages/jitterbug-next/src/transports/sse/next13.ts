import type { ValidationResult } from '@isarmstrong/jitterbug';
import type { LogType, SSETransportConfig } from '../../types';
import { BaseSSETransport } from './base';

export class Next13SSETransport extends BaseSSETransport {
    private encoder = new TextEncoder();
    private sequence = 0;
    private messageBuffer: Map<string, LogType[]> = new Map();
    private activeClients: Set<string> = new Set();
    private cleanupTimers: Map<string, NodeJS.Timeout> = new Map();

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
        const matches = req.url.match(/\/logs\/([^\/\?]+)/);
        return matches?.[1] || `client-${Date.now()}`;
    }

    protected async createStream(clientId: string): Promise<ReadableStream> {
        // Next.js 13 doesn't support TransformStream well, so we use a basic ReadableStream
        return new ReadableStream({
            start: async (controller) => {
                try {
                    this.activeClients.add(clientId);
                    this.messageBuffer.set(clientId, []);
                    this.isConnected = true;

                    // Send initial connection message
                    await this.write({
                        message: 'Connected to SSE stream',
                        level: 'info',
                        timestamp: new Date().toISOString(),
                        context: {
                            clientId,
                            transport: 'Next13SSE'
                        }
                    });

                    // Setup heartbeat using the message buffer
                    const heartbeatInterval = setInterval(() => {
                        if (!this.isConnected) {
                            clearInterval(heartbeatInterval);
                            return;
                        }

                        const heartbeat = {
                            type: 'heartbeat',
                            timestamp: new Date().toISOString()
                        };

                        const message = `id: ${this.sequence++}\ndata: ${JSON.stringify(heartbeat)}\n\n`;
                        controller.enqueue(this.encoder.encode(message));
                    }, this.config.heartbeatInterval);

                    // Setup cleanup timer
                    const cleanup = setTimeout(async () => {
                        if (this.config.autoReconnect) {
                            const reconnectMessage = {
                                type: 'info',
                                message: 'Stream duration limit reached, reconnecting...',
                                timestamp: new Date().toISOString()
                            };
                            const message = `id: ${this.sequence++}\ndata: ${JSON.stringify(reconnectMessage)}\n\n`;
                            controller.enqueue(this.encoder.encode(message));
                        }
                        await this.removeClient(clientId);
                        controller.close();
                    }, this.config.maxDuration || 25000);

                    this.cleanupTimers.set(clientId, cleanup);

                    // Process buffered messages
                    const processBuffer = setInterval(() => {
                        const messages = this.messageBuffer.get(clientId) || [];
                        while (messages.length > 0) {
                            const log = messages.shift();
                            if (log) {
                                const message = `id: ${this.sequence++}\ndata: ${JSON.stringify(log)}\n\n`;
                                controller.enqueue(this.encoder.encode(message));
                            }
                        }
                    }, 100); // Process buffer every 100ms

                    // Cleanup on close
                    this.config.signal?.addEventListener('abort', async () => {
                        clearInterval(heartbeatInterval);
                        clearInterval(processBuffer);
                        clearTimeout(cleanup);
                        await this.removeClient(clientId);
                        controller.close();
                    });

                } catch (error) {
                    console.error('[Next13SSE] Stream initialization failed:', error);
                    await this.removeClient(clientId);
                    controller.close();
                }
            },
            cancel: async () => {
                await this.removeClient(clientId);
            }
        });
    }

    private async removeClient(clientId: string) {
        this.activeClients.delete(clientId);
        this.messageBuffer.delete(clientId);
        const cleanup = this.cleanupTimers.get(clientId);
        if (cleanup) {
            clearTimeout(cleanup);
            this.cleanupTimers.delete(clientId);
        }

        if (this.activeClients.size === 0) {
            this.isConnected = false;
        }
    }

    public async write(log: LogType): Promise<void> {
        // Add message to all active client buffers
        this.activeClients.forEach(clientId => {
            const buffer = this.messageBuffer.get(clientId) || [];
            buffer.push(log);
            this.messageBuffer.set(clientId, buffer);
        });
    }

    public async connect(): Promise<ValidationResult> {
        this.isConnected = true;
        return { isValid: true };
    }

    public async disconnect(): Promise<ValidationResult> {
        // Cleanup all clients
        const clientIds = Array.from(this.activeClients);
        await Promise.all(clientIds.map(clientId => this.removeClient(clientId)));

        this.messageBuffer.clear();
        this.cleanupTimers.clear();
        this.isConnected = false;
        return { isValid: true };
    }
} 