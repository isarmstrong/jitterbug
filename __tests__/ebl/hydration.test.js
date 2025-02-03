import { describe, expect, it } from 'vitest';
import { DefaultHydrationLayer } from '../../dist/src/types/ebl/hydration.js';

describe('Hydration Layer', () => {
    const hydrationLayer = new DefaultHydrationLayer();

    describe('validateHydrationState', () => {
        it('validates valid hydration states', () => {
            expect(hydrationLayer.validateHydrationState({})).toBe(true);
            expect(hydrationLayer.validateHydrationState({ foo: 'bar' })).toBe(true);
        });

        it('rejects invalid hydration states', () => {
            expect(hydrationLayer.validateHydrationState(null)).toBe(false);
            expect(hydrationLayer.validateHydrationState(undefined)).toBe(false);
            expect(hydrationLayer.validateHydrationState('string')).toBe(false);
            expect(hydrationLayer.validateHydrationState(123)).toBe(false);
        });
    });

    describe('reconcileState', () => {
        it('merges server and client states correctly', () => {
            const serverState = { a: 1, b: 2, c: 3 };
            const clientState = { b: 20, d: 4 };
            const expected = { a: 1, b: 20, c: 3, d: 4 };

            expect(hydrationLayer.reconcileState(serverState, clientState)).toEqual(expected);
        });

        it('handles empty states', () => {
            expect(hydrationLayer.reconcileState({}, {})).toEqual({});
            expect(hydrationLayer.reconcileState({ a: 1 }, {})).toEqual({ a: 1 });
            expect(hydrationLayer.reconcileState({}, { b: 2 })).toEqual({ b: 2 });
        });
    });

    describe('detectMismatch', () => {
        it('detects missing keys in client', () => {
            const serverState = { a: 1, b: 2 };
            const clientState = { a: 1 };
            const result = hydrationLayer.detectMismatch(serverState, clientState);
            expect(result).toContain('Missing in client: b');
        });

        it('detects extra keys in client', () => {
            const serverState = { a: 1 };
            const clientState = { a: 1, c: 3 };
            const result = hydrationLayer.detectMismatch(serverState, clientState);
            expect(result).toContain('Extra in client: c');
        });

        it('returns null when states match', () => {
            const serverState = { a: 1, b: 2 };
            const clientState = { a: 1, b: 2 };
            expect(hydrationLayer.detectMismatch(serverState, clientState)).toBeNull();
        });
    });
}); 