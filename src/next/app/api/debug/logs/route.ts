import type { NextApiRequest, NextApiResponse } from "next";
import { createLogHandler } from "../../../../../../packages/jitterbug-next/api";

// Set runtime to edge
export const runtime = "edge";

// Define a type for the processLogs function parameter
type ProcessLogsType = (logs: unknown[]) => Promise<void> | void;

// Create a log handler using the re-exported function
interface LogHandler {
    (req: NextApiRequest, res: NextApiResponse): Promise<void>;
    processLogs?: ProcessLogsType;
}
const logHandler = createLogHandler() as LogHandler;

// Default export API route handler that handles all HTTP methods
export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
    if (req.method === "POST") {
        let logs: unknown[] = [];
        try {
            // Assuming req.body is already parsed
            logs = req.body as unknown[];
        } catch (error) {
            console.error("Failed to parse logs:", error);
        }
        // If logHandler has a processLogs method, call it with explicit type annotation
        if (typeof logHandler.processLogs === "function") {
            await logHandler.processLogs(logs);
        }
        res.status(200).json({ success: true });
    } else if (req.method === "OPTIONS") {
        res.status(204).end();
    } else if (req.method === "HEAD") {
        res.status(200).end();
    } else {
        res.status(200).json({ status: "ok" });
    }
} 