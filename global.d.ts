/*
 * Global type declarations for Jitterbug
 * Ensuring that core types remain centralized and unified
 */

declare module '@isarmstrong/jitterbug' {
    // Re-export all core type definitions from the centralized core-types package
    export * from './packages/core-types/src';
}

declare module '@isarmstrong/jitterbug-types' {
    // Re-export all type definitions from the jitterbug-types package
    export * from './packages/jitterbug-types/src';
}

// Global declaration for EdgeRuntime
declare global {
    var EdgeRuntime: string | undefined;
}

export { };

