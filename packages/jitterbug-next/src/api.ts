import type { NextRequest } from 'next/server';
import type { SSETransportConfig } from './api/transport.js';
import { createSSETransport } from './transports/sse/factory.js';

export function createHandler(config?: SSETransportConfig) {
    return async function handler(request: NextRequest) {
        const transport = createSSETransport({
            endpoint: '/api/debug/logs',
            ...config
        });

        return transport.connect(request);
    };
} 