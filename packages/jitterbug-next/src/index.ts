// Export core functionality
export {
    createJitterbugLogger,
    EdgeTransport,
    ErrorAggregationProcessor,
    MetricsProcessor,
    Environment,
    Runtime
} from './logger';

// Export SSE transport
export { createSSETransport } from './transports/sse/factory';
export type { SSETransportConfig } from './types';

// Export types
export type {
    NextLoggerConfig,
} from './types';

// Export utilities
export * from './utils';

// Export handlers
export * from './handlers';

// Debug panel is opt-in
export const debug = {
    /**
     * Get the Jitterbug debug panel components.
     * 
     * @example
     * Simple usage - copy the debug route to your app:
     * ```typescript
     * // app/debug/page.tsx
     * import { debug } from '@isarmstrong/jitterbug-next';
     * 
     * export default async function DebugPage() {
     *   const { DebugPanel } = await debug.getDebugComponents();
     *   return <DebugPanel />;
     * }
     * ```
     * 
     * This will make the debug panel available at /debug in your Next.js app.
     * 
     * Custom integration:
     * ```typescript
     * // app/your-path/page.tsx
     * import { debug } from '@isarmstrong/jitterbug-next';
     * 
     * export default async function CustomPage() {
     *   const { DebugPanel } = await debug.getDebugComponents();
     *   return (
     *     <div className="your-wrapper">
     *       <DebugPanel />
     *     </div>
     *   );
     * }
     * ```
     * 
     * @returns Promise containing the DebugPanel component
     */
    async getDebugComponents() {
        if (process.env.NODE_ENV === 'production') {
            console.warn('Jitterbug debug panel is not recommended for production use');
        }
        const { DebugPanel } = await import('./components/debug/DebugPanel');
        return { DebugPanel };
    }
}; 