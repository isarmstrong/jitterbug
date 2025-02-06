import { TransportError, TransportErrorCode } from '../types/transports';

export interface StorageValue {
    timestamp: number;
    data: unknown;
    metadata?: Record<string, unknown>;
}

export class Storage {
    private store = new Map<string, StorageValue>();

    public async setItem(key: string, value: unknown): Promise<void> {
        try {
            const storageValue: StorageValue = {
                timestamp: Date.now(),
                data: value
            };
            this.store.set(key, storageValue);
        } catch (error) {
            throw new TransportError(
                `Failed to store item: ${error instanceof Error ? error.message : String(error)}`,
                TransportErrorCode.SERIALIZATION_FAILED
            );
        }
    }

    public async getItem<T>(key: string): Promise<T | null> {
        const value = this.store.get(key);
        return value ? value.data as T : null;
    }

    public async removeItem(key: string): Promise<void> {
        this.store.delete(key);
    }

    public async clear(): Promise<void> {
        this.store.clear();
    }
} 