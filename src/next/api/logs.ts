import { NextRequest, NextResponse } from 'next/server';
import type { LogType } from '../../types/logs';

export interface LogHandlerConfig {
    processLogs: (logs: LogType[]) => Promise<void>;
    validateClientId?: (clientId: string) => Promise<boolean>;
}

export function createLogHandler(config: LogHandlerConfig): (req: NextRequest) => Promise<NextResponse> {
    return async function handler(req: NextRequest): Promise<NextResponse> {
        try {
            const logs = await req.json() as LogType[];

            if (!Array.isArray(logs)) {
                return NextResponse.json({ error: 'Invalid log format' }, { status: 400 });
            }

            await config.processLogs(logs);
            return NextResponse.json({ success: true });
        } catch (error) {
            console.error('Error processing logs:', error);
            return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
        }
    };
} 