export interface SSETransportConfig {
    endpoint: string;
    forceVersion?: string;
    heartbeatInterval?: number;
    maxDuration?: number;
    retryInterval?: number;        // Added: Optional retry interval in milliseconds
    autoReconnect?: boolean;       // Added: Whether to automatically reconnect
    signal?: AbortSignal;          // Added: Optional AbortSignal for cancellation
} 