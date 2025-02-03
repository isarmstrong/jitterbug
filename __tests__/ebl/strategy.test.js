import { describe, expect, it } from 'vitest';
import { LenientValidationStrategy, StrictValidationStrategy } from '../../dist/src/types/ebl/strategy.js';

describe('Validation Strategies', () => {
    describe('StrictValidationStrategy', () => {
        const strategy = new StrictValidationStrategy();

        it('should have priority 1', () => {
            expect(strategy.getPriority()).toBe(1);
        });

        it('should validate input', () => {
            const input = { test: 'data' };
            expect(strategy.validate(input)).toBe(true);
        });

        it('should process input', () => {
            const input = { test: 'data' };
            expect(strategy.process(input)).toEqual(input);
        });
    });

    describe('LenientValidationStrategy', () => {
        const strategy = new LenientValidationStrategy();

        it('should have priority 2', () => {
            expect(strategy.getPriority()).toBe(2);
        });

        it('should validate input', () => {
            const input = { test: 'data' };
            expect(strategy.validate(input)).toBe(true);
        });

        it('should process input', () => {
            const input = { test: 'data' };
            expect(strategy.process(input)).toEqual(input);
        });
    });
}); 