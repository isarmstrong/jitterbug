import type { EdgeTransportConfig, LogType } from '../types';

export class EdgeTransport {
    private config: EdgeTransportConfig;
    private retryCount = 0;
    private readonly maxRetries: number;
    private readonly retryInterval: number;

    constructor(config: EdgeTransportConfig) {
        console.log('[Jitterbug Edge] Initializing transport with config:', {
            endpoint: config.endpoint,
            maxRetries: config.maxRetries,
            retryInterval: config.retryInterval
        });

        this.config = config;
        this.maxRetries = config.maxRetries ?? 3;
        this.retryInterval = config.retryInterval ?? 1000;
    }

    async write(data: LogType): Promise<void> {
        try {
            await this.sendToEndpoint(data);
            this.retryCount = 0;
        } catch (error) {
            if (this.retryCount < this.maxRetries) {
                this.retryCount++;
                await new Promise(resolve => setTimeout(resolve, this.retryInterval));
                await this.write(data);
            } else {
                console.error('[Jitterbug Edge] Failed to send data after retries:', error);
                throw error;
            }
        }
    }

    private async sendToEndpoint(data: LogType): Promise<void> {
        const response = await fetch(this.config.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error(`Failed to send data: ${response.status} ${response.statusText}`);
        }
    }
} 