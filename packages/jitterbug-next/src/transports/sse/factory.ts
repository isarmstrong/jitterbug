import { env } from 'process';
import type { SSETransport, SSETransportConfig } from '../../api';
import { Next13SSETransport } from './next13';
import { Next14SSETransport } from './next14';
import { Next15SSETransport } from './next15';

interface SSETransportOptions extends SSETransportConfig {
    version?: string;
}

class SSETransportFactory {
    private static instance: SSETransportFactory;
    private constructor() { }

    public static getInstance(): SSETransportFactory {
        if (!SSETransportFactory.instance) {
            SSETransportFactory.instance = new SSETransportFactory();
        }
        return SSETransportFactory.instance;
    }

    public createSSEHandler(options: SSETransportOptions): SSETransport {
        const version = options.version ?? env.NEXT_VERSION ?? '14';

        switch (version) {
            case '13':
                return new Next13SSETransport(options);
            case '15':
                return new Next15SSETransport(options);
            case '14':
            default:
                return new Next14SSETransport(options);
        }
    }
}

export function createSSETransport(options: SSETransportOptions | SSETransportConfig): SSETransport {
    if ('version' in options) {
        return SSETransportFactory.getInstance().createSSEHandler(options);
    }
    // Default to Next 14 if only config is provided
    return new Next14SSETransport(options);
} 