import { NextApiRequest, NextApiResponse } from 'next';
import { LogEntry, LogLevel } from './core';
import { TransportConfig } from './transports';

export interface APIConfig {
    level: LogLevel;
    endpoint: string;
    headers?: Record<string, string>;
}

export interface APIResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
}

export interface APIHandler<T = unknown> {
    (req: NextApiRequest, res: NextApiResponse<APIResponse<T>>): Promise<void>;
}

export interface LogAPIRequest {
    entry: LogEntry;
    config?: TransportConfig;
}

export interface LogAPIResponse {
    success: boolean;
    timestamp: string;
    entryId: string;
}

export interface ConfigAPIRequest {
    config: TransportConfig;
}

export interface ConfigAPIResponse {
    success: boolean;
    applied: boolean;
    warnings?: string[];
}

export function createAPIHandler<T>(handler: APIHandler<T>): APIHandler<T> {
    return async (req: NextApiRequest, res: NextApiResponse<APIResponse<T>>): Promise<void> => {
        try {
            await handler(req, res);
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Internal Server Error'
            });
        }
    };
}

export function createLogHandler(_config: APIConfig): APIHandler<LogAPIResponse> {
    return async (req: NextApiRequest, res: NextApiResponse<APIResponse<LogAPIResponse>>): Promise<void> => {
        const { entry: _entry } = req.body as LogAPIRequest;
        const timestamp = new Date().toISOString();
        const entryId = `${timestamp}-${Math.random().toString(36).slice(2)}`;

        res.status(200).json({
            success: true,
            data: {
                success: true,
                timestamp,
                entryId
            }
        });
    };
}

export function createConfigHandler(): APIHandler<ConfigAPIResponse> {
    return async (req: NextApiRequest, res: NextApiResponse<APIResponse<ConfigAPIResponse>>): Promise<void> => {
        const { config: _config } = req.body as ConfigAPIRequest;

        res.status(200).json({
            success: true,
            data: {
                success: true,
                applied: true
            }
        });
    };
}

export const runtime = 'edge'; 