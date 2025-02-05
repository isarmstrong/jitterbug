import type { ValidationResult } from '@isarmstrong/jitterbug-core-types';
import type { SSETransportConfig } from '../../types';
import { Next13SSETransport } from './next13';
import { Next14SSETransport } from './next14';
import { Next15SSETransport } from './next15';

type NextVersion = '13' | '14' | '15';

type ExtendedValidationResult = ValidationResult & { data: NextVersion; isValid: boolean };

interface SSETransportOptions extends SSETransportConfig {
    forceVersion?: NextVersion;
}

interface SSETransport {
    handleRequest(req: Request): Promise<Response>;
    write(data: unknown): Promise<void>;
    disconnect(): Promise<ValidationResult>;
}

export class SSETransportFactory {
    private static instance: SSETransportFactory;
    private transportMap: Map<string, SSETransport> = new Map();

    private constructor() { }

    static getInstance(): SSETransportFactory {
        if (!SSETransportFactory.instance) {
            SSETransportFactory.instance = new SSETransportFactory();
        }
        return SSETransportFactory.instance;
    }

    private detectNextVersion(): ExtendedValidationResult {
        try {
            // Try to detect from next/package.json if available
            const nextPkg = require('next/package.json');
            const version = nextPkg.version.split('.')[0];
            if (['13', '14', '15'].includes(version)) {
                return {
                    isValid: true,
                    data: version // data now holds the version
                };
            }
        } catch {
            // Fallback detection logic
            if (typeof window !== 'undefined' && '__NEXT_DATA__' in window) {
                const nextData = window.__NEXT_DATA__;
                if (nextData?.buildId) {
                    return {
                        isValid: true,
                        data: '15'
                    };
                }
            } else {
                try {
                    require('next/headers');
                    return {
                        isValid: true,
                        data: '15'
                    };
                } catch {
                    return {
                        isValid: true,
                        data: '14'
                    };
                }
            }
        }
        return { isValid: true, data: '14' };
    }

    private createTransport(version: NextVersion, config: SSETransportConfig): SSETransport {
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

    getTransport(options: SSETransportOptions): SSETransport {
        const versionResult = options.forceVersion ?
            { isValid: true, data: options.forceVersion } :
            this.detectNextVersion();

        if (!versionResult.isValid || !versionResult.data) {
            throw new Error('Failed to detect Next.js version');
        }

        const key = `${versionResult.data}-${options.endpoint}`;

        if (!this.transportMap.has(key)) {
            const transport = this.createTransport(versionResult.data, options);
            this.transportMap.set(key, transport);
        }

        const transport = this.transportMap.get(key);
        if (!transport) {
            throw new Error('Failed to create transport');
        }

        return transport;
    }

    createSSEHandler(options: SSETransportOptions): SSETransport {
        return this.getTransport(options);
    }
}

// Export a simplified interface for users
export function createSSETransport(options: SSETransportOptions): SSETransport {
    return SSETransportFactory.getInstance().createSSEHandler(options);
} 