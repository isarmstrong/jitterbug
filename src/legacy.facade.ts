/*
 * Legacy Facade for '@isarmstrong/jitterbug'.
 *
 * This file re-exports legacy members from the new consolidated packages.
 * This temporary facade preserves the old import contract while we transition
 * to direct new imports in the future.
 */

import { ConsoleTransport, createJitterbug, EdgeTransport } from "./index";

// Re-export members from the current index file instead of deep package paths
export { ConsoleTransport, createJitterbug, EdgeTransport } from "./index";

// Legacy type stubs
export type LogContext = Record<string, unknown>;
export type ProcessedLogEntry = Record<string, unknown>;

// Legacy constants
export const LogLevels = {
    INFO: 'info',
    WARN: 'warn',
    ERROR: 'error',
    DEBUG: 'debug'
};

// Default export for legacy facade with explicit type annotation
const legacy: {
    ConsoleTransport: typeof ConsoleTransport;
    createJitterbug: typeof createJitterbug;
    EdgeTransport: typeof EdgeTransport;
    LogLevels: { INFO: string; WARN: string; ERROR: string; DEBUG: string; };
} = { ConsoleTransport, createJitterbug, EdgeTransport, LogLevels };
export default legacy; 