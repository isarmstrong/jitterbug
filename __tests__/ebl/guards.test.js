import { describe, expect, it } from 'vitest';
import { EdgeGuard, HybridGuard, SSRGuard } from '../../dist/src/types/ebl/guards.js';

describe('Runtime Guards', () => {
    describe('SSRGuard', () => {
        it('validates SSR environment', () => {
            const guard = new SSRGuard();
            expect(guard.getEnvironment()).toBe('ssr');

            // Should pass in Node.js environment (no window)
            expect(guard.validate({})).toBe(true);
        });
    });

    describe('EdgeGuard', () => {
        it('validates Edge environment', () => {
            const guard = new EdgeGuard();
            expect(guard.getEnvironment()).toBe('edge');

            // Mock Edge runtime environment
            const originalEnv = process.env.EDGE_RUNTIME;
            process.env.EDGE_RUNTIME = 'edge-runtime';
            expect(guard.validate({})).toBe(true);

            // Reset environment
            process.env.EDGE_RUNTIME = originalEnv;
        });

        it('fails in non-Edge environment', () => {
            const guard = new EdgeGuard();
            process.env.EDGE_RUNTIME = undefined;
            expect(guard.validate({})).toBe(false);
        });
    });

    describe('HybridGuard', () => {
        it('validates in either environment', () => {
            const guard = new HybridGuard();
            expect(guard.getEnvironment()).toBe('hybrid');

            // Should work in Edge
            process.env.EDGE_RUNTIME = 'edge-runtime';
            expect(guard.validate({})).toBe(true);

            // Should work in SSR
            process.env.EDGE_RUNTIME = undefined;
            expect(guard.validate({})).toBe(true);
        });
    });
}); 