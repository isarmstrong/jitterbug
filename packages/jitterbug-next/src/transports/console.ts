import type { BaseEntry, LogTransport } from '@isarmstrong/jitterbug-core-types';

export interface ConsoleTransportConfig {
    colors?: boolean;
    namespace: string;
    environment: string;
}

export class ConsoleTransport implements LogTransport {
    constructor(private config: ConsoleTransportConfig) {
        console.log('[Jitterbug Console] Initializing transport with config:', {
            colors: config.colors ?? true,
            namespace: config.namespace,
            environment: config.environment
        });
    }

    private getColor(level: string): string {
        if (!this.config.colors) return '';

        switch (level) {
            case 'error': return '\x1b[31m'; // Red
            case 'warn': return '\x1b[33m';  // Yellow
            case 'info': return '\x1b[36m';  // Cyan
            case 'debug': return '\x1b[90m'; // Gray
            default: return '';
        }
    }

    async write<T extends Record<string, unknown>>(entry: BaseEntry<T>): Promise<void> {
        const color = this.getColor(entry.level);
        const reset = this.config.colors ? '\x1b[0m' : '';

        const timestamp = new Date().toISOString();
        const prefix = `[${timestamp}] [${entry.level.toUpperCase()}] [${this.config.namespace}:${this.config.environment}]`;

        console.log(
            `${color}${prefix}: ${entry.message}${reset}`,
            entry.context ? '\nContext:' : '',
            entry.context || ''
        );
    }

    async connect(): Promise<void> {
        // Console transport doesn't need a connection
        return Promise.resolve();
    }

    disconnect(): void {
        // Console transport doesn't need disconnection
    }
} 