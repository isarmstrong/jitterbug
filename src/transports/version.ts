import type { LogEntry } from "../types/core";
import { BaseTransport } from "./types";
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

        const data = entry.data as unknown;
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
    }

    private isVersionData(data: unknown): data is VersionData {
        if (!data || typeof data !== "object") {
            return false;
        }

        const d = data as Partial<VersionData>;
        return (
            d.type === "version" &&
            typeof d.version === "string" &&
            typeof d.dependencies === "object" &&
            d.dependencies !== null &&
            typeof d.environment === "object" &&
            d.environment !== null &&
            (!d.environment.node || typeof d.environment.node === "string") &&
            (!d.environment.next || typeof d.environment.next === "string") &&
            (!d.environment.react || typeof d.environment.react === "string")
        );
    }

    private validateVersions(data: VersionData): boolean {
        // Validate version format
        if (!this.allowedPatterns.some(pattern =>
            new RegExp(pattern).test(data.version)
        )) {
            return false;
        }

        // Validate required versions
        const { environment } = data;
        return (
            this.checkVersion("next", environment.next) &&
            this.checkVersion("react", environment.react) &&
            this.checkVersion("node", environment.node)
        );
    }

    private checkVersion(framework: keyof typeof this.requiredVersions, version?: string): boolean {
        const required = this.requiredVersions[framework];
        if (!version) return true; // If no version is provided, skip check
        return semver.gte(version, required);
    }

    public getEntries(): ReadonlyArray<LogEntry<VersionData>> {
        return [...this.entries];
    }

    public getLatestVersions(): Record<string, string> {
        const latest: Record<string, string> = {};

        for (const entry of this.entries) {
            const { environment } = entry.data as VersionData;
            if (environment.node) latest.node = environment.node;
            if (environment.next) latest.next = environment.next;
            if (environment.react) latest.react = environment.react;
        }

        return latest;
    }
} 