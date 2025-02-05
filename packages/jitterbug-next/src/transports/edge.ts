import type { LogEntry, LogTransport } from '@isarmstrong/jitterbug-core-types';

interface EdgeTransportConfig {
    endpoint: string;
    namespace: string;
    environment: string;
    maxRetries?: number;
    retryInterval?: number;
}

export class EdgeTransport implements LogTransport {
    private eventSource: EventSource | null = null;
    private connected = false;
    private retryCount = 0;
    private readonly maxRetries: number;
    private readonly retryInterval: number;

    constructor(private config: EdgeTransportConfig) {
        console.log('[Jitterbug Edge] Initializing transport with config:', {
            endpoint: config.endpoint,
            namespace: config.namespace,
            environment: config.environment
        });

        this.maxRetries = config.maxRetries ?? 3;
        this.retryInterval = config.retryInterval ?? 1000;
    }

    async connect(): Promise<void> {
        console.log('[Jitterbug Edge] Attempting SSE connection...');

        if (this.eventSource) {
            console.log('[Jitterbug Edge] Closing existing connection');
            this.eventSource.close();
            this.eventSource = null;
        }

        return new Promise((resolve, reject) => {
            try {
                this.eventSource = new EventSource(this.config.endpoint, {
                    withCredentials: false
                });

                this.eventSource.onopen = () => {
                    console.log('[Jitterbug Edge] SSE connection established');
                    this.connected = true;
                    this.retryCount = 0;
                    resolve();
                };

                this.eventSource.onerror = async (error) => {
                    console.error('[Jitterbug Edge] SSE connection error:', error);
                    this.connected = false;

                    if (this.retryCount < this.maxRetries) {
                        console.log(`[Jitterbug Edge] Retrying connection (${this.retryCount + 1}/${this.maxRetries})...`);
                        this.retryCount++;
                        await new Promise(r => setTimeout(r, this.retryInterval));
                        this.connect().catch(reject);
                    } else {
                        console.error('[Jitterbug Edge] Max retries reached');
                        reject(new Error('Failed to establish SSE connection after max retries'));
                    }
                };

                this.eventSource.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        console.log('[Jitterbug Edge] Received SSE message:', {
                            id: event.lastEventId,
                            type: data.type
                        });
                    } catch (error) {
                        console.error('[Jitterbug Edge] Error parsing SSE message:', error);
                    }
                };

            } catch (error) {
                console.error('[Jitterbug Edge] Error creating EventSource:', error);
                reject(error);
            }
        });
    }

    async write(log: LogEntry): Promise<void> {
        try {
            console.log('[Jitterbug Edge] Writing log entry:', {
                level: log.level,
                message: log.message,
                hasContext: !!log.context
            });

            const response = await fetch(this.config.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Namespace': this.config.namespace,
                    'X-Environment': this.config.environment
                },
                body: JSON.stringify(log)
            });

            console.log('[Jitterbug Edge] Write response:', {
                status: response.status,
                ok: response.ok
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
        } catch (error) {
            console.error('[Jitterbug Edge] Write failed:', error);
            throw error;
        }
    }

    disconnect(): void {
        console.log('[Jitterbug Edge] Disconnecting transport');
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }
        this.connected = false;
    }
} 