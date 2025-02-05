'use client';

import type { LogType } from '@isarmstrong/jitterbug-types';
import { useEffect, useState } from 'react';
import { getClientId } from '../lib/client';

// Add missing type and type guard for SerializedLogType
interface SerializedLogType {
    message: string;
    level: "DEBUG" | "INFO" | "WARN" | "ERROR" | "FATAL";
    timestamp: number;
    errorMessage?: string;
    errorStack?: string;
    [key: string]: unknown;
}

function isSerializedErrorLog(log: SerializedLogType): log is SerializedLogType & { errorMessage: string; errorStack: string } {
    return typeof log.errorMessage === 'string' && typeof log.errorStack === 'string';
}

export enum EConnectionState {
    CONNECTING = 'CONNECTING',
    CONNECTED = 'CONNECTED',
    FAILED = 'FAILED',
    DISCONNECTED = 'DISCONNECTED'
}

type EventSourceStatus = EConnectionState;

interface UseEventSourceResult {
    status: EventSourceStatus;
    messages: LogType[];
    error: Error | null;
}

export function useEventSource(): UseEventSourceResult {
    const [status, setStatus] = useState<EConnectionState>(EConnectionState.DISCONNECTED);
    const [messages, setMessages] = useState<LogType[]>([]);
    const [error, setError] = useState<Error | null>(null);
    const [eventSource, setEventSource] = useState<EventSource | null>(null);

    useEffect(() => {
        const clientId = getClientId();
        const url = `/api/debug/logs/${clientId}`;

        const es = new EventSource(url);
        setEventSource(es);
        setStatus(EConnectionState.CONNECTING);

        es.onopen = () => {
            setStatus(EConnectionState.CONNECTED);
            setError(null);
        };

        es.onerror = (e) => {
            setStatus(EConnectionState.FAILED);
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
                        stack: data.errorStack,
                        timestamp: data.timestamp.toString()
                    }
                    : { ...data, timestamp: data.timestamp.toString() };
                setMessages(prev => [...prev, logEntry]);
            } catch (e) {
                console.error('Failed to parse message:', e);
            }
        };

        return () => {
            es.close();
            setStatus(EConnectionState.DISCONNECTED);
        };
    }, []);

    return { status, messages, error };
}
