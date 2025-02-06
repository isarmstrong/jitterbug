'use client';

// Client-side utilities that depend on browser APIs

import { randomUUID } from 'crypto';

const CLIENT_ID_KEY = 'jitterbug_client_id';

/**
 * Gets or generates a unique client ID for the current session
 */
export function getClientId(): string {
    if (typeof window === 'undefined') return 'server';

    const clientId = localStorage.getItem(CLIENT_ID_KEY);
    if (!clientId) {
        const newClientId = randomUUID();
        localStorage.setItem(CLIENT_ID_KEY, newClientId);
        return newClientId;
    }
    return clientId;
} 