import { createJitterbug } from '../core';
import { SanitizeProcessor } from '../processors/sanitize';
import { ConsoleTransport } from '../transports/console';
import { GUITransport } from '../transports/gui';
import { Environment, JitterbugConfig, JitterbugInstance, LogLevels } from '../types';

/**
 * Default development configuration for Jitterbug
 * Automatically sets up console and GUI transports with debug level
 */
export const developmentConfig: Partial<JitterbugConfig> = {
    environment: Environment.DEVELOPMENT,
    level: LogLevels.DEBUG,
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
export function createDevDebug(namespace: string, config: Partial<JitterbugConfig> = {}): JitterbugInstance {
    return createJitterbug({
        ...developmentConfig,
        namespace,
        ...config,
    });
}

// Re-export for convenience
export { createJitterbug };
