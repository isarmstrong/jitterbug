/**
 * EBL3: Runtime Guards
 * Provides validation guards specific to SSR and Edge environments
 */

export enum RuntimeEnvironment {
    Edge = 'edge',
    SSR = 'ssr',
    Hybrid = 'hybrid'
}

export interface ValidationResult {
    isValid: boolean;
    environment: RuntimeEnvironment;
    errors?: string[];
}

export interface RuntimeGuard<T> {
    /**
     * Validates input in the current runtime environment
     * @param input The value to validate
     * @returns ValidationResult containing validation status and environment info
     */
    validate(input: T): ValidationResult;

    /**
     * Gets the current runtime environment
     * @returns The current RuntimeEnvironment
     */
    getEnvironment(): RuntimeEnvironment;
}

export class SSRGuard<T> implements RuntimeGuard<T> {
    validate(input: T): ValidationResult {
        if (input == null) {
            return {
                isValid: false,
                environment: this.getEnvironment(),
                errors: ['Input cannot be null or undefined']
            };
        }

        if (typeof window !== 'undefined') {
            return {
                isValid: false,
                environment: this.getEnvironment(),
                errors: ['SSR guards can only run on server']
            };
        }

        return {
            isValid: true,
            environment: this.getEnvironment()
        };
    }

    getEnvironment(): RuntimeEnvironment {
        return RuntimeEnvironment.SSR;
    }
}

export class EdgeGuard<T> implements RuntimeGuard<T> {
    validate(input: T): ValidationResult {
        if (input == null) {
            return {
                isValid: false,
                environment: this.getEnvironment(),
                errors: ['Input cannot be null or undefined']
            };
        }

        // Check for Edge runtime environment
        const isEdgeRuntime = process.env.EDGE_RUNTIME === 'edge-runtime';
        if (!isEdgeRuntime) {
            return {
                isValid: false,
                environment: this.getEnvironment(),
                errors: ['Not running in Edge runtime']
            };
        }

        return {
            isValid: true,
            environment: this.getEnvironment()
        };
    }

    getEnvironment(): RuntimeEnvironment {
        return RuntimeEnvironment.Edge;
    }
}

export class HybridGuard<T> implements RuntimeGuard<T> {
    private readonly ssrGuard: SSRGuard<T>;
    private readonly edgeGuard: EdgeGuard<T>;

    constructor() {
        this.ssrGuard = new SSRGuard();
        this.edgeGuard = new EdgeGuard();
    }

    validate(input: T): ValidationResult {
        if (input == null) {
            return {
                isValid: false,
                environment: this.getEnvironment(),
                errors: ['Input cannot be null or undefined']
            };
        }

        // Try Edge first, fall back to SSR
        const edgeResult = this.edgeGuard.validate(input);
        if (edgeResult.isValid) {
            return edgeResult;
        }

        const ssrResult = this.ssrGuard.validate(input);
        if (ssrResult.isValid) {
            return ssrResult;
        }

        // Neither environment is valid
        return {
            isValid: false,
            environment: this.getEnvironment(),
            errors: [
                'Failed validation in both Edge and SSR environments',
                ...(edgeResult.errors || []),
                ...(ssrResult.errors || [])
            ]
        };
    }

    getEnvironment(): RuntimeEnvironment {
        return RuntimeEnvironment.Hybrid;
    }
} 