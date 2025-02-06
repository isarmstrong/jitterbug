import { NextRequest } from 'next/server';
import { createHandler } from '../../../../../../packages/jitterbug-next/src/api';

// Set runtime to edge
export const runtime = "edge";

const apiHandler = createHandler();

export const GET = apiHandler;
export const POST = apiHandler;
export const HEAD = apiHandler;
export const OPTIONS = apiHandler;

// Default export API route handler that handles all HTTP methods
export default async function defaultHandler(req: NextRequest): Promise<Response> {
    if (req.method === "POST") {
        // Parse the logs but do not process them as processLogs is not supported
        await req.json();
        return new Response(JSON.stringify({ success: true }), { status: 200 });
    } else if (req.method === "OPTIONS") {
        return new Response(null, { status: 204 });
    } else if (req.method === "HEAD") {
        return new Response(null, { status: 200 });
    } else {
        return new Response(JSON.stringify({ status: "ok" }), { status: 200 });
    }
} 