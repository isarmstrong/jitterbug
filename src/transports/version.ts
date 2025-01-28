import type { LogEntry, LogTransport } from "../types/core";
import { BaseTransport, type TransportConfig } from "./types";
import * as semver from "semver";

interface EdgeRuntimeGlobal {
    name: string;
    version: string;
}

function isEdgeRuntime(value: unknown): value is EdgeRuntimeGlobal {
    return typeof value === 'object' &&
        value !== null &&
        'version' in value &&
        typeof (value as EdgeRuntimeGlobal).version === 'string';
}

export interface VersionMetrics {
    // Framework Versions
    nextVersion: string | null;
    reactVersion: string | null;
    nodeVersion: string | null;
    edgeRuntimeVersion: string | null;

    // Compatibility Status
    isNextCompatible: boolean;
    isReactCompatible: boolean;
    isNodeCompatible: boolean;
    isEdgeCompatible: boolean;

    // Pattern Usage
    incompatiblePatterns: Map<string, {
        count: number;
        lastSeen: number;
        severity: 'warning' | 'error';
        details: string;
    }>;

    // SSE Patterns
    sseImplementations: Map<string, {
        isValid: boolean;
        issues: string[];
        lastUsed: number;
    }>;

    // React Patterns
    reactPatterns: Map<string, {
        isAsync: boolean;
        usesSuspense: boolean;
        usesServerComponents: boolean;
        lastSeen: number;
        issues: string[];
    }>;
}

export interface VersionData {
    type: 'version';
    version: string;
    dependencies?: Record<string, string>;
    environment?: Record<string, string>;
}

export interface VersionTransportConfig extends TransportConfig {
    maxEntries?: number;
    requiredVersions?: {
        next?: string;
        react?: string;
        node?: string;
    };
    allowedPatterns?: string[];
}

interface VersionEvent {
    type: 'framework' | 'pattern' | 'sse' | 'react';
    framework?: {
        name: string;
        version: string;
        features?: string[];
    };
    pattern?: {
        name: string;
        implementation: string;
        context?: Record<string, unknown>;
    };
    sse?: {
        endpoint: string;
        implementation: string;
        reconnectStrategy?: string;
    };
    react?: {
        component: string;
        patterns: string[];
        async?: boolean;
        suspense?: boolean;
        serverComponent?: boolean;
    };
}

export class VersionTransport extends BaseTransport {
    protected readonly transportConfig: Required<VersionTransportConfig>;
    private entries: Array<LogEntry<Record<string, unknown>>> = [];
    private metrics: VersionMetrics = {
        nextVersion: null,
        reactVersion: null,
        nodeVersion: null,
        edgeRuntimeVersion: null,
        isNextCompatible: false,
        isReactCompatible: false,
        isNodeCompatible: false,
        isEdgeCompatible: false,
        incompatiblePatterns: new Map(),
        sseImplementations: new Map(),
        reactPatterns: new Map()
    };

    constructor(config: VersionTransportConfig = {}) {
        super(config);
        this.transportConfig = {
            enabled: config.enabled ?? true,
            level: config.level ?? this.config.level,
            format: config.format ?? this.config.format,
            maxEntries: config.maxEntries ?? 1000,
            requiredVersions: {
                next: config.requiredVersions?.next ?? '>=13.0.0',
                react: config.requiredVersions?.react ?? '>=18.0.0',
                node: config.requiredVersions?.node ?? '>=16.0.0'
            },
            allowedPatterns: config.allowedPatterns ?? []
        };

        // Initialize with current runtime versions if available
        if (typeof process !== 'undefined') {
            this.metrics.nodeVersion = process.version;
            this.metrics.isNodeCompatible = this.checkVersionCompatibility(
                'node',
                process.version
            );
        }

        if (typeof window !== 'undefined') {
            // Try to detect Next.js and React versions from window
            const next = (window as any).__NEXT_DATA__?.buildId;
            if (next) {
                this.metrics.nextVersion = this.extractNextVersion(next);
                this.metrics.isNextCompatible = this.checkVersionCompatibility(
                    'next',
                    this.metrics.nextVersion
                );
            }

            // React version can be detected from React DevTools global
            const react = (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__?.renderers?.get(1)?.version;
            if (react) {
                this.metrics.reactVersion = react;
                this.metrics.isReactCompatible = this.checkVersionCompatibility(
                    'react',
                    react
                );
            }
        }

        // Edge runtime version
        const edgeRuntime = typeof globalThis !== 'undefined' ? (globalThis as any).EdgeRuntime : undefined;
        if (isEdgeRuntime(edgeRuntime)) {
            this.metrics.edgeRuntimeVersion = edgeRuntime.version;
            this.metrics.isEdgeCompatible = true; // Edge runtime is always compatible if available
        }
    }

    public async write<T extends Record<string, unknown>>(entry: LogEntry<T>): Promise<void> {
        if (!this.shouldLog(entry.level)) {
            return;
        }

        const versionData = entry.data as VersionData | undefined;
        if (!versionData || !this.isVersionData(versionData)) {
            return;
        }

        // Add entry with timestamp
        const timestamp = entry.context?.timestamp ?? new Date().toISOString();
        this.entries.push({
            ...entry,
            context: {
                ...entry.context,
                timestamp
            }
        });

        // Enforce entry limit
        if (this.entries.length > this.transportConfig.maxEntries) {
            this.entries = this.entries.slice(-this.transportConfig.maxEntries);
        }
    }

    private isVersionData(data: unknown): data is VersionData {
        if (typeof data !== 'object' || data === null) {
            return false;
        }

        const vData = data as Partial<VersionData>;

        if (vData.type !== 'version') {
            return false;
        }

        if (typeof vData.version !== 'string') {
            return false;
        }

        if (vData.dependencies !== undefined &&
            (typeof vData.dependencies !== 'object' ||
                !Object.values(vData.dependencies).every(v => typeof v === 'string'))) {
            return false;
        }

        if (vData.environment !== undefined &&
            (typeof vData.environment !== 'object' ||
                !Object.values(vData.environment).every(v => typeof v === 'string'))) {
            return false;
        }

        return true;
    }

    public getEntries(): ReadonlyArray<LogEntry<Record<string, unknown>>> {
        return Object.freeze([...this.entries]);
    }

    public getMetrics(): Readonly<VersionMetrics> {
        return Object.freeze({
            ...this.metrics,
            incompatiblePatterns: new Map(this.metrics.incompatiblePatterns),
            sseImplementations: new Map(this.metrics.sseImplementations),
            reactPatterns: new Map(this.metrics.reactPatterns)
        });
    }

    private checkVersionCompatibility(
        framework: keyof typeof this.transportConfig.requiredVersions,
        version: string | null
    ): boolean {
        if (!version) return false;
        const required = this.transportConfig.requiredVersions[framework];
        if (!required) return true; // If no requirement is set, any version is valid
        return semver.gte(version, required);
    }

    private extractNextVersion(buildId: string): string {
        // Next.js build IDs don't contain version info directly
        // This is a placeholder for actual version detection logic
        return '13.0.0';
    }
} 