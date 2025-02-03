import type { NextApiRequest, NextApiResponse } from 'next';

export interface LogHandlerConfig {
    /**
     * Whether to enable CORS
     */
    cors?: boolean;
    /**
     * Custom log processor function
     */
    processLogs?: (logs: unknown[]) => Promise<void> | void;
}

export type LogHandlerResponse = {
    GET: (request: Request) => Promise<Response>;
    POST: (request: Request) => Promise<Response>;
    HEAD: () => Promise<Response>;
    OPTIONS: () => Promise<Response>;
};

/**
 * Creates a Next.js API route handler for Jitterbug logs
 */
export const createLogHandler = () => {
    return async (req: NextApiRequest, res: NextApiResponse): Promise<void> => {
        // Dummy log handler implementation
        res.status(200).json({ message: 'Log handler response (stub)' });
    };
};

// Set runtime to edge for better performance
export const runtime = 'edge'; 