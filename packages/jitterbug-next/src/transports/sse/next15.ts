import type { ValidationResult } from '@isarmstrong/jitterbug';
import type { LogType, SSETransportConfig } from '../../types';
import { BaseSSETransport } from './base';

interface SSEMessage {
    type: 'log' | 'heartbeat' | 'info';
    message?: string;
    level?: string;
    timestamp: string;
    context?: Record<string, unknown>;
}

export class Next15SSETransport extends BaseSSETransport {
    private encoder = new TextEncoder();
    private sequence = 0;
    private activeStreams = new Map<string, ReadableStreamDefaultController>();

    constructor(config: SSETransportConfig) {
        super(config);
    }

    public async handleRequest(req: Request): Promise<Response> {
        const validation = this.validateRequest(req);
        if (!validation.isValid) {
            return this.createErrorResponse(415, validation.errors?.[0] || 'Unsupported Media Type');
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
                    const initialMessage: SSEMessage = {
                        type: 'info',
                        message: 'Connected to SSE stream',
                        level: 'info',
                        timestamp: new Date().toISOString(),
                        context: {
                            clientId,
                            transport: 'Next15SSE'
                        }
                    };

                    await this.write(initialMessage);

                    // Setup heartbeat
                    const heartbeatInterval = setInterval(() => {
                        if (!this.isConnected) {
                            clearInterval(heartbeatInterval);
                            return;
                        }

                        const heartbeat: SSEMessage = {
                            type: 'heartbeat',
                            timestamp: new Date().toISOString()
                        };

                        this.enqueueMessage(controller, heartbeat);
                    }, this.config.heartbeatInterval);

                    // Setup max duration timeout
                    if (this.config.maxDuration) {
                        setTimeout(() => {
                            if (this.config.autoReconnect) {
                                const reconnectMessage: SSEMessage = {
                                    type: 'info',
                                    message: 'Stream duration limit reached, reconnecting...',
                                    timestamp: new Date().toISOString()
                                };
                                this.enqueueMessage(controller, reconnectMessage);
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

    private enqueueMessage(controller: ReadableStreamDefaultController, data: SSEMessage): void {
        try {
            const message = `id: ${this.sequence++}\ndata: ${JSON.stringify(data)}\n\n`;
            controller.enqueue(this.encoder.encode(message));
        } catch (error) {
            console.error('[Next15SSE] Failed to enqueue message:', error);
            controller.close();
        }
    }

    public async write(log: LogType | SSEMessage): Promise<void> {
        this.activeStreams.forEach((controller) => {
            this.enqueueMessage(controller, {
                type: 'log',
                ...log,
                timestamp: log.timestamp || new Date().toISOString()
            });
        });
    }

    public async connect(): Promise<ValidationResult> {
        this.isConnected = true;
        return { isValid: true };
    }

    public async disconnect(): Promise<ValidationResult> {
        this.isConnected = false;
        this.activeStreams.forEach((controller) => {
            try {
                controller.close();
            } catch (error) {
                console.error('[Next15SSE] Error closing stream:', error);
            }
        });
        this.activeStreams.clear();
        return { isValid: true };
    }
} 