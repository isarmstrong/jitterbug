import type { LogEntry } from "../types/core";
import { AsyncBaseTransport } from "./async-base";
import { isNonEmptyString } from "../types/guards";
import semver from "semver";

/**
 * Base type for all transportable data with type discrimination
 */
export interface BaseTransportData {
    readonly type: string;
}

/**
 * Type-safe environment version information
 */
export interface VersionEnvironment {
    readonly node?: string;
    readonly next?: string;
    readonly react?: string;
}

/**
 * Version-specific data structure with type discrimination
 */
export interface VersionData extends BaseTransportData {
    readonly type: "version";
    readonly version: string;
    readonly dependencies: Readonly<Record<string, string>>;
    readonly environment: Readonly<VersionEnvironment>;
}

/**
 * Type-safe configuration for version transport
 */
export interface VersionTransportConfig {
    readonly maxEntries?: number;
    readonly requiredVersions?: Readonly<Partial<VersionEnvironment>>;
    readonly allowedPatterns?: ReadonlyArray<string>;
}

/**
 * Type alias for version-specific log entries
 */
type VersionLogEntry = Readonly<LogEntry<VersionData>>;

/**
 * Transport for tracking version information across the application
 * 
 * Type Invariant: this.entries always contains valid VersionLogEntry objects
 * This is maintained by:
 * 1. Only adding entries through writeToTransport which validates the data
 * 2. Never modifying entries directly, only through type-safe methods
 * 3. Immutable entry objects prevent external modifications
 */
export class VersionTransport extends AsyncBaseTransport {
    private readonly maxEntries: number;
    private readonly requiredVersions: Readonly<Required<VersionEnvironment>>;
    private readonly allowedPatterns: ReadonlyArray<string>;
    private entries: Array<VersionLogEntry>;

    constructor(config: Readonly<VersionTransportConfig> = {}) {
        super();
        this.maxEntries = config.maxEntries ?? 100;
        this.requiredVersions = Object.freeze({
            next: config.requiredVersions?.next ?? "13.0.0",
            react: config.requiredVersions?.react ?? "18.2.0",
            node: config.requiredVersions?.node ?? "16.0.0"
        });
        this.allowedPatterns = Object.freeze(config.allowedPatterns ?? ["^\\d+\\.\\d+\\.\\d+"]);
        this.entries = [];
    }

    protected override async writeToTransport<T extends Record<string, unknown>>(
        entry: Readonly<LogEntry<T>>
    ): Promise<void> {
        // Add await to satisfy require-await
        await Promise.resolve();

        if (!this.isValidEntry(entry)) {
            return;
        }

        const data = entry.data as unknown;
        if (!this.isVersionData(data)) {
            return;
        }

        if (!this.validateVersions(data)) {
            return;
        }

        // Create immutable version entry with correct typing
        const versionEntry = {
            level: entry.level,
            message: entry.message,
            data,
            context: undefined as undefined,  // Version entries don't use context
            error: entry.error,
            warnings: entry.warnings ? [...entry.warnings] : undefined,
            _metadata: entry._metadata ? { ...entry._metadata } : undefined
        } as const;

        // Maintain size limit with efficient array operations
        if (this.entries.length >= this.maxEntries) {
            this.entries = this.entries.slice(1);
        }
        this.entries.push(versionEntry as VersionLogEntry);
    }

    /**
     * Type guard for validating log entries
     */
    private isValidEntry<T extends Record<string, unknown>>(entry: unknown): entry is Readonly<LogEntry<T>> {
        return entry !== null &&
            typeof entry === 'object' &&
            'data' in entry &&
            typeof (entry as LogEntry<T>).data === 'object' &&
            (entry as LogEntry<T>).data !== null;
    }

    /**
     * Type guard for version environment data
     */
    private isVersionEnvironment(env: unknown): env is Readonly<VersionEnvironment> {
        if (!env || typeof env !== "object") {
            return false;
        }

        const environment = env as Partial<VersionEnvironment>;
        return (
            (environment.node === undefined || isNonEmptyString(environment.node)) &&
            (environment.next === undefined || isNonEmptyString(environment.next)) &&
            (environment.react === undefined || isNonEmptyString(environment.react))
        );
    }

    /**
     * Type guard for version data with discriminated union pattern
     */
    private isVersionData(data: unknown): data is Readonly<VersionData> {
        if (!this.isBaseTransportData(data)) {
            return false;
        }

        const candidate = data as Partial<VersionData>;
        return (
            candidate.type === "version" &&
            isNonEmptyString(candidate.version) &&
            typeof candidate.dependencies === "object" &&
            candidate.dependencies !== null &&
            this.isVersionEnvironment(candidate.environment)
        );
    }

    /**
     * Type guard for base transport data
     */
    private isBaseTransportData(data: unknown): data is Readonly<BaseTransportData> {
        return typeof data === "object" &&
            data !== null &&
            "type" in data &&
            typeof data.type === "string";
    }

    /**
     * Validates version format and requirements
     */
    private validateVersions(data: Readonly<VersionData>): boolean {
        // Validate version format
        const hasValidPattern = this.allowedPatterns.some(pattern => {
            const regex = new RegExp(pattern);
            return regex.test(data.version);
        });

        if (!hasValidPattern) return false;

        // Validate required versions
        const { environment } = data;
        return (
            this.checkVersion("next", environment.next) &&
            this.checkVersion("react", environment.react) &&
            this.checkVersion("node", environment.node)
        );
    }

    /**
     * Type-safe version comparison using semver
     */
    private checkVersion(framework: keyof VersionEnvironment, version: string | undefined): boolean {
        if (!isNonEmptyString(version)) return true; // Skip check if version is not provided
        const required = this.requiredVersions[framework];
        return semver.gte(version, required);
    }

    /**
     * Returns a readonly view of all entries
     */
    public getEntries(): ReadonlyArray<VersionLogEntry> {
        return Object.freeze([...this.entries]);
    }

    /**
     * Returns the latest versions for each environment
     */
    public getLatestVersions(): Readonly<Partial<VersionEnvironment>> {
        const updates = {} as Partial<VersionEnvironment>;

        for (const entry of this.entries) {
            if (!this.isVersionData(entry.data)) continue;
            const { environment } = entry.data;

            // Create new object with each update to avoid readonly property assignment
            Object.assign(updates, {
                ...(isNonEmptyString(environment.node) && { node: environment.node }),
                ...(isNonEmptyString(environment.next) && { next: environment.next }),
                ...(isNonEmptyString(environment.react) && { react: environment.react })
            });
        }

        return Object.freeze(updates);
    }

    protected override async cleanup(): Promise<void> {
        this.entries = [];
        await super.cleanup();
    }
} 