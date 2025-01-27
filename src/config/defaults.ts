export const EDGE_DEFAULTS = {
    maxEntries: 1000,
    bufferSize: 100,
    retryInterval: 5000,
    maxRetries: 5,
    maxConnectionDuration: 270000, // 4.5 minutes
    maxPayloadSize: 128 * 1024, // 128KB
    autoReconnect: true,
    maxConcurrent: 2,
    requestsPerSecond: 10,
    batchSize: 5,
    flushInterval: 100,
    testMode: false
} as const;

export const GUI_DEFAULTS = {
    maxEntries: 1000,
    bufferSize: 100,
    autoReconnect: true,
    defaultFilters: {}
}; 