import React, { createContext, useContext, type ReactNode } from 'react';
import type { NEXT_DATA } from 'next/dist/shared/lib/utils';

// Branded types for semantic versioning
type Brand<T, B> = T & { readonly __brand: B };
type SemVerPart = Brand<number, 'semver'>;
type VersionString = Brand<string, 'version'>;

// Feature flags with explicit meaning
type RuntimeFeature = 'sse' | 'webStreams' | 'nodeStreams';
type FeatureSet = Readonly<Record<RuntimeFeature, boolean>>;

// Runtime identification with type safety
type RuntimeType = 'edge' | 'node' | 'browser';
type RuntimeInfo = Readonly<{
    type: RuntimeType;
    version: VersionString;
}>;

export interface NextVersionInfo {
    readonly major: SemVerPart;
    readonly minor: SemVerPart;
    readonly patch: SemVerPart;
    readonly raw: VersionString;
    readonly runtime?: RuntimeInfo;
    readonly features?: FeatureSet;
}

// Version transition tracking
interface VersionTransition {
    readonly from: Readonly<NextVersionInfo>;
    readonly to: Readonly<NextVersionInfo>;
    readonly timestamp: number;
}

// Version detection context
interface VersionDetectionContext {
    readonly environment: Readonly<{
        next?: VersionString;
        react?: VersionString;
        node?: VersionString;
    }>;
    readonly signals: ReadonlyArray<VersionSignal>;
    readonly transitions: ReadonlyArray<VersionTransition>;
}

// Version detection signals
type VersionSignal =
    | { type: 'buildId'; value: string }
    | { type: 'reactVersion'; value: string }
    | { type: 'runtime'; value: RuntimeType };

interface NextVersionContextValue {
    readonly version: NextVersionInfo;
    readonly context: VersionDetectionContext;
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

// Type guard for version strings
function isVersionString(value: string): value is VersionString {
    return /^\d+\.\d+\.\d+(?:-.*)?$/.test(value);
}

// Safe version part conversion
function toSemVerPart(value: number): SemVerPart {
    if (value < 0 || !Number.isInteger(value)) {
        throw new Error(`Invalid semver part: ${value}`);
    }
    return value as SemVerPart;
}

// Safe version string conversion
function toVersionString(value: string): VersionString {
    if (!isVersionString(value)) {
        throw new Error(`Invalid version string: ${value}`);
    }
    return value as VersionString;
}

export function detectNextVersion(): NextVersionInfo {
    const signals: VersionSignal[] = [];
    let detectedVersion: NextVersionInfo;

    // Try to get version from Next.js data
    try {
        const nextData = window.__NEXT_DATA__;
        if (nextData?.buildId) {
            console.log('[Jitterbug Version] Found Next.js build ID:', nextData.buildId);
            signals.push({ type: 'buildId', value: nextData.buildId });
            // Default to Next 15 if we find Next.js data
            detectedVersion = {
                major: toSemVerPart(15),
                minor: toSemVerPart(0),
                patch: toSemVerPart(0),
                raw: toVersionString('15.0.0')
            };
            return detectedVersion;
        }
    } catch {
        // Ignore errors accessing __NEXT_DATA__
    }

    // Fallback to checking React version for hints
    const reactVersion = window?.React?.version;
    if (reactVersion) {
        console.log('[Jitterbug Version] Found React version:', reactVersion);
        signals.push({ type: 'reactVersion', value: reactVersion });

        // Next.js version hints based on React version
        if (reactVersion.startsWith('18.2')) {
            console.log('[Jitterbug Version] Inferring Next.js 15 from React 18.2');
            detectedVersion = {
                major: toSemVerPart(15),
                minor: toSemVerPart(0),
                patch: toSemVerPart(0),
                raw: toVersionString('15.0.0')
            };
            return detectedVersion;
        }
        if (reactVersion.startsWith('18.0')) {
            console.log('[Jitterbug Version] Inferring Next.js 14 from React 18.0');
            detectedVersion = {
                major: toSemVerPart(14),
                minor: toSemVerPart(0),
                patch: toSemVerPart(0),
                raw: toVersionString('14.0.0')
            };
            return detectedVersion;
        }
        if (reactVersion.startsWith('17.')) {
            console.log('[Jitterbug Version] Inferring Next.js 13 from React 17');
            detectedVersion = {
                major: toSemVerPart(13),
                minor: toSemVerPart(0),
                patch: toSemVerPart(0),
                raw: toVersionString('13.0.0')
            };
            return detectedVersion;
        }
    }

    // Default to latest supported version
    console.warn('[Jitterbug Version] Could not detect Next.js version, defaulting to 15.0.0');
    detectedVersion = {
        major: toSemVerPart(15),
        minor: toSemVerPart(0),
        patch: toSemVerPart(0),
        raw: toVersionString('15.0.0')
    };
    return detectedVersion;
}

interface NextVersionProviderProps {
    children: ReactNode;
}

export function NextVersionProvider({ children }: NextVersionProviderProps): React.ReactElement {
    const version = detectNextVersion();
    const context: VersionDetectionContext = {
        environment: {},
        signals: [],
        transitions: []
    };

    return React.createElement(
        NextVersionContext.Provider,
        { value: { version, context } },
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