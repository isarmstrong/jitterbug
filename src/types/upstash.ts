export interface RedisClient {
    get: <T>(key: string) => Promise<T | null>;
    set: (key: string, value: string) => Promise<void>;
    del: (key: string) => Promise<void>;
    _debug?: {
        lastOperation: CacheContext | null;
        operations: CacheContext[];
        startCapture(): void;
        getOperations(): CacheContext[];
    };
}

export interface RedisConfig {
    url: string;
    token: string;
}

export interface CacheContext {
    operation: "get" | "set" | "delete" | "has" | "clear";
    key: string;
    ttl?: number;
    size?: number;
    hit?: boolean;
    duration?: number;
} 