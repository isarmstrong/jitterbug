'use client';

// Client-side utilities that depend on browser APIs

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