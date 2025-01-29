import { BaseSSETransport } from './base';
import type { SSETransportConfig, LogType } from '../../types';

export class Next15SSETransport extends BaseSSETransport {
    private encoder = new TextEncoder();
    private sequence = 0;
    private activeStreams = new Map<string, ReadableStreamDefaultController>();
    private heartbeatIntervals = new Map<string, NodeJS.Timeout>();

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
        return new ReadableStream({
            start: async (controller) => {
                try {
                    this.activeStreams.set(clientId, controller);
                    this.isConnected = true;

                    // Send initial connection message
                    await this.write({
                        message: 'Connected to SSE stream',
                        level: 'info',
                        timestamp: new Date().toISOString(),
                        context: {
                            clientId,
                            transport: 'Next15SSE'
                        }
                    });

                    // Setup heartbeat
                    const heartbeatInterval = setInterval(() => {
                        if (!this.isConnected || !this.activeStreams.has(clientId)) {
                            clearInterval(heartbeatInterval);
                            return;
                        }

                        this.enqueueMessage(clientId, {
                            type: 'heartbeat',
                            timestamp: new Date().toISOString()
                        });
                    }, this.config.heartbeatInterval);

                    this.heartbeatIntervals.set(clientId, heartbeatInterval);

                    // Setup max duration timeout
                    if (this.config.maxDuration) {
                        setTimeout(() => {
                            if (this.config.autoReconnect) {
                                this.enqueueMessage(clientId, {
                                    type: 'info',
                                    message: 'Stream duration limit reached, reconnecting...',
                                    timestamp: new Date().toISOString()
                                });
                            }
                            this.removeClient(clientId);
                        }, this.config.maxDuration);
                    }

                } catch (error) {
                    console.error('[Next15SSE] Stream initialization failed:', error);
                    this.removeClient(clientId);
                }
            },
            cancel: () => {
                this.removeClient(clientId);
            }
        });
    }

    private enqueueMessage(clientId: string, data: any) {
        const controller = this.activeStreams.get(clientId);
        if (!controller) return;

        try {
            const message = `id: ${this.sequence++}\ndata: ${JSON.stringify(data)}\n\n`;
            controller.enqueue(this.encoder.encode(message));
        } catch (error) {
            console.error('[Next15SSE] Failed to enqueue message:', error);
            this.removeClient(clientId);
        }
    }

    public async write(log: LogType): Promise<void> {
        for (const [clientId] of this.activeStreams) {
            this.enqueueMessage(clientId, log);
        }
    }

    private removeClient(clientId: string): void {
        const controller = this.activeStreams.get(clientId);
        const heartbeatInterval = this.heartbeatIntervals.get(clientId);

        if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
            this.heartbeatIntervals.delete(clientId);
        }

        if (controller) {
            try {
                controller.close();
            } catch (error) {
                console.error('[Next15SSE] Error closing stream:', error);
            }
            this.activeStreams.delete(clientId);
        }
    }

    public async connect(): Promise<void> {
        this.isConnected = true;
    }

    public async disconnect(): Promise<void> {
        this.isConnected = false;

        // Clear all heartbeat intervals
        this.heartbeatIntervals.forEach((interval) => clearInterval(interval));
        this.heartbeatIntervals.clear();

        // Close all streams
        this.activeStreams.forEach((_, clientId) => {
            this.removeClient(clientId);
        });
    }
} 