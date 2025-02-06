import { LogEntry } from '../types/core';
import { BaseTransport, TransportConfig, TransportError, TransportErrorCode } from '../types/transports';

export interface ResourceMetadata {
    path: string;
    size: number;
    type: string;
    lastModified: number;
    etag?: string;
}

export interface ResourceData {
    content: string | Blob;
    metadata: ResourceMetadata;
}

export interface ResourceTransportConfig extends TransportConfig {
    basePath: string;
    maxSize?: number;
    allowedTypes?: string[];
}

export class ResourceTransport extends BaseTransport {
    protected override config: Required<ResourceTransportConfig>;

    constructor(config: ResourceTransportConfig) {
        super(config);
        this.config = {
            ...config,
            maxSize: config.maxSize ?? 5 * 1024 * 1024, // 5MB default
            allowedTypes: config.allowedTypes ?? ['*/*']
        } as Required<ResourceTransportConfig>;
    }

    public async write<T extends Record<string, unknown>>(entry: LogEntry<T>): Promise<void> {
        try {
            const resourceData = this.validateResourceData(entry.data);
            await this.writeResource(resourceData);
        } catch (error) {
            throw new TransportError(
                `Failed to write resource: ${error instanceof Error ? error.message : String(error)}`,
                TransportErrorCode.SERIALIZATION_FAILED
            );
        }
    }

    private validateResourceData(data: unknown): ResourceData {
        if (!this.isResourceData(data)) {
            throw new TransportError(
                'Invalid resource data format',
                TransportErrorCode.SERIALIZATION_FAILED
            );
        }
        return data;
    }

    private isResourceData(data: unknown): data is ResourceData {
        if (!data || typeof data !== 'object') return false;

        const candidate = data as Partial<ResourceData>;
        return (
            (typeof candidate.content === 'string' || candidate.content instanceof Blob) &&
            this.isResourceMetadata(candidate.metadata)
        );
    }

    private isResourceMetadata(metadata: unknown): metadata is ResourceMetadata {
        if (!metadata || typeof metadata !== 'object') return false;

        const candidate = metadata as Partial<ResourceMetadata>;
        return (
            typeof candidate.path === 'string' &&
            typeof candidate.size === 'number' &&
            typeof candidate.type === 'string' &&
            typeof candidate.lastModified === 'number'
        );
    }

    private async writeResource(data: ResourceData): Promise<void> {
        // Implementation details would go here
        // This is just a stub for the type safety improvements
        console.log('Writing resource:', data);
    }
} 