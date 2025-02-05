import type { ValidationResult } from '@isarmstrong/jitterbug-core-types';
import type { LogType } from '@isarmstrong/jitterbug-types';
import type { SSETransportConfig } from '../../api/transport';
import { BaseSSETransport } from './base';

interface SSEMessage {
    type: 'log' | 'heartbeat' | 'info';
    timestamp: string;
    message: string;
    level: string;
    context?: Record<string, unknown>;
}

export class Next15SSETransport extends BaseSSETransport {
    private activeStreams: ReadableStreamDefaultController[] = [];

    constructor(config: SSETransportConfig) {
        super(config);
    }

    public async write(data: LogType): Promise<void> {
        const message: SSEMessage = {
            type: 'log',
            timestamp: new Date().toISOString(),
            message: data.message,
            level: data.level,
            context: data.context as Record<string, unknown>
        };

        this.activeStreams.forEach(controller => {
            controller.enqueue(`data: ${JSON.stringify(message)}\n\n`);
        });
    }

    public async handleRequest(req: Request): Promise<Response> {
        const validation = this.validateRequest(req);
        if (!validation.isValid) {
            return this.createErrorResponse(415, validation.errors?.[0] || 'Invalid request');
        }

        const stream = new ReadableStream({
            start: async (controller) => {
                this.activeStreams.push(controller);
                await this.connect();

                // Send initial connection message
                const message: SSEMessage = {
                    type: 'info',
                    message: 'Connected to SSE stream',
                    level: 'INFO',
                    timestamp: new Date().toISOString()
                };
                controller.enqueue(`data: ${JSON.stringify(message)}\n\n`);

                // Start heartbeat
                setInterval(async () => {
                    const heartbeat: SSEMessage = {
                        type: 'heartbeat',
                        message: 'ping',
                        level: 'DEBUG',
                        timestamp: new Date().toISOString()
                    };
                    controller.enqueue(`data: ${JSON.stringify(heartbeat)}\n\n`);
                }, this.config.heartbeatInterval);
            },
            cancel: async () => {
                await this.disconnect();
            }
        });

        return new Response(stream, {
            headers: this.getSSEHeaders()
        });
    }

    public async connect(): Promise<ValidationResult> {
        this.isConnected = true;
        return { isValid: true };
    }

    public async disconnect(): Promise<ValidationResult> {
        this.activeStreams = [];
        this.isConnected = false;
        return { isValid: true };
    }
} 