'use client';

import { useEffect, useState } from 'react';
import type { ConnectionState, LogType, SerializedLogType, isSerializedErrorLog } from '../../types';
import { getClientId } from '../lib/logger';

type EventSourceStatus = ConnectionState;

interface UseEventSourceResult {
    status: EventSourceStatus;
    messages: LogType[];
    error: Error | null;
}

export function useEventSource(): UseEventSourceResult {
    const [status, setStatus] = useState<EventSourceStatus>('CLOSED');
    const [messages, setMessages] = useState<LogType[]>([]);
    const [error, setError] = useState<Error | null>(null);
    const [eventSource, setEventSource] = useState<EventSource | null>(null);

    useEffect(() => {
        const clientId = getClientId();
        const url = `/api/debug/logs/${clientId}`;

        const es = new EventSource(url);
        setEventSource(es);
        setStatus('CONNECTING');

        es.onopen = () => {
            setStatus('OPEN');
            setError(null);
        };

        es.onerror = (e) => {
            setStatus('ERROR');
            setError(new Error('EventSource failed to connect'));
            es.close();
        };

        es.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data) as SerializedLogType;
                const logEntry: LogType = isSerializedErrorLog(data)
                    ? {
                        ...data,
                        error: new Error(data.errorMessage),
                        stack: data.errorStack
                    }
                    : data;
                setMessages(prev => [...prev, logEntry]);
            } catch (e) {
                console.error('Failed to parse message:', e);
            }
        };

        return () => {
            es.close();
            setStatus('CLOSED');
        };
    }, []);

    return { status, messages, error };
}
