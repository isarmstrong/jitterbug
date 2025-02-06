'use client';

import type { LogEntry } from '@isarmstrong/jitterbug/types';
import { useEventSource } from '../hooks/useEventSource';
import { LogStreamContent } from './LogStreamContent';

interface LogStreamProps {
    maxLogs?: number;
    autoScroll?: boolean;
    showTimestamp?: boolean;
    showLevel?: boolean;
}

export function LogStream({
    maxLogs = 100,
    autoScroll = true,
    showTimestamp = true,
    showLevel = true,
}: LogStreamProps) {
    const { status, messages, error } = useEventSource();
    const logs = messages as LogEntry[];

    if (error) {
        return <div>Error: {error.message}</div>;
    }

    return (
        <LogStreamContent
            logs={logs}
            maxLogs={maxLogs}
            autoScroll={autoScroll}
            showTimestamp={showTimestamp}
            showLevel={showLevel}
            status={status}
        />
    );
} 