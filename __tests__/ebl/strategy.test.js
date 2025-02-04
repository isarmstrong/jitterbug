import { describe, expect, it } from 'vitest';
import { LenientValidationStrategy, StrictValidationStrategy } from '../../src/types/ebl/strategy';

describe('Validation Strategy Hierarchy', () => {
    it('StrictValidationStrategy should have priority 1', () => {
        const strict = new StrictValidationStrategy();
        expect(strict.getPriority()).toBe(1);
    });

    it('LenientValidationStrategy should have priority 2', () => {
        const lenient = new LenientValidationStrategy();
        expect(lenient.getPriority()).toBe(2);
    });

    it('StrictValidationStrategy validate should return valid result with metadata', () => {
        const strict = new StrictValidationStrategy();
        const testInput = { key: 'value' };
        const result = strict.validate(testInput);

        expect(result.isValid).toBe(true);
        expect(result.metadata).toEqual({
            strategy: 'strict',
            timestamp: expect.any(Number)
        });
        expect(strict.process(testInput)).toEqual(testInput);
    });

    it('LenientValidationStrategy validate should return valid result with metadata', () => {
        const lenient = new LenientValidationStrategy();
        const testInput = [1, 2, 3];
        const result = lenient.validate(testInput);

        expect(result.isValid).toBe(true);
        expect(result.metadata).toEqual({
            strategy: 'lenient',
            timestamp: expect.any(Number),
            partialValidation: false
        });
        expect(lenient.process(testInput)).toEqual(testInput);
    });

    it('StrictValidationStrategy should validate object structure', () => {
        const strict = new StrictValidationStrategy();
        const validInput = { id: 1, name: 'test' };
        const invalidInput = { id: '1', name: null };

        const validResult = strict.validate(validInput);
        const invalidResult = strict.validate(invalidInput);

        expect(validResult.isValid).toBe(true);
        expect(invalidResult.isValid).toBe(false);
        expect(invalidResult.errors).toBeDefined();
    });

    it('LenientValidationStrategy should handle partial validation', () => {
        const lenient = new LenientValidationStrategy();
        const input = null;
        const result = lenient.validate(input);

        expect(result.isValid).toBe(true);
        expect(result.metadata).toEqual({
            strategy: 'lenient',
            timestamp: expect.any(Number),
            partialValidation: true
        });
    });
}); 