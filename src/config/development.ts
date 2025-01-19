import { JitterbugConfig, Runtime, Environment } from '../types';
import { GUITransport } from '../transports/gui';
import { ConsoleTransport } from '../transports/console';
import { SanitizeProcessor } from '../processors/sanitize';

/**
 * Default development configuration for Jitterbug
 * Automatically sets up console and GUI transports with debug level
 */
export const developmentConfig: Partial<JitterbugConfig> = {
    environment: Environment.DEVELOPMENT,
    level: 'debug',
    enabled: true,
    processors: [
        new SanitizeProcessor({
            sensitiveKeys: ['password', 'token', 'secret', 'key'],
        }),
    ],
    transports: [
        new ConsoleTransport(),
        new GUITransport({
            edge: {
                endpoint: '/api/debug',
            },
        }),
    ],
};

/**
 * Helper to create a development debug instance with the default configuration
 */
export function createDevDebug(namespace: string, config: Partial<JitterbugConfig> = {}) {
    return createJitterbug({
        ...developmentConfig,
        namespace,
        ...config,
    });
}

// Re-export for convenience
export { createJitterbug } from '../core'; 