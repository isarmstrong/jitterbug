import type { LogEntry } from "../types/core";
import { BaseTransport } from "./types";
import { isNonEmptyString } from "../types/guards";
import semver from "semver";

export interface VersionData {
    type: "version";
    version: string;
    dependencies: Record<string, string>;
    environment: {
        node?: string;
        next?: string;
        react?: string;
    };
}

export interface VersionTransportConfig {
    maxEntries?: number;
    requiredVersions?: {
        next?: string;
        react?: string;
        node?: string;
    };
    allowedPatterns?: string[];
}

export class VersionTransport extends BaseTransport {
    private readonly maxEntries: number;
    private readonly requiredVersions: Required<NonNullable<VersionTransportConfig["requiredVersions"]>>;
    private readonly allowedPatterns: string[];
    private entries: Array<LogEntry<VersionData>> = [];

    constructor(config: VersionTransportConfig = {}) {
        super({
            enabled: true,
            format: "json"
        });

        this.maxEntries = config.maxEntries ?? 100;
        this.requiredVersions = {
            next: config.requiredVersions?.next ?? "13.0.0",
            react: config.requiredVersions?.react ?? "18.2.0",
            node: config.requiredVersions?.node ?? "16.0.0"
        };
        this.allowedPatterns = config.allowedPatterns ?? ["^\\d+\\.\\d+\\.\\d+"];
    }

    public async write<T extends Record<string, unknown>>(entry: LogEntry<T>): Promise<void> {
        if (!this.shouldLog(entry.level)) {
            return;
        }

        const data = entry.data;
        if (!this.isVersionData(data)) {
            return;
        }

        if (!this.validateVersions(data)) {
            return;
        }

        if (this.entries.length >= this.maxEntries) {
            this.entries.shift();
        }

        const versionEntry = {
            ...entry,
            data
        } as LogEntry<VersionData>;

        this.entries.push(versionEntry);
        return Promise.resolve();
    }

    private isVersionData(data: unknown): data is VersionData {
        if (!data || typeof data !== "object") {
            return false;
        }

        const d = data as Partial<VersionData>;

        // Type check
        if (d.type !== "version") return false;

        // Version check
        if (!isNonEmptyString(d.version)) return false;

        // Dependencies check
        if (!d.dependencies || typeof d.dependencies !== "object" || d.dependencies === null) {
            return false;
        }

        // Environment check
        if (!d.environment || typeof d.environment !== "object" || d.environment === null) {
            return false;
        }

        // Optional environment fields check
        const { node, next, react } = d.environment;
        if (node !== undefined && !isNonEmptyString(node)) return false;
        if (next !== undefined && !isNonEmptyString(next)) return false;
        if (react !== undefined && !isNonEmptyString(react)) return false;

        return true;
    }

    private validateVersions(data: VersionData): boolean {
        // Validate version format
        const hasValidPattern = this.allowedPatterns.some(pattern => {
            const regex = new RegExp(pattern);
            return isNonEmptyString(data.version) && regex.test(data.version);
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

    private checkVersion(framework: keyof typeof this.requiredVersions, version: string | undefined): boolean {
        if (!isNonEmptyString(version)) return true; // Skip check if version is not provided
        const required = this.requiredVersions[framework];
        return semver.gte(version, required);
    }

    public getEntries(): ReadonlyArray<LogEntry<VersionData>> {
        return [...this.entries];
    }

    public getLatestVersions(): Record<string, string> {
        const latest: Record<string, string> = {};

        for (const entry of this.entries) {
            const versionData = entry.data as VersionData;
            const { environment } = versionData;

            if (isNonEmptyString(environment.node)) {
                latest.node = environment.node;
            }
            if (isNonEmptyString(environment.next)) {
                latest.next = environment.next;
            }
            if (isNonEmptyString(environment.react)) {
                latest.react = environment.react;
            }
        }

        return latest;
    }
} 