const { describe, it, expect, vi, beforeEach } = require('vitest');
const { ErrorAggregationProcessor } = require('../../src/processors/error-aggregation');

describe('ErrorAggregationProcessor', () => {
    let processor;

    beforeEach(() => {
        processor = new ErrorAggregationProcessor();
        vi.clearAllMocks();
    });

    describe('Basic Error Processing', () => {
        it('should process basic error entries', async () => {
            const error = new Error('Test error');
            const entry = {
                level: 'ERROR',
                message: 'Test error',
                timestamp: new Date().toISOString(),
                data: { error }
            };

            const result = await processor.process(entry);
            expect(result.data).toBeDefined();
            expect(result.data.errorGroup).toBeDefined();
            expect(result.data.patternId).toBeDefined();
        });

        it('should identify similar errors', async () => {
            const error1 = new Error('Test error with ID 123');
            const error2 = new Error('Test error with ID 456');

            const entry1 = {
                level: 'ERROR',
                message: 'Test error',
                timestamp: new Date().toISOString(),
                data: { error: error1 }
            };

            const entry2 = {
                level: 'ERROR',
                message: 'Test error',
                timestamp: new Date().toISOString(),
                data: { error: error2 }
            };

            const result1 = await processor.process(entry1);
            const result2 = await processor.process(entry2);

            expect(result1.data.patternId).toBe(result2.data.patternId);
            expect(result1.data.errorGroup).toBe(result2.data.errorGroup);
        });
    });

    describe('Error Pattern Recognition', () => {
        it('should detect error patterns', async () => {
            const baseError = new Error('Database connection failed');
            const entries = Array(5).fill(null).map(() => ({
                level: 'ERROR',
                message: 'Database error',
                timestamp: new Date().toISOString(),
                data: { error: baseError }
            }));

            const results = await Promise.all(entries.map(entry => processor.process(entry)));
            const patterns = new Set(results.map(r => r.data.patternId));

            expect(patterns.size).toBe(1);
            expect(results[0].data.frequency).toBeGreaterThan(1);
        });

        it('should handle different error types', async () => {
            const entries = [
                new TypeError('Type error'),
                new ReferenceError('Reference error'),
                new RangeError('Range error')
            ].map(error => ({
                level: 'ERROR',
                message: error.message,
                timestamp: new Date().toISOString(),
                data: { error }
            }));

            const results = await Promise.all(entries.map(entry => processor.process(entry)));
            const patterns = new Set(results.map(r => r.data.patternId));

            expect(patterns.size).toBe(3);
        });
    });

    describe('Error Frequency Analysis', () => {
        it('should track error frequency', async () => {
            const error = new Error('Frequent error');
            const entries = Array(10).fill(null).map(() => ({
                level: 'ERROR',
                message: 'Frequent error',
                timestamp: new Date().toISOString(),
                data: { error }
            }));

            const results = await Promise.all(entries.map(entry => processor.process(entry)));
            expect(results[9].data.frequency).toBe(10);
        });

        it('should handle error bursts', async () => {
            const error = new Error('Burst error');
            const entries = Array(20).fill(null).map(() => ({
                level: 'ERROR',
                message: 'Burst error',
                timestamp: new Date().toISOString(),
                data: { error }
            }));

            const results = await Promise.all(entries.map(entry => processor.process(entry)));
            expect(results[19].data.frequency).toBe(20);
            expect(results[19].data.similarErrors.length).toBeGreaterThan(0);
        });
    });
});
