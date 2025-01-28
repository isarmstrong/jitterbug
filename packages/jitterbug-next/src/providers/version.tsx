import React, { createContext, useContext } from 'react';

export interface NextVersionInfo {
    major: number;
    minor: number;
    patch: number;
    runtime: 'browser' | 'edge' | 'nodejs';
    features: {
        sse: boolean;
        webStreams: boolean;
        nodeStreams: boolean;
    };
}

const NextVersionContext = createContext<NextVersionInfo | null>(null);

export function detectNextVersion(): NextVersionInfo {
    try {
        if (typeof window === 'undefined') {
            // Server-side: try to get from process.env or other means
            return {
                major: 15,
                minor: 0,
                patch: 0,
                runtime: 'edge',
                features: {
                    sse: true,
                    webStreams: true,
                    nodeStreams: false
                }
            };
        }

        // Client-side detection
        const nextData = (window as any).__NEXT_DATA__;
        const runtime = 'browser';

        if (!nextData) {
            console.warn('[Jitterbug] Could not detect Next.js version from __NEXT_DATA__');
            return {
                major: 15,
                minor: 0,
                patch: 0,
                runtime,
                features: {
                    sse: true,
                    webStreams: true,
                    nodeStreams: false
                }
            };
        }

        // Next.js 15+ specific features
        if ('useSearchParams' in nextData) {
            return {
                major: 15,
                minor: 0,
                patch: 0,
                runtime,
                features: {
                    sse: true,
                    webStreams: true,
                    nodeStreams: false
                }
            };
        }

        // Next.js 14 specific features
        if ('appRouter' in nextData) {
            return {
                major: 14,
                minor: 0,
                patch: 0,
                runtime,
                features: {
                    sse: true,
                    webStreams: true,
                    nodeStreams: false
                }
            };
        }

        // Next.js 13 or lower
        return {
            major: 13,
            minor: 0,
            patch: 0,
            runtime,
            features: {
                sse: false,
                webStreams: false,
                nodeStreams: true
            }
        };
    } catch (error) {
        console.warn('[Jitterbug] Failed to detect Next.js version:', error);
        return {
            major: 15,
            minor: 0,
            patch: 0,
            runtime: typeof window === 'undefined' ? 'edge' : 'browser',
            features: {
                sse: true,
                webStreams: true,
                nodeStreams: false
            }
        };
    }
}

interface NextVersionProviderProps {
    children: React.ReactNode;
}

export function NextVersionProvider({ children }: NextVersionProviderProps) {
    const version = detectNextVersion();
    return (
        <NextVersionContext.Provider value={version}>
            {children}
        </NextVersionContext.Provider>
    );
}

export function useNextVersion() {
    const version = useContext(NextVersionContext);
    if (!version) {
        throw new Error('[Jitterbug] useNextVersion must be used within a NextVersionProvider');
    }
    return version;
} 