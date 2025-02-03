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

    it('StrictValidationStrategy validate should return true and process should return input', () => {
        const strict = new StrictValidationStrategy();
        const testInput = { key: 'value' };
        expect(strict.validate(testInput)).toBe(true);
        expect(strict.process(testInput)).toEqual(testInput);
    });

    it('LenientValidationStrategy validate should return true and process should return input', () => {
        const lenient = new LenientValidationStrategy();
        const testInput = [1, 2, 3];
        expect(lenient.validate(testInput)).toBe(true);
        expect(lenient.process(testInput)).toEqual(testInput);
    });
}); 