/* ====================================================================
 * EBL1: Validation Strategy Hierarchy
 * ====================================================================
 *
 * This module defines the hierarchy of validation strategies for the Edge Boundary Layer.
 */

import type { EdgeBoundaryLayer, TelemetryHandler, ValidationResult } from './core';

// Define validation priority levels
export const enum ValidationPriority {
    Strict = 1,
    Lenient = 2,
    Custom = 3
}

// Define validation strategy configuration
export interface ValidationStrategyConfig {
    readonly priority: ValidationPriority;
    readonly allowPartialValidation?: boolean;
    readonly maxRetries?: number;
    readonly timeoutMs?: number;
}

export interface ValidationStrategy extends EdgeBoundaryLayer {
    /**
     * Returns the priority of this validation strategy
     * @returns The priority level of the strategy
     */
    getPriority(): ValidationPriority;

    /**
     * Gets the current strategy configuration
     * @returns The current ValidationStrategyConfig
     */
    getConfig(): ValidationStrategyConfig;
}

export abstract class BaseValidationStrategy implements ValidationStrategy {
    protected readonly telemetryHandler?: TelemetryHandler;
    protected readonly config: ValidationStrategyConfig;

    constructor(config: Partial<ValidationStrategyConfig> = {}) {
        this.config = {
            priority: config.priority ?? ValidationPriority.Custom,
            allowPartialValidation: config.allowPartialValidation ?? false,
            maxRetries: config.maxRetries ?? 1,
            timeoutMs: config.timeoutMs ?? 5000
        };
    }

    abstract getPriority(): ValidationPriority;

    getConfig(): ValidationStrategyConfig {
        return { ...this.config };
    }

    validate<T>(input: T): ValidationResult {
        if (input == null) {
            return {
                isValid: false,
                errors: ['Input cannot be null or undefined']
            };
        }

        // Base implementation always returns valid
        return {
            isValid: true
        };
    }

    process<T>(input: T): T {
        const result = this.validate(input);
        if (!result.isValid) {
            throw new Error(result.errors?.join(', ') ?? 'Validation failed');
        }
        return input;
    }

    setTelemetryHandler(handler: TelemetryHandler | undefined): void {
        Object.defineProperty(this, 'telemetryHandler', {
            value: handler,
            writable: false,
            configurable: false
        });
    }

    clearCache(): void {
        // Optional implementation
    }

    protected reportTelemetry(event: string, data?: Record<string, unknown>): void {
        if (this.telemetryHandler) {
            this.telemetryHandler(event, data);
        }
    }
}

export class StrictValidationStrategy extends BaseValidationStrategy {
    constructor(config: Partial<ValidationStrategyConfig> = {}) {
        super({
            ...config,
            priority: ValidationPriority.Strict,
            allowPartialValidation: false
        });
    }

    getPriority(): ValidationPriority {
        return ValidationPriority.Strict;
    }

    validate<T>(input: T): ValidationResult {
        const baseResult = super.validate(input);
        if (!baseResult.isValid) {
            return baseResult;
        }

        // Strict validation for object structure
        if (typeof input === 'object' && input !== null) {
            const errors: string[] = [];

            // Check for null values in object properties
            Object.entries(input as Record<string, unknown>).forEach(([key, value]) => {
                if (value === null) {
                    errors.push(`Property '${key}' cannot be null in strict mode`);
                }
            });

            if (errors.length > 0) {
                return {
                    isValid: false,
                    errors,
                    metadata: {
                        strategy: 'strict',
                        timestamp: Date.now()
                    }
                };
            }
        }

        return {
            isValid: true,
            metadata: {
                strategy: 'strict',
                timestamp: Date.now()
            }
        };
    }
}

export class LenientValidationStrategy extends BaseValidationStrategy {
    constructor(config: Partial<ValidationStrategyConfig> = {}) {
        super({
            ...config,
            priority: ValidationPriority.Lenient,
            allowPartialValidation: true
        });
    }

    getPriority(): ValidationPriority {
        return ValidationPriority.Lenient;
    }

    validate<T>(input: T): ValidationResult {
        const baseResult = super.validate(input);
        const allowPartial = this.config.allowPartialValidation === true;

        if (!baseResult.isValid && !allowPartial) {
            return baseResult;
        }

        // Add lenient validation logic here
        return {
            isValid: true,
            metadata: {
                strategy: 'lenient',
                timestamp: Date.now(),
                partialValidation: !baseResult.isValid
            }
        };
    }
} 