export const MemoryUnit = {
    B: 1,
    KB: 1024,
    MB: 1024 * 1024,
    GB: 1024 * 1024 * 1024
} as const;

export const MemoryMetricKey = {
    HeapUsed: 'heapUsed',
    HeapTotal: 'heapTotal',
    External: 'external',
    ArrayBuffers: 'arrayBuffers',
    Threshold: 'threshold'
} as const;

export type MemoryMetrics = {
    [key in typeof MemoryMetricKey[keyof typeof MemoryMetricKey]]: number;
}; 