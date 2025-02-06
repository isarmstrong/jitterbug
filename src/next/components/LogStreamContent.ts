import type { LogEntry } from '@isarmstrong/jitterbug/types';
import { EConnectionState } from '../hooks/useEventSource';

interface LogStreamContentProps {
    logs: LogEntry[];
    maxLogs: number;
    autoScroll: boolean;
    showTimestamp: boolean;
    showLevel: boolean;
    status: EConnectionState;
}

export function LogStreamContent({
    logs,
    maxLogs,
    autoScroll,
    showTimestamp,
    showLevel,
    status,
}: LogStreamContentProps) {
    const displayLogs = logs.slice(-maxLogs);

    return (
        <div className= "space-y-4 p-4" >
        <div className="space-y-2" >
        {
            displayLogs.map((log, idx) => (
                <div key= { idx } className = {`p-3 bg-white shadow rounded ${getLogLevelClass(log.level)}`} >
            <div className="flex items-center gap-2" >
                { showLevel && (
                    <span className="text-sm font-semibold" > { log.level } </span>
              )
}
{
    showTimestamp && (
        <span className="text-sm text-gray-500" >
            { new Date(log.context.timestamp).toLocaleTimeString() }
            </span>
              )
}
</div>
    < pre className = "whitespace-pre-wrap overflow-auto mt-2" >
        { log.message }
{
    log.data && (
        <>
        { '\n'}
                  { JSON.stringify(log.data, null, 2) }
    </>
              )
}
{
    log.error && (
        <>
        { '\n'}
                  Error: { log.error.message }
    {
        log.error.stack && (
            <>
            { '\n'}
                      Stack: { log.error.stack }
        </>
                  )
    }
    </>
              )
}
</pre>
    </div>
        ))}
</div>

    < div className = "text-sm text-gray-500" >
        { status === EConnectionState.CONNECTED ? (
            <span className= "text-green-600" >● Connected </span>
        ) : status === EConnectionState.CONNECTING ? (
    <span className= "text-yellow-600" >◌ Connecting...</span>
        ) : status === EConnectionState.FAILED ? (
    <span className= "text-red-600" >✕ Connection Error </span>
        ) : (
    <span className= "text-gray-600" >○ Disconnected </span>
        )}
</div>
    </div>
  );
}

function getLogLevelClass(level: string): string {
    switch (level.toLowerCase()) {
        case 'debug':
            return 'border-l-4 border-gray-300';
        case 'info':
            return 'border-l-4 border-blue-300';
        case 'warn':
            return 'border-l-4 border-yellow-300';
        case 'error':
            return 'border-l-4 border-red-300';
        case 'fatal':
            return 'border-l-4 border-red-500 bg-red-50';
        default:
            return '';
    }
} 