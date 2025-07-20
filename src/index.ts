/**
 * Jitterbug - Edge-first debugging system for Next.js
 * Version 0.2.0
 * 
 * Stable public API surface - Re-exports from curated public.ts barrel
 * 
 * Node.js 20+ required (optimized for Node 22)
 * Compatible with React 18 & 19 (SSE implementation will need shimming)
 */

// Export stable public API from curated barrel
export * from './public.js';

export const VERSION = '0.2.0';