/**
 * EBL3: Runtime Guards
 * Provides validation guards specific to SSR and Edge environments
 */

type RuntimeEnvironment = 'edge' | 'ssr' | 'hybrid';

export interface RuntimeGuard<T> {
    validate(input: T): boolean;
    getEnvironment(): RuntimeEnvironment;
}

export class SSRGuard<T> implements RuntimeGuard<T> {
    validate(input: T): boolean {
        if (typeof window !== 'undefined') {
            return false; // SSR guards should only run on server
        }
        return true;
    }

    getEnvironment(): RuntimeEnvironment {
        return 'ssr';
    }
}

export class EdgeGuard<T> implements RuntimeGuard<T> {
    validate(input: T): boolean {
        // Check for Edge runtime environment
        if (process.env.EDGE_RUNTIME !== 'edge-runtime') {
            return false;
        }
        return true;
    }

    getEnvironment(): RuntimeEnvironment {
        return 'edge';
    }
}

export class HybridGuard<T> implements RuntimeGuard<T> {
    private ssrGuard: SSRGuard<T>;
    private edgeGuard: EdgeGuard<T>;

    constructor() {
        this.ssrGuard = new SSRGuard();
        this.edgeGuard = new EdgeGuard();
    }

    validate(input: T): boolean {
        // Try Edge first, fall back to SSR
        return this.edgeGuard.validate(input) || this.ssrGuard.validate(input);
    }

    getEnvironment(): RuntimeEnvironment {
        return 'hybrid';
    }
} 