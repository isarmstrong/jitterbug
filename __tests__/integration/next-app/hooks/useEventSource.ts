import { useState, useEffect } from 'react';
import type { LogType } from '@jitterbug-next';
import { getClientId, logger } from '../lib/logger';

export type EventSourceStatus = 'CONNECTING' | 'OPEN' | 'CLOSED' | 'ERROR';

export const useEventSource = () => {
    const [status, setStatus] = useState<EventSourceStatus>('CLOSED');
    const [messages, setMessages] = useState<LogType[]>([]);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const clientId = getClientId();
        const url = `/api/logs/${clientId}`;
        logger.info('Initializing EventSource', { url });

        const eventSource = new EventSource(url);
        setStatus('CONNECTING');

        eventSource.onopen = () => {
            logger.info('EventSource connected');
            setStatus('OPEN');
            setError(null);
        };

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data) as LogType;
                logger.info('Received message', data);
                setMessages(prev => [...prev, data]);
            } catch (err) {
                logger.error('Failed to parse message', err);
            }
        };

        eventSource.onerror = () => {
            const err = new Error('EventSource connection failed');
            logger.error('Connection error', err);
            setStatus('ERROR');
            setError(err);
            eventSource.close();
        };

        return () => {
            logger.info('Cleaning up EventSource');
            eventSource.close();
            setStatus('CLOSED');
        };
    }, []);

    return { status, messages, error };
}; 