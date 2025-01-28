/**
 * Edge Runtime type definitions and type guards
 * @module types/edge
 */

/**
 * Edge Runtime memory metrics interface
 * @see https://edge-runtime.vercel.app/features/available-apis#memory-usage
 */
export interface EdgeMemoryMetrics {
    /** Current size of heap in bytes */
    usedJSHeapSize: number;
    /** Total available heap size in bytes */
    totalJSHeapSize: number;
    /** Size of external memory in bytes (if available) */
    jsExternalHeapSize?: number;
    /** Size of ArrayBuffer allocations in bytes (if available) */
    arrayBuffers?: number;
}

/**
 * Type guard for EdgeMemoryMetrics
 * @param value - Value to check
 * @returns True if value matches EdgeMemoryMetrics interface
 */
export function isEdgeMemoryMetrics(value: unknown): value is EdgeMemoryMetrics {
    if (typeof value !== 'object' || value === null) {
        return false;
    }

    const metrics = value as Partial<EdgeMemoryMetrics>;

    // Required properties must be numbers
    if (typeof metrics.usedJSHeapSize !== 'number' ||
        typeof metrics.totalJSHeapSize !== 'number') {
        return false;
    }

    // Optional properties must be numbers if present
    if (metrics.jsExternalHeapSize !== undefined &&
        typeof metrics.jsExternalHeapSize !== 'number') {
        return false;
    }

    if (metrics.arrayBuffers !== undefined &&
        typeof metrics.arrayBuffers !== 'number') {
        return false;
    }

    return true;
}

/**
 * Edge Runtime global interface
 */
export interface EdgeRuntime {
    /** Edge Runtime version */
    version: string;
    /** Memory metrics if available */
    memory?: EdgeMemoryMetrics;
    /** Cache API if available */
    caches?: CacheStorage;
}

/**
 * Type guard for EdgeRuntime
 * @param value - Value to check
 * @returns True if value matches EdgeRuntime interface
 */
export function isEdgeRuntime(value: unknown): value is EdgeRuntime {
    if (typeof value !== 'object' || value === null) {
        return false;
    }

    const runtime = value as Partial<EdgeRuntime>;

    // Version is required and must be a string
    if (typeof runtime.version !== 'string') {
        return false;
    }

    // Memory metrics must match interface if present
    if (runtime.memory !== undefined && !isEdgeMemoryMetrics(runtime.memory)) {
        return false;
    }

    // Cache API must be present if defined
    if (runtime.caches !== undefined &&
        typeof runtime.caches !== 'object') {
        return false;
    }

    return true;
}

/**
 * Get Edge Runtime if available
 * @returns EdgeRuntime object or null if not in Edge Runtime
 */
export function getEdgeRuntime(): EdgeRuntime | null {
    if (typeof globalThis === 'undefined') {
        return null;
    }

    const runtime = (globalThis as unknown as { EdgeRuntime?: unknown }).EdgeRuntime;
    return isEdgeRuntime(runtime) ? runtime : null;
} 