'use client';

import type { LogType } from '@/types/index';
import React, { useEffect, useState } from 'react';
import { EConnectionState, useEventSource } from '../hooks/useEventSource';

export const LogStream: React.FC = () => {
    const { status, messages, error } = useEventSource();
    const [lastHeartbeat, setLastHeartbeat] = useState<number>(Date.now());

    useEffect(() => {
        // Update heartbeat when we receive messages
        if (messages.length > 0) {
            setLastHeartbeat(Date.now());
        }
    }, [messages]);

    // Format time since last heartbeat
    const getTimeSinceLastHeartbeat = () => {
        const seconds = Math.floor((Date.now() - lastHeartbeat) / 1000);
        return `${seconds}s ago`;
    };

    return (
        <div className="space-y-4 p-4">
            <div className="flex justify-between items-center bg-gray-100 p-4 rounded">
                <div>
                    <h3 className="font-semibold">
                        Connection Status: {status}
                    </h3>
                    <p className="text-sm text-gray-600">
                        Last heartbeat: {getTimeSinceLastHeartbeat()}
                    </p>
                </div>
                {error && (
                    <div className="text-red-600">
                        {error.message}
                    </div>
                )}
            </div>

            <div className="space-y-2">
                {messages.map((msg: LogType, idx: number) => (
                    <div key={idx} className="p-3 bg-white shadow rounded">
                        <pre className="whitespace-pre-wrap overflow-auto">
                            {JSON.stringify(msg, null, 2)}
                        </pre>
                    </div>
                ))}
            </div>

            <div className="text-sm text-gray-500">
                {status === EConnectionState.CONNECTED ? (
                    <span className="text-green-600">● Connected</span>
                ) : status === EConnectionState.CONNECTING ? (
                    <span className="text-yellow-600">◌ Connecting...</span>
                ) : status === EConnectionState.FAILED ? (
                    <span className="text-red-600">✕ Connection Error</span>
                ) : (
                    <span className="text-gray-600">○ Disconnected</span>
                )}
            </div>
        </div>
    );
}; 