import type { LogLevel, RuntimeType, EnvironmentType } from './core';
import { LogLevels, Runtime, Environment } from './enums';

/**
 * Type guard for checking if a value is a non-null object
 */
export const isNonNullObject = (value: unknown): value is Record<string, unknown> => {
    return typeof value === 'object' && value !== null;
};

/**
 * Type guard for checking if a value is a non-empty string
 */
export const isNonEmptyString = (value: unknown): value is string => {
    return typeof value === 'string' && value.length > 0;
};

/**
 * Type guard for checking if a value is a valid number
 */
export const isValidNumber = (value: unknown): value is number => {
    return typeof value === 'number' && !Number.isNaN(value) && Number.isFinite(value);
};

/**
 * Type guard for checking if a value is a valid LogLevel
 */
export const isLogLevel = (value: unknown): value is LogLevel => {
    return typeof value === 'string' && Object.values(LogLevels).includes(value as LogLevel);
};

/**
 * Type guard for checking if a value is a valid RuntimeType
 */
export const isRuntimeType = (value: unknown): value is RuntimeType => {
    return typeof value === 'string' && Object.values(Runtime).includes(value as RuntimeType);
};

/**
 * Type guard for checking if a value is a valid EnvironmentType
 */
export const isEnvironmentType = (value: unknown): value is EnvironmentType => {
    return typeof value === 'string' && Object.values(Environment).includes(value as EnvironmentType);
};

/**
 * Safe string conversion utility
 */
export const toSafeString = (value: unknown): string => {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' && !Number.isNaN(value)) return value.toString();
    if (typeof value === 'boolean') return value.toString();
    if (value instanceof Error) return value.message;
    if (Array.isArray(value)) return JSON.stringify(value);
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
}; 