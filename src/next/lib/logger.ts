'use client';

import type { LogType } from '@isarmstrong/jitterbug-next';

const DEBUG_NAMESPACE = 'jitterbug:test';

interface Logger {
    info: (message: string, data?: any) => void;
    warn: (message: string, data?: any) => void;
    error: (message: string, data?: any) => void;
}

// Simple client ID generation
export const getClientId = () => {
    if (typeof window === 'undefined') return 'server';

    const storageKey = 'jitterbug_client_id';
    let clientId = localStorage.getItem(storageKey);

    if (!clientId) {
        clientId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        localStorage.setItem(storageKey, clientId);
    }

    return clientId;
};

// Direct console logging
function log(level: string, message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${DEBUG_NAMESPACE}] [${level.toUpperCase()}]`;

    // Use appropriate console methods for each level
    switch (level) {
        case 'error':
            console.error(prefix, message);
            if (data) {
                if (data instanceof Error) {
                    const { message: errMessage, stack, ...rest } = data;
                    console.error('Error details:', {
                        message: errMessage,
                        stack,
                        ...rest
                    });
                } else {
                    console.error('Additional data:', data);
                }
            }
            break;

        case 'warn':
            console.warn(prefix, message);
            if (data) console.warn('Additional data:', data);
            break;

        default:
            console.log(prefix, message);
            if (data) console.log('Additional data:', data);
            break;
    }
}

// Create logger instance with simple methods
export const logger: Logger = {
    info: (message: string, data?: any) => log('info', message, data),
    warn: (message: string, data?: any) => log('warn', message, data),
    error: (message: string, data?: any) => log('error', message, data)
};

// Export for use in other files
export default logger; 