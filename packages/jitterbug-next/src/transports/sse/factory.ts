import type { SSETransportConfig, LogType } from '../../types';
import { Next13SSETransport } from './next13';
import { Next14SSETransport } from './next14';
import { Next15SSETransport } from './next15';

type NextVersion = '13' | '14' | '15';

interface SSETransportOptions extends SSETransportConfig {
    forceVersion?: NextVersion;
}

/**
 * Type guard for Next.js build data
 * Only checks for buildId as it's the most stable feature across versions
 */
function isNextBuildData(data: unknown): data is { buildId: string } {
    return typeof data === 'object' &&
        data !== null &&
        'buildId' in data &&
        typeof (data as { buildId: unknown }).buildId === 'string';
}

/**
 * Safely checks for Next.js build data in the window object
 * Uses type narrowing instead of global augmentation
 */
function getNextBuildData(): { buildId: string } | undefined {
    if (typeof window === 'undefined') return undefined;

    const data = (window as { __NEXT_DATA__?: unknown }).__NEXT_DATA__;
    return isNextBuildData(data) ? data : undefined;
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
        const buildData = getNextBuildData();
        if (buildData?.buildId) {
            return '15'; // Next 15 always includes buildId
        }

        // Server-side detection based on available APIs
        if (typeof window === 'undefined') {
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

        async write(data: LogType): Promise<void> {
            return transport.write(data);
        },

        async cleanup(): Promise<void> {
            return transport.disconnect();
        }
    };
} 