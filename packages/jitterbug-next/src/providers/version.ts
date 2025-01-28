import React, { createContext, useContext, type ReactNode } from 'react';

export interface NextVersionInfo {
    major: number;
    minor: number;
    patch: number;
    raw: string;
    runtime?: string;
    features?: {
        sse: boolean;
        webStreams: boolean;
        nodeStreams: boolean;
    };
}

interface NextVersionContextValue {
    version: NextVersionInfo;
}

const NextVersionContext = createContext<NextVersionContextValue | null>(null);

export function detectNextVersion(): NextVersionInfo {
    // Try to get version from Next.js data
    const nextData = (globalThis as any)?.__NEXT_DATA__;
    if (nextData?.version) {
        const [major = 0, minor = 0, patch = 0] = nextData.version.split('.').map(Number);
        console.log('[Jitterbug Version] Detected Next.js version from __NEXT_DATA__:', nextData.version);
        return { major, minor, patch, raw: nextData.version };
    }

    // Fallback to checking React version for hints
    const reactVersion = (globalThis as any)?.React?.version;
    if (reactVersion) {
        console.log('[Jitterbug Version] Found React version:', reactVersion);
        // Next.js version hints based on React version
        if (reactVersion.startsWith('18.2')) {
            console.log('[Jitterbug Version] Inferring Next.js 15 from React 18.2');
            return { major: 15, minor: 0, patch: 0, raw: '15.0.0' };
        }
        if (reactVersion.startsWith('18.0')) {
            console.log('[Jitterbug Version] Inferring Next.js 14 from React 18.0');
            return { major: 14, minor: 0, patch: 0, raw: '14.0.0' };
        }
        if (reactVersion.startsWith('17.')) {
            console.log('[Jitterbug Version] Inferring Next.js 13 from React 17');
            return { major: 13, minor: 0, patch: 0, raw: '13.0.0' };
        }
    }

    // Default to latest supported version
    console.warn('[Jitterbug Version] Could not detect Next.js version, defaulting to 15.0.0');
    return { major: 15, minor: 0, patch: 0, raw: '15.0.0' };
}

interface NextVersionProviderProps {
    children: ReactNode;
}

export function NextVersionProvider({ children }: NextVersionProviderProps): React.ReactElement {
    const version = detectNextVersion();
    return React.createElement(
        NextVersionContext.Provider,
        { value: { version } },
        children
    );
}

export function useNextVersion(): NextVersionInfo {
    const context = useContext(NextVersionContext);
    if (!context) {
        throw new Error('useNextVersion must be used within a NextVersionProvider');
    }
    return context.version;
} 