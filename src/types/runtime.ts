export const enum Runtime {
    EDGE = 'EDGE',
    NODE = 'NODE',
    BROWSER = 'BROWSER'
}

export type RuntimeType = Runtime | undefined;

// Add detection helper for tests
export function detectRuntime(): Runtime {
    if (typeof EdgeRuntime === 'string') return Runtime.EDGE;
    if (typeof process !== 'undefined') return Runtime.NODE;
    return Runtime.BROWSER;
}

// Example usage in runtime.ts:
export function getRuntimeType(): string {
    // Use the declared global if it exists, otherwise fallback
    if (typeof EdgeRuntime === 'string') return "EDGE";
    return "DEFAULT";
} 