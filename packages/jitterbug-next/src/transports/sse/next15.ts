import { BaseSSETransport } from './base';
import type { SSETransportConfig, LogType } from '../../types';

export class Next15SSETransport extends BaseSSETransport {
    private encoder = new TextEncoder();
    private sequence = 0;
    private activeStreams = new Map<string, ReadableStreamDefaultController>();

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
                        if (!this.isConnected) {
                            clearInterval(heartbeatInterval);
                            return;
                        }

                        this.enqueueMessage(controller, {
                            type: 'heartbeat',
                            timestamp: new Date().toISOString()
                        });
                    }, this.config.heartbeatInterval);

                    // Setup max duration timeout
                    if (this.config.maxDuration) {
                        setTimeout(() => {
                            if (this.config.autoReconnect) {
                                this.enqueueMessage(controller, {
                                    type: 'info',
                                    message: 'Stream duration limit reached, reconnecting...',
                                    timestamp: new Date().toISOString()
                                });
                            }
                            controller.close();
                        }, this.config.maxDuration);
                    }

                    // Cleanup on abort
                    this.config.signal?.addEventListener('abort', () => {
                        clearInterval(heartbeatInterval);
                        this.disconnect();
                    });

                } catch (error) {
                    console.error('[Next15SSE] Stream initialization failed:', error);
                    controller.close();
                }
            },
            cancel: () => {
                this.disconnect();
            }
        });
    }

    private enqueueMessage(controller: ReadableStreamDefaultController, data: any) {
        try {
            const message = `id: ${this.sequence++}\ndata: ${JSON.stringify(data)}\n\n`;
            controller.enqueue(this.encoder.encode(message));
        } catch (error) {
            console.error('[Next15SSE] Failed to enqueue message:', error);
            controller.close();
        }
    }

    public async write(log: LogType): Promise<void> {
        this.activeStreams.forEach((controller) => {
            this.enqueueMessage(controller, log);
        });
    }

    public async connect(): Promise<void> {
        this.isConnected = true;
    }

    public async disconnect(): Promise<void> {
        this.isConnected = false;
        this.activeStreams.forEach((controller) => {
            try {
                controller.close();
            } catch (error) {
                console.error('[Next15SSE] Error closing stream:', error);
            }
        });
        this.activeStreams.clear();
    }
} 