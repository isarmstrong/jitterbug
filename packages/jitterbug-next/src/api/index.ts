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
export function createLogHandler(config: LogHandlerConfig = {}): LogHandlerResponse {
    const corsHeaders: Record<string, string> = config.cors ? {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, HEAD',
        'Access-Control-Allow-Headers': 'Content-Type'
    } : {};

    const handler = {
        async GET() {
            return new Response(JSON.stringify({ status: 'ok' }), {
                headers: {
                    'Content-Type': 'application/json',
                    ...corsHeaders
                }
            });
        },

        async POST(request: Request) {
            try {
                const logs = await request.json();

                // Process logs if custom processor provided
                if (config.processLogs) {
                    await config.processLogs(logs);
                } else {
                    // Default behavior: log to console in development
                    if (process.env.NODE_ENV !== 'production') {
                        console.log('Received logs:', logs);
                    }
                }

                return new Response(JSON.stringify({ success: true }), {
                    headers: {
                        'Content-Type': 'application/json',
                        ...corsHeaders
                    }
                });
            } catch (error) {
                console.error('Error processing logs:', error);
                return new Response(
                    JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to process logs' }),
                    {
                        status: 500,
                        headers: {
                            'Content-Type': 'application/json',
                            ...corsHeaders
                        }
                    }
                );
            }
        },

        async HEAD() {
            return new Response(null, {
                status: 200,
                headers: corsHeaders
            });
        },

        async OPTIONS() {
            return new Response(null, {
                status: 204,
                headers: corsHeaders
            });
        }
    };

    // Bind all methods to the handler object
    return {
        GET: handler.GET.bind(handler),
        POST: handler.POST.bind(handler),
        HEAD: handler.HEAD.bind(handler),
        OPTIONS: handler.OPTIONS.bind(handler)
    };
}

// Set runtime to edge for better performance
export const runtime = 'edge'; 