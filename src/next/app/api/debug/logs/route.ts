import { createLogHandler } from "@jitterbug-next/api";
import { NextRequest } from "next/server";

// Set runtime to edge
export const runtime = "edge";

// Create a log handler using the re-exported function
const apiHandler = createLogHandler({
    processLogs: async (logs) => {
        console.log('Processing logs:', logs);
    }
}) as unknown as ((req: NextRequest) => Promise<Response>) & { processLogs?: (logs: unknown[]) => Promise<void> | void };

export const GET = apiHandler;
export const POST = apiHandler;
export const HEAD = apiHandler;
export const OPTIONS = apiHandler;

// Default export API route handler that handles all HTTP methods
export default async function defaultHandler(req: NextRequest): Promise<Response> {
    if (req.method === "POST") {
        const logs = await req.json();
        if (apiHandler.processLogs) {
            await apiHandler.processLogs(logs);
        }
        return new Response(JSON.stringify({ success: true }), { status: 200 });
    } else if (req.method === "OPTIONS") {
        return new Response(null, { status: 204 });
    } else if (req.method === "HEAD") {
        return new Response(null, { status: 200 });
    } else {
        return new Response(JSON.stringify({ status: "ok" }), { status: 200 });
    }
} 