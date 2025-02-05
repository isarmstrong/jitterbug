import { describe, expect, it } from 'vitest';
import { isNumber, isString } from '../src/utils/type-guards';

describe('Type Guards', () => {
    it('identifies strings correctly', () => {
        expect(isString('hello')).toBe(true);
        expect(isString(123)).toBe(false);
    });

    it('identifies numbers correctly', () => {
        expect(isNumber(123)).toBe(true);
        expect(isNumber('123')).toBe(false);
    });
}); 