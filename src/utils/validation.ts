import type { EnvironmentType, RuntimeType } from '../types/core';
import type { ValidationResult } from '../types/ebl/core';
import { isString } from './type-guards';

/**
 * Type predicate to check if a value is a non-null object
 */
export function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Type predicate to check if a value is a string
 */
export function isString(value: unknown): value is string {
    return typeof value === 'string';
}

/**
 * Type predicate to check if a value is a number
 */
export function isNumber(value: unknown): value is number {
    return typeof value === 'number' && !isNaN(value);
}

/**
 * Type predicate to check if a value is a boolean
 */
export function isBoolean(value: unknown): value is boolean {
    return typeof value === 'boolean';
}

/**
 * Type predicate to check if a value is an Error
 */
export function isError(value: unknown): value is Error {
    return value instanceof Error;
}

/**
 * Type guard for runtime type validation
 */
export function isValidRuntime(value: unknown): value is RuntimeType {
    return isString(value) && ['EDGE', 'NODE', 'BROWSER'].includes(value);
}

/**
 * Type guard for environment type validation
 */
export function isValidEnvironment(value: unknown): value is EnvironmentType {
    return isString(value) && ['DEVELOPMENT', 'STAGING', 'PRODUCTION', 'TEST'].includes(value);
}

/**
 * Validates an object against a schema
 */
export function validateSchema<T extends Record<string, unknown>>(
    obj: unknown,
    schema: Record<keyof T, (value: unknown) => boolean>
): ValidationResult {
    if (!isObject(obj)) {
        return {
            isValid: false,
            errors: ['Value must be an object']
        };
    }

    const errors: string[] = [];

    for (const [key, validator] of Object.entries(schema)) {
        if (key in obj) {
            if (!validator(obj[key])) {
                errors.push(`Invalid value for field '${key}'`);
            }
        } else {
            errors.push(`Missing required field '${key}'`);
        }
    }

    return {
        isValid: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined
    };
}

/**
 * Creates a type-safe validator for a specific type
 */
export function createValidator<T>(
    predicate: (value: unknown) => value is T,
    errorMessage: string
): (value: unknown) => ValidationResult {
    return (value: unknown): ValidationResult => {
        if (predicate(value)) {
            return { isValid: true };
        }
        return {
            isValid: false,
            errors: [errorMessage]
        };
    };
}

/**
 * Combines multiple validators into a single validator
 */
export function combineValidators<T>(
    validators: Array<(value: unknown) => ValidationResult>
): (value: unknown) => ValidationResult {
    return (value: unknown): ValidationResult => {
        const errors: string[] = [];

        for (const validator of validators) {
            const result = validator(value);
            if (!result.isValid && result.errors) {
                errors.push(...result.errors);
            }
        }

        return {
            isValid: errors.length === 0,
            errors: errors.length > 0 ? errors : undefined
        };
    };
}

/**
 * Creates a validator for optional fields
 */
export function optional<T>(
    validator: (value: unknown) => ValidationResult
): (value: unknown) => ValidationResult {
    return (value: unknown): ValidationResult => {
        if (value === undefined) {
            return { isValid: true };
        }
        return validator(value);
    };
}

/**
 * Creates a validator for array fields
 */
export function arrayOf<T>(
    validator: (value: unknown) => ValidationResult
): (value: unknown) => ValidationResult {
    return (value: unknown): ValidationResult => {
        if (!Array.isArray(value)) {
            return {
                isValid: false,
                errors: ['Value must be an array']
            };
        }

        const errors: string[] = [];

        for (let i = 0; i < value.length; i++) {
            const result = validator(value[i]);
            if (!result.isValid && result.errors) {
                errors.push(`Invalid array element at index ${i}: ${result.errors.join(', ')}`);
            }
        }

        return {
            isValid: errors.length === 0,
            errors: errors.length > 0 ? errors : undefined
        };
    };
} 