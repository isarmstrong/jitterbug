import { Next13SSETransport } from './next13';
import { Next14SSETransport } from './next14';
import { Next15SSETransport } from './next15';
import type { SSETransportConfig } from '../../types';

type NextVersion = '13' | '14' | '15';

interface SSETransportOptions extends SSETransportConfig {
    forceVersion?: NextVersion;
}

async function detectNextVersion(): Promise<NextVersion> {
    try {
        // Try to detect from next/package.json if available
        const nextPkg = await import('next/package.json');
        const version = nextPkg.version.split('.')[0];
        if (['13', '14', '15'].includes(version)) {
            return version as NextVersion;
        }
    } catch {
        // Fallback detection logic
        if (typeof window !== 'undefined') {
            // Client-side detection based on features
            if ((window as any).__NEXT_DATA__?.buildId) {
                return '15'; // Next 15 always includes buildId
            }
        } else {
            // Server-side detection based on available APIs
            try {
                await import('next/headers');
                return '15'; // headers export was changed in Next 15
            } catch {
                // Fallback to Next 14 as it's most common
                return '14';
            }
        }
    }
    return '14'; // Default to 14 if detection fails
}

function createTransport(version: NextVersion, config: SSETransportConfig) {
    switch (version) {
        case '15':
            return new Next15SSETransport(config);
        case '14':
            return new Next14SSETransport(config);
        case '13':
            return new Next13SSETransport(config);
        default:
            throw new Error(`Unsupported Next.js version: ${version}`);
    }
}

/**
 * Creates a unified SSE interface that works across Next.js versions
 */
export async function createSSETransport(options: SSETransportOptions) {
    const version = options.forceVersion || await detectNextVersion();
    const transport = createTransport(version, options);

    return {
        async handleRequest(req: Request): Promise<Response> {
            return transport.handleRequest(req);
        },

        async write(data: any): Promise<void> {
            return transport.write(data);
        },

        async cleanup(): Promise<void> {
            return transport.disconnect();
        }
    };
} 