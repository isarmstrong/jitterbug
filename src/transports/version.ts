import * as semver from "semver";
import { LogEntry, LogTransport, Runtime } from "../types";
import { BaseTransport, TransportConfig } from "./types";

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

export interface VersionConfig extends TransportConfig {
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

export class VersionTransport extends BaseTransport implements LogTransport {
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

    private readonly requiredVersions: Required<NonNullable<VersionConfig['requiredVersions']>>;
    private readonly allowedPatterns: Set<string>;

    constructor(config?: VersionConfig) {
        super(config);
        this.requiredVersions = {
            next: config?.requiredVersions?.next ?? '13.0.0',
            react: config?.requiredVersions?.react ?? '18.2.0',
            node: config?.requiredVersions?.node ?? '16.0.0'
        };
        this.allowedPatterns = new Set(config?.allowedPatterns ?? []);

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

    public async write<T extends Record<string, unknown>>(
        entry: LogEntry<T>
    ): Promise<void> {
        if (!this.isVersionEntry(entry)) {
            return Promise.resolve();
        }

        const event = this.parseVersionEvent(entry);
        if (!event) return Promise.resolve();

        this.processVersionEvent(event);
        return Promise.resolve();
    }

    public getMetrics(): Readonly<VersionMetrics> {
        return Object.freeze({
            ...this.metrics,
            incompatiblePatterns: new Map(this.metrics.incompatiblePatterns),
            sseImplementations: new Map(this.metrics.sseImplementations),
            reactPatterns: new Map(this.metrics.reactPatterns)
        });
    }

    private isVersionEntry<T extends Record<string, unknown>>(
        entry: LogEntry<T>
    ): boolean {
        return (entry as any).data?.type === 'version';
    }

    private parseVersionEvent<T extends Record<string, unknown>>(
        entry: LogEntry<T>
    ): VersionEvent | null {
        const data = (entry as any).data as Record<string, unknown>;

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

    private processVersionEvent(event: VersionEvent): void {
        switch (event.type) {
            case 'framework':
                this.processFrameworkVersion(event.framework);
                break;
            case 'pattern':
                this.processPatternUsage(event.pattern);
                break;
            case 'sse':
                this.processSSEImplementation(event.sse);
                break;
            case 'react':
                this.processReactPattern(event.react);
                break;
        }
    }

    private processFrameworkVersion(framework?: VersionEvent['framework']): void {
        if (!framework?.name || !framework.version) return;

        switch (framework.name.toLowerCase()) {
            case 'next':
                this.metrics.nextVersion = framework.version;
                this.metrics.isNextCompatible = this.checkVersionCompatibility(
                    'next',
                    framework.version
                );
                break;
            case 'react':
                this.metrics.reactVersion = framework.version;
                this.metrics.isReactCompatible = this.checkVersionCompatibility(
                    'react',
                    framework.version
                );
                break;
            case 'node':
                this.metrics.nodeVersion = framework.version;
                this.metrics.isNodeCompatible = this.checkVersionCompatibility(
                    'node',
                    framework.version
                );
                break;
        }
    }

    private processPatternUsage(pattern?: VersionEvent['pattern']): void {
        if (!pattern?.name || !pattern.implementation) return;

        if (!this.allowedPatterns.has(pattern.name)) {
            this.metrics.incompatiblePatterns.set(pattern.name, {
                count: (this.metrics.incompatiblePatterns.get(pattern.name)?.count ?? 0) + 1,
                lastSeen: Date.now(),
                severity: this.determinePatternSeverity(pattern),
                details: this.generatePatternDetails(pattern)
            });
        }
    }

    private processSSEImplementation(sse?: VersionEvent['sse']): void {
        if (!sse?.endpoint || !sse.implementation) return;

        const isValid = this.validateSSEImplementation(sse);
        const issues = this.identifySSEIssues(sse);

        this.metrics.sseImplementations.set(sse.endpoint, {
            isValid,
            issues,
            lastUsed: Date.now()
        });
    }

    private processReactPattern(react?: VersionEvent['react']): void {
        if (!react?.component) return;

        this.metrics.reactPatterns.set(react.component, {
            isAsync: react.async ?? false,
            usesSuspense: react.suspense ?? false,
            usesServerComponents: react.serverComponent ?? false,
            lastSeen: Date.now(),
            issues: this.identifyReactPatternIssues(react)
        });
    }

    private checkVersionCompatibility(
        framework: keyof typeof this.requiredVersions,
        version: string | null
    ): boolean {
        if (!version) return false;
        return semver.gte(version, this.requiredVersions[framework]);
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

    private extractNextVersion(buildId: string): string {
        // Next.js build IDs don't contain version info directly
        // This is a placeholder for actual version detection logic
        return '13.0.0';
    }
} 