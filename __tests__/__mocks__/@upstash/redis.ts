import { vi } from 'vitest';
import type { RedisClient, RedisConfig, CacheContext } from '../../../src/types/upstash';

class MockRedis implements RedisClient {
    private data = new Map<string, unknown>();

    public get = vi.fn().mockImplementation(async <T>(key: string): Promise<T | null> => {
        return this.data.get(key) as T | null;
    });

    public set = vi.fn().mockImplementation(async (key: string, value: string): Promise<void> => {
        this.data.set(key, value);
    });

    public del = vi.fn().mockImplementation(async (key: string): Promise<void> => {
        this.data.delete(key);
    });

    public _debug = {
        lastOperation: null as CacheContext | null,
        operations: [] as CacheContext[],
        startCapture() {
            this.operations = [];
        },
        getOperations() {
            return [...this.operations];
        }
    };
}

const mockRedis = new MockRedis();

export class Redis implements RedisClient {
    private client: RedisClient;
    public get: RedisClient['get'];
    public set: RedisClient['set'];
    public del: RedisClient['del'];
    public _debug: RedisClient['_debug'];

    constructor(_config: RedisConfig) {
        this.client = mockRedis;
        this.get = this.client.get;
        this.set = this.client.set;
        this.del = this.client.del;
        this._debug = this.client._debug;
    }
}

vi.mocked(Redis).mockImplementation(() => new Redis({ url: '', token: '' })); 