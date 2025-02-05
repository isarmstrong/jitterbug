import { describe, expect, it } from 'vitest';
import { isString } from '../../src/utils/type-guards';
import {
    arrayOf,
    combineValidators,
    createValidator,
    isBoolean,
    isError,
    isNumber,
    isObject,
    isValidEnvironment,
    isValidRuntime,
    optional,
    validateSchema
} from '../../src/utils/validation';

describe('Type Predicates', () => {
    describe('isObject', () => {
        it('validates objects correctly', () => {
            expect(isObject({})).toBe(true);
            expect(isObject({ key: 'value' })).toBe(true);
            expect(isObject(null)).toBe(false);
            expect(isObject([])).toBe(false);
            expect(isObject('string')).toBe(false);
            expect(isObject(123)).toBe(false);
        });
    });

    describe('isString', () => {
        it('validates strings correctly', () => {
            expect(isString('')).toBe(true);
            expect(isString('test')).toBe(true);
            expect(isString(String('test'))).toBe(true);
            expect(isString(123)).toBe(false);
            expect(isString({})).toBe(false);
            expect(isString(null)).toBe(false);
        });
    });

    describe('isNumber', () => {
        it('validates numbers correctly', () => {
            expect(isNumber(0)).toBe(true);
            expect(isNumber(123)).toBe(true);
            expect(isNumber(-123.45)).toBe(true);
            expect(isNumber(NaN)).toBe(false);
            expect(isNumber('123')).toBe(false);
            expect(isNumber(null)).toBe(false);
        });
    });

    describe('isBoolean', () => {
        it('validates booleans correctly', () => {
            expect(isBoolean(true)).toBe(true);
            expect(isBoolean(false)).toBe(true);
            expect(isBoolean(Boolean(true))).toBe(true);
            expect(isBoolean(0)).toBe(false);
            expect(isBoolean('true')).toBe(false);
            expect(isBoolean(null)).toBe(false);
        });
    });

    describe('isError', () => {
        it('validates errors correctly', () => {
            expect(isError(new Error())).toBe(true);
            expect(isError(new TypeError())).toBe(true);
            expect(isError({ message: 'error' })).toBe(false);
            expect(isError('error')).toBe(false);
            expect(isError(null)).toBe(false);
        });
    });

    describe('isValidRuntime', () => {
        it('validates runtime types correctly', () => {
            expect(isValidRuntime('EDGE')).toBe(true);
            expect(isValidRuntime('NODE')).toBe(true);
            expect(isValidRuntime('BROWSER')).toBe(true);
            expect(isValidRuntime('INVALID')).toBe(false);
            expect(isValidRuntime('')).toBe(false);
            expect(isValidRuntime(null)).toBe(false);
        });
    });

    describe('isValidEnvironment', () => {
        it('validates environment types correctly', () => {
            expect(isValidEnvironment('DEVELOPMENT')).toBe(true);
            expect(isValidEnvironment('STAGING')).toBe(true);
            expect(isValidEnvironment('PRODUCTION')).toBe(true);
            expect(isValidEnvironment('TEST')).toBe(true);
            expect(isValidEnvironment('INVALID')).toBe(false);
            expect(isValidEnvironment('')).toBe(false);
            expect(isValidEnvironment(null)).toBe(false);
        });
    });
});

describe('Schema Validation', () => {
    describe('validateSchema', () => {
        it('validates objects against schemas', () => {
            const schema = {
                name: isString,
                age: isNumber,
                isActive: isBoolean
            };

            expect(validateSchema({
                name: 'test',
                age: 25,
                isActive: true
            }, schema).isValid).toBe(true);

            expect(validateSchema({
                name: 'test',
                age: '25',
                isActive: true
            }, schema).isValid).toBe(false);

            expect(validateSchema({
                name: 'test'
            }, schema).isValid).toBe(false);
        });
    });

    describe('createValidator', () => {
        it('creates type-safe validators', () => {
            const validateString = createValidator(isString, 'Must be a string');

            expect(validateString('test').isValid).toBe(true);
            expect(validateString(123).isValid).toBe(false);
            expect(validateString(123).errors).toEqual(['Must be a string']);
        });
    });

    describe('combineValidators', () => {
        it('combines multiple validators', () => {
            const validateString = createValidator(isString, 'Must be a string');
            const validateNonEmpty = createValidator(
                (v) => isString(v) && v.length > 0,
                'Must not be empty'
            );

            const validateNonEmptyString = combineValidators([
                validateString,
                validateNonEmpty
            ]);

            expect(validateNonEmptyString('test').isValid).toBe(true);
            expect(validateNonEmptyString('').isValid).toBe(false);
            expect(validateNonEmptyString(123).isValid).toBe(false);
        });
    });

    describe('optional', () => {
        it('handles optional fields correctly', () => {
            const validateOptionalString = optional(
                createValidator(isString, 'Must be a string')
            );

            expect(validateOptionalString(undefined).isValid).toBe(true);
            expect(validateOptionalString('test').isValid).toBe(true);
            expect(validateOptionalString(123).isValid).toBe(false);
        });
    });

    describe('arrayOf', () => {
        it('validates arrays of elements', () => {
            const validateStringArray = arrayOf(
                createValidator(isString, 'Must be a string')
            );

            expect(validateStringArray(['test', 'data']).isValid).toBe(true);
            expect(validateStringArray(['test', 123]).isValid).toBe(false);
            expect(validateStringArray(123).isValid).toBe(false);
            expect(validateStringArray([]).isValid).toBe(true);
        });

        it('provides detailed error messages', () => {
            const validateStringArray = arrayOf(
                createValidator(isString, 'Must be a string')
            );

            const result = validateStringArray(['test', 123, 'data']);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Invalid array element at index 1: Must be a string');
        });
    });
}); 