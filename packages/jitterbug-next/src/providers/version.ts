import React, { createContext, useContext, type ReactNode } from 'react';
import type { NEXT_DATA } from 'next/dist/shared/lib/utils';

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

declare global {
    interface Window {
        React?: {
            version: string;
        };
    }
}

// Augment the global scope
declare global {
    const __NEXT_DATA__: NEXT_DATA;
}

export function detectNextVersion(): NextVersionInfo {
    // Try to get version from Next.js data
    try {
        const nextData = window.__NEXT_DATA__;
        if (nextData?.buildId) {  // Next.js doesn't expose version directly, use buildId as fallback
            console.log('[Jitterbug Version] Found Next.js build ID:', nextData.buildId);
            // Default to Next 15 if we find Next.js data
            return { major: 15, minor: 0, patch: 0, raw: '15.0.0' };
        }
    } catch {
        // Ignore errors accessing __NEXT_DATA__
    }

    // Fallback to checking React version for hints
    const reactVersion = window?.React?.version;
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