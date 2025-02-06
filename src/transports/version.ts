import type { ValidationResult } from '@isarmstrong/jitterbug/types';
import * as semver from "semver";
import { LogEntry, Runtime } from "../types";
import { BaseEntry } from '../types/core';
import { BaseTransport, EdgeTransportConfig, TransportError, TransportErrorCode } from "../types/transports";

interface _EdgeRuntimeGlobal {
    name: string;
    version: string;
}

interface MetricEntry {
    count: number;
    lastSeen: Date;
    severity?: 'warning' | 'error';
    details?: string;
    isValid?: boolean;
    issues?: string[];
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
    incompatiblePatterns: Map<string, MetricEntry>;

    // SSE Patterns
    sseImplementations: Map<string, MetricEntry>;

    // React Patterns
    reactPatterns: Map<string, MetricEntry>;

    // Version Mismatches
    versionMismatches: Map<string, MetricEntry>;
}

export interface VersionConfig extends EdgeTransportConfig {
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

interface NextData {
    __NEXT_DATA__?: {
        buildId?: string;
    };
}

interface ReactDevTools {
    __REACT_DEVTOOLS_GLOBAL_HOOK__?: {
        version?: string;
    };
}

interface EdgeRuntimeEnv {
    EdgeRuntime?: string;
}

export interface VersionInfo {
    major: number;
    minor: number;
    patch: number;
    prerelease?: string;
    build?: string;
}

export interface VersionMetadata {
    timestamp: number;
    environment: string;
    runtime: string;
    dependencies: Record<string, string>;
}

export interface VersionData {
    current: VersionInfo;
    previous?: VersionInfo;
    metadata: VersionMetadata;
}

export interface VersionTransportConfig extends EdgeTransportConfig {
    currentVersion: VersionInfo;
    trackHistory?: boolean;
    maxHistorySize?: number;
    requiredVersions?: {
        next?: string;
        stable?: string;
        latest?: string;
        react?: string;
        node?: string;
    };
    allowedPatterns?: Set<string>;
}

export class VersionTransport extends BaseTransport {
    protected override config: Required<VersionTransportConfig>;
    private versionHistory: VersionData[] = [];
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
        versionMismatches: new Map(),
        reactPatterns: new Map(),
        sseImplementations: new Map()
    };

    constructor(config: VersionTransportConfig) {
        super(config);
        this.config = {
            ...config,
            trackHistory: config.trackHistory ?? true,
            maxHistorySize: config.maxHistorySize ?? 100,
            requiredVersions: {
                next: config.requiredVersions?.next ?? '13.0.0',
                stable: config.requiredVersions?.stable ?? '12.0.0',
                latest: config.requiredVersions?.latest ?? '11.0.0',
                react: config.requiredVersions?.react ?? '18.2.0',
                node: config.requiredVersions?.node ?? '16.0.0'
            },
            allowedPatterns: config.allowedPatterns ?? new Set(['*'])
        } as Required<VersionTransportConfig>;

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
            const next = this.getNextBuildId();
            if (next) {
                this.metrics.nextVersion = next;
                this.metrics.isNextCompatible = this.checkVersionCompatibility(
                    'next',
                    this.metrics.nextVersion
                );
            }

            // React version can be detected from React DevTools global
            const react = this.getReactDevToolsVersion();
            if (react) {
                this.metrics.reactVersion = react;
                this.metrics.isReactCompatible = this.checkVersionCompatibility(
                    'react',
                    react
                );
            }
        }

        // Edge runtime version
        const edgeRuntime = this.getEdgeRuntime();
        if (edgeRuntime) {
            this.metrics.edgeRuntimeVersion = edgeRuntime;
            this.metrics.isEdgeCompatible = true; // Edge runtime is always compatible if available
        }
    }

    public override async write<T extends Record<string, unknown>>(entry: BaseEntry<T>): Promise<void> {
        try {
            const data = entry.data as unknown;
            if (this.isVersionEvent(data)) {
                await this.processVersionEvent({
                    type: data.eventType,
                    framework: data.framework,
                    pattern: data.pattern,
                    sse: data.sse,
                    react: data.react
                });
            } else {
                const versionData = this.validateVersionData(data);
                await this.processVersionUpdate(versionData);
            }
        } catch (error) {
            throw new TransportError(
                `Failed to process version update: ${error instanceof Error ? error.message : String(error)}`,
                TransportErrorCode.SERIALIZATION_FAILED
            );
        }
    }

    private validateVersionData(data: unknown): VersionData {
        if (!this.isVersionData(data)) {
            throw new TransportError(
                'Invalid version data format',
                TransportErrorCode.SERIALIZATION_FAILED
            );
        }
        return data;
    }

    private isVersionData(data: unknown): data is VersionData {
        if (!data || typeof data !== 'object') return false;

        const candidate = data as Partial<VersionData>;
        return (
            this.isVersionInfo(candidate.current) &&
            (candidate.previous === undefined || this.isVersionInfo(candidate.previous)) &&
            this.isVersionMetadata(candidate.metadata)
        );
    }

    private isVersionInfo(info: unknown): info is VersionInfo {
        if (!info || typeof info !== 'object') return false;

        const candidate = info as Partial<VersionInfo>;
        return (
            typeof candidate.major === 'number' &&
            typeof candidate.minor === 'number' &&
            typeof candidate.patch === 'number'
        );
    }

    private isVersionMetadata(metadata: unknown): metadata is VersionMetadata {
        if (!metadata || typeof metadata !== 'object') return false;

        const candidate = metadata as Partial<VersionMetadata>;
        return (
            typeof candidate.timestamp === 'number' &&
            typeof candidate.environment === 'string' &&
            typeof candidate.runtime === 'string' &&
            this.isValidDependencies(candidate.dependencies)
        );
    }

    private isValidDependencies(deps: unknown): deps is Record<string, string> {
        if (!deps || typeof deps !== 'object') return false;

        return Object.entries(deps).every(
            ([key, value]) => typeof key === 'string' && typeof value === 'string'
        );
    }

    private async processVersionUpdate(data: VersionData): Promise<void> {
        if (this.config.trackHistory) {
            this.versionHistory.push(data);
            if (this.versionHistory.length > this.config.maxHistorySize) {
                this.versionHistory.shift();
            }
        }

        // Update version metrics
        const { dependencies } = data.metadata;
        this.metrics.reactVersion = dependencies.react ?? null;
        this.metrics.nodeVersion = dependencies.node ?? null;
        this.metrics.nextVersion = dependencies.next ?? null;
        this.metrics.edgeRuntimeVersion = dependencies['edge-runtime'] ?? null;

        // Check version compatibility
        if (dependencies.react) {
            this.metrics.isReactCompatible = this.checkVersionCompatibility('react', dependencies.react);
        }
        if (dependencies.node) {
            this.metrics.isNodeCompatible = this.checkVersionCompatibility('node', dependencies.node);
        }
        if (dependencies.next) {
            this.metrics.isNextCompatible = this.checkVersionCompatibility('next', dependencies.next);
        }
        if (dependencies['edge-runtime']) {
            this.metrics.isEdgeCompatible = this.checkVersionCompatibility('latest', dependencies['edge-runtime']);
        }
    }

    private checkVersionCompatibility(
        framework: keyof Required<VersionTransportConfig>['requiredVersions'],
        version: string
    ): boolean {
        const requiredVersion = this.config.requiredVersions[framework];
        if (!requiredVersion || !version) return false;

        const isCompatible = semver.gte(version, requiredVersion);
        if (!isCompatible) {
            this.metrics.versionMismatches.set(framework, {
                count: (this.metrics.versionMismatches.get(framework)?.count ?? 0) + 1,
                lastSeen: new Date()
            });
        }
        return isCompatible;
    }

    public getVersionHistory(): ReadonlyArray<VersionData> {
        return Object.freeze([...this.versionHistory]);
    }

    public getMetrics(): Readonly<VersionMetrics> {
        return Object.freeze({
            ...this.metrics,
            incompatiblePatterns: new Map(this.metrics.incompatiblePatterns),
            versionMismatches: new Map(this.metrics.versionMismatches),
            reactPatterns: new Map(this.metrics.reactPatterns),
            sseImplementations: new Map(this.metrics.sseImplementations)
        });
    }

    private isVersionEntry<T extends Record<string, unknown>>(
        entry: LogEntry<T>
    ): boolean {
        return 'data' in entry && typeof entry.data === 'object' && entry.data !== null &&
            'type' in entry.data && entry.data.type === 'version';
    }

    private parseVersionEvent<T extends Record<string, unknown>>(
        entry: LogEntry<T>
    ): VersionEvent | null {
        if (!('data' in entry) || typeof entry.data !== 'object' || entry.data === null) {
            return null;
        }

        const data = entry.data as Record<string, unknown>;

        if (!data.eventType || typeof data.eventType !== 'string') {
            return null;
        }

        return {
            type: data.eventType as VersionEvent['type'],
            framework: data.framework as VersionEvent['framework'],
            pattern: data.pattern as VersionEvent['pattern'],
            sse: data.sse as VersionEvent['sse'],
            react: data.react as VersionEvent['react']
        };
    }

    private async processVersionEvent(event: VersionEvent): Promise<void> {
        switch (event.type) {
            case 'framework':
                if (event.framework) {
                    this.updateFrameworkVersion(event.framework);
                }
                break;
            case 'pattern':
                if (event.pattern) {
                    this.updatePatternMetrics(event.pattern);
                }
                break;
            case 'sse':
                if (event.sse) {
                    this.updateSSEMetrics(event.sse);
                }
                break;
            case 'react':
                if (event.react) {
                    this.updateReactPatternMetrics(event.react);
                }
                break;
        }
    }

    private updatePatternMetrics(pattern: VersionEvent['pattern']): void {
        if (!pattern) return;

        const entry: MetricEntry = {
            severity: 'error' as const,
            details: 'may cause hydration mismatches',
            lastSeen: new Date(),
            count: 1
        };

        // Handle useLayoutEffect in Edge runtime
        if (pattern.context?.runtime === Runtime.EDGE && pattern.name === 'useLayoutEffect') {
            this.metrics.incompatiblePatterns.set(pattern.name, entry);
        }

        // Handle sync fetch in Edge runtime
        if (pattern.context?.runtime === Runtime.EDGE && pattern.name === 'fetch' &&
            pattern.implementation?.includes('sync fetch in Edge')) {
            this.metrics.incompatiblePatterns.set(pattern.name, {
                ...entry,
                details: 'synchronous fetch in Edge runtime may cause performance issues'
            });
        }
    }

    private updateSSEMetrics(sse: VersionEvent['sse']): void {
        if (!sse) return;

        const entry = {
            isValid: true,
            issues: [],
            lastSeen: new Date(),
            count: 1
        };

        this.metrics.sseImplementations.set(sse.endpoint, entry);
    }

    private updateReactPatternMetrics(react: VersionEvent['react']): void {
        if (!react) return;

        const issues = [];
        if (react.async && !react.suspense) {
            issues.push('Async component without Suspense boundary');
        }
        if (react.patterns.includes('useLayoutEffect') && react.serverComponent) {
            issues.push('useLayoutEffect in Server Component');
        }

        const entry = {
            issues,
            lastSeen: new Date(),
            count: 1
        };

        this.metrics.reactPatterns.set(react.component, entry);
    }

    private updateFrameworkVersion(framework: VersionEvent['framework']): void {
        if (!framework) return;

        switch (framework.name.toLowerCase()) {
            case 'next':
                this.metrics.nextVersion = framework.version;
                this.metrics.isNextCompatible = this.checkVersionCompatibility('next', framework.version);
                break;
            case 'react':
                this.metrics.reactVersion = framework.version;
                this.metrics.isReactCompatible = this.checkVersionCompatibility('react', framework.version);
                break;
            case 'node':
                this.metrics.nodeVersion = framework.version;
                this.metrics.isNodeCompatible = this.checkVersionCompatibility('node', framework.version);
                break;
        }
    }

    private determinePatternSeverity(pattern: NonNullable<VersionEvent['pattern']>): 'warning' | 'error' {
        // Check for known problematic patterns
        const errorPatterns = [
            'useLayoutEffect in SSR',
            'sync fetch in Edge',
            'document access in SSR'
        ];

        return errorPatterns.some(p => pattern.implementation.includes(p))
            ? 'error'
            : 'warning';
    }

    private generatePatternDetails(pattern: NonNullable<VersionEvent['pattern']>): string {
        const details = [`Pattern '${pattern.name}' is not recommended.`];

        if (pattern.context) {
            if (pattern.context.runtime === Runtime.EDGE) {
                details.push('This pattern may not work correctly in Edge Runtime.');
            }
            if (pattern.context.isSSR) {
                details.push('This pattern may cause hydration mismatches.');
            }
        }

        return details.join(' ');
    }

    private validateSSEImplementation(sse: NonNullable<VersionEvent['sse']>): boolean {
        // Check for required SSE patterns
        const requiredPatterns = [
            'EventSource',
            'onmessage',
            'onerror',
            'reconnection'
        ];

        return requiredPatterns.every(pattern =>
            sse.implementation.includes(pattern)
        );
    }

    private identifySSEIssues(sse: NonNullable<VersionEvent['sse']>): string[] {
        const issues: string[] = [];

        if (!sse.reconnectStrategy) {
            issues.push('Missing reconnection strategy');
        }
        if (!sse.implementation.includes('error handling')) {
            issues.push('Missing error handling');
        }
        if (sse.implementation.includes('WebSocket')) {
            issues.push('Mixing SSE with WebSocket patterns');
        }

        return issues;
    }

    private identifyReactPatternIssues(react: NonNullable<VersionEvent['react']>): string[] {
        const issues: string[] = [];

        if (react.async && !react.suspense) {
            issues.push('Async component without Suspense boundary');
        }
        if (react.serverComponent && !this.metrics.isNextCompatible) {
            issues.push('Server Component used with incompatible Next.js version');
        }
        if (react.patterns?.includes('useLayoutEffect') && react.serverComponent) {
            issues.push('useLayoutEffect in Server Component');
        }

        return issues;
    }

    private getNextBuildId(): string | null {
        const nextData = (window as unknown as NextData).__NEXT_DATA__;
        if (nextData?.buildId != null) {
            return this.sanitizeVersion(nextData.buildId);
        }
        return null;
    }

    private getReactDevToolsVersion(): string | null {
        const devTools = (window as unknown as ReactDevTools).__REACT_DEVTOOLS_GLOBAL_HOOK__;
        if (devTools?.version != null) {
            return this.sanitizeVersion(devTools.version);
        }
        return null;
    }

    private getEdgeRuntime(): string | null {
        const runtime = (process as unknown as EdgeRuntimeEnv).EdgeRuntime;
        return runtime != null ? runtime : null;
    }

    private sanitizeVersion(version: string | null | undefined): string | null {
        if (version == null) return null;
        return version.trim() || null;
    }

    private isValidVersion(version: string | null | undefined): version is string {
        return version != null && version.trim().length > 0;
    }

    private async handleData(data: unknown): Promise<void> {
        if (!this.isValidData(data)) return;
        // Rest of the implementation
    }

    private isValidData(data: unknown): data is { version: string } {
        return typeof data === 'object' && data != null && 'version' in data && typeof data.version === 'string';
    }

    private isVersionEvent(data: unknown): data is { type: 'version'; eventType: 'framework' | 'pattern' | 'sse' | 'react'; framework?: VersionEvent['framework']; pattern?: VersionEvent['pattern']; sse?: VersionEvent['sse']; react?: VersionEvent['react'] } {
        if (typeof data !== 'object' || data === null) return false;
        const event = data as Partial<{ type: 'version'; eventType: 'framework' | 'pattern' | 'sse' | 'react'; framework?: VersionEvent['framework']; pattern?: VersionEvent['pattern']; sse?: VersionEvent['sse']; react?: VersionEvent['react'] }>;
        return event.type === 'version' &&
            typeof event.eventType === 'string' &&
            ['framework', 'pattern', 'sse', 'react'].includes(event.eventType);
    }
}

export function isEdgeCompatible(): boolean {
    return typeof globalThis.EdgeRuntime !== 'undefined';
}

export function validateConfig(config: EdgeTransportConfig): ValidationResult {
    const errors: string[] = [];

    if (config.maxPayloadSize && typeof config.maxPayloadSize !== 'number') {
        errors.push('maxPayloadSize must be a number');
    }

    if (config.maxRetries && typeof config.maxRetries !== 'number') {
        errors.push('maxRetries must be a number');
    }

    return {
        isValid: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined
    };
}

export function validatePayload(payload: unknown): ValidationResult {
    const errors: string[] = [];

    if (!payload || typeof payload !== 'object') {
        errors.push('Payload must be an object');
    }

    return {
        isValid: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined
    };
} 