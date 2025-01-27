export enum Runtime {
    EDGE = 'edge',
    NODE = 'node',
    BROWSER = 'browser'
}

// Add detection helper for tests
export function detectRuntime(): Runtime {
    if (typeof EdgeRuntime === 'string') return Runtime.EDGE;
    if (typeof process !== 'undefined') return Runtime.NODE;
    return Runtime.BROWSER;
} 