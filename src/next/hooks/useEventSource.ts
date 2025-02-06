'use client';

import type { LogEntry } from '@isarmstrong/jitterbug/types';
import { useEffect, useState } from 'react';
import { getClientId } from '../lib/client';

interface SerializedLogType {
    message: string;
    level: "DEBUG" | "INFO" | "WARN" | "ERROR" | "FATAL";
    timestamp: number;
    errorMessage?: string;
    errorStack?: string;
    [key: string]: unknown;
}

interface SSEEvent extends MessageEvent {
    type: 'message' | 'error' | 'open';
    data: string;
    lastEventId: string;
}

function isSSEEvent(event: Event): event is SSEEvent {
    return event instanceof MessageEvent &&
        ['message', 'error', 'open'].includes(event.type) &&
        typeof event.data === 'string';
}

function isSerializedLogType(data: unknown): data is SerializedLogType {
    if (!data || typeof data !== 'object') return false;

    const candidate = data as Partial<SerializedLogType>;
    return (
        typeof candidate.message === 'string' &&
        typeof candidate.level === 'string' &&
        ['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'].includes(candidate.level) &&
        typeof candidate.timestamp === 'number'
    );
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
    messages: LogEntry[];
    error: Error | null;
}

export function useEventSource(): UseEventSourceResult {
    const [status, setStatus] = useState<EConnectionState>(EConnectionState.DISCONNECTED);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [error, setError] = useState<Error | null>(null);
    const [eventSource, setEventSource] = useState<EventSource | null>(null);

    useEffect((): (() => void) => {
        const clientId = getClientId();
        const url = `/api/debug/logs/${clientId}`;

        const es = new EventSource(url);
        setEventSource(es);
        setStatus(EConnectionState.CONNECTING);

        const handleOpen = (): void => {
            setStatus(EConnectionState.CONNECTED);
            setError(null);
        };

        const handleError = (event: Event): void => {
            setStatus(EConnectionState.FAILED);
            if (isSSEEvent(event)) {
                setError(new Error(`EventSource failed: ${event.data}`));
            } else {
                setError(new Error('EventSource failed to connect'));
            }
            es.close();
        };

        const handleMessage = (event: MessageEvent): void => {
            try {
                const log = JSON.parse(event.data) as LogEntry;
                if (!isSerializedLogType(log)) {
                    console.error('Invalid log data received:', log);
                    return;
                }

                setLogs(prev => [...prev, log]);
            } catch (e) {
                console.error('Failed to parse message:', e);
                if (e instanceof Error) {
                    setError(e);
                }
            }
        };

        es.addEventListener('open', handleOpen);
        es.addEventListener('error', handleError);
        es.addEventListener('message', handleMessage);

        return (): void => {
            es.removeEventListener('open', handleOpen);
            es.removeEventListener('error', handleError);
            es.removeEventListener('message', handleMessage);
            if (eventSource) {
                eventSource.close();
            }
            setStatus(EConnectionState.DISCONNECTED);
        };
    }, [eventSource]);

    return { status, messages: logs, error };
}
