declare global {
    const EdgeRuntime: string | undefined;
    interface Window {
        EdgeRuntime?: string;
    }
    interface globalThis {
        EdgeRuntime?: string;
    }
}

export { };
