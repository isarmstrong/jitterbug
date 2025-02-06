import type { LogType } from '@isarmstrong/jitterbug-types';
import React from "react";

export interface LogStreamContentProps {
    className?: string;
    logs: LogType[];
    maxHeight?: string;
    autoScroll?: boolean;
    filter?: (log: LogType) => boolean;
    onLogClick?: (log: LogType) => void;
    formatTimestamp?: (timestamp: string) => string;
}

interface LogErrorDisplay {
    message: string;
    stack?: string;
}

interface LogEntryProps {
    log: LogType;
    onClick?: (log: LogType) => void;
    formatTimestamp: (timestamp: string) => string;
}

function isError(error: unknown): error is Error {
    return error instanceof Error;
}

function isLogErrorDisplay(error: unknown): error is LogErrorDisplay {
    return typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string';
}

function getErrorMessage(error: unknown): string {
    if (isError(error) || isLogErrorDisplay(error)) {
        return error.message;
    }
    return String(error);
}

function getErrorStack(error: unknown): string | undefined {
    if (isError(error) || isLogErrorDisplay(error)) {
        return error.stack;
    }
    return undefined;
}

const ErrorDisplay: React.FC<{ error: unknown }> = ({ error }): JSX.Element => {
    const message = getErrorMessage(error);
    const stack = getErrorStack(error);

    return React.createElement(
        React.Fragment,
        null,
        React.createElement(
            "div",
            {
                className: "log-error",
                style: {
                    color: '#dc3545',
                    marginTop: '0.25rem',
                    fontSize: '0.9em'
                }
            },
            message
        ),
        stack && React.createElement(
            "pre",
            {
                className: "log-stack",
                style: {
                    marginTop: '0.25rem',
                    fontSize: '0.8em',
                    whiteSpace: 'pre-wrap'
                }
            },
            stack
        )
    );
};

const LogEntry: React.FC<LogEntryProps> = ({
    log,
    onClick,
    formatTimestamp
}): JSX.Element => {
    const handleClick = React.useCallback(() => {
        onClick?.(log);
    }, [log, onClick]);

    return React.createElement(
        "div",
        {
            className: `log-entry log-level-${log.level.toLowerCase()}`,
            onClick: handleClick,
            style: {
                cursor: onClick ? 'pointer' : 'default',
                padding: '0.25rem 0',
                borderBottom: '1px solid rgba(0,0,0,0.1)'
            }
        },
        React.createElement(
            "div",
            {
                className: "log-timestamp",
                style: {
                    color: '#666',
                    fontSize: '0.8em'
                }
            },
            formatTimestamp(log.timestamp)
        ),
        React.createElement(
            "div",
            {
                className: "log-message",
                style: {
                    marginTop: '0.25rem'
                }
            },
            log.message
        ),
        log.error ? React.createElement(ErrorDisplay, { error: log.error }) : null
    );
};

export const LogStreamContent: React.FC<LogStreamContentProps> = ({
    className = 'log-stream-content',
    logs = [],
    maxHeight = '400px',
    autoScroll = true,
    filter = (): boolean => true,
    onLogClick,
    formatTimestamp = (ts: string): string => new Date(ts).toLocaleString()
}): JSX.Element => {
    const containerRef = React.useRef<HTMLDivElement>(null);

    React.useEffect((): void => {
        if (autoScroll && containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
    }, [logs, autoScroll]);

    const filteredLogs = React.useMemo((): LogType[] => logs.filter(filter), [logs, filter]);

    return React.createElement(
        "div",
        {
            ref: containerRef,
            className,
            style: {
                maxHeight,
                overflowY: 'auto',
                padding: '1rem',
                fontFamily: 'monospace'
            }
        },
        filteredLogs.map((log, index) =>
            React.createElement(LogEntry, {
                key: `${log.timestamp}-${index}`,
                log,
                onClick: onLogClick,
                formatTimestamp
            })
        )
    );
}; 