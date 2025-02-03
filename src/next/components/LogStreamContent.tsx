'use client';

import type { LogType } from '@/types/index';
import React from 'react';
import { useEventSource } from '../hooks/useEventSource';
import { logger } from '../lib/logger';

export const LogStreamContent: React.FC = () => {
    const { status, messages = [], error } = useEventSource();

    React.useEffect(() => {
        // Log connection status changes
        logger.info(`SSE Connection Status: ${status}`);
        if (error) {
            logger.error('SSE Connection Error', error);
        }
    }, [status, error]);

    return (
        <div className="space-y-4">
            <div className="p-4 bg-gray-100 rounded">
                <h3 className="font-semibold">Connection Status: {status}</h3>
                {error && (
                    <p className="text-red-600 mt-2">{error.message}</p>
                )}
            </div>

            <div className="space-y-2">
                {messages.map((msg: LogType, idx: number) => (
                    <div key={idx} className="p-3 bg-white shadow rounded">
                        <pre className="whitespace-pre-wrap">{JSON.stringify(msg, null, 2)}</pre>
                    </div>
                ))}
            </div>
        </div>
    );
}; 