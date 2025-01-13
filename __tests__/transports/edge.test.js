const { describe, it, expect, vi, beforeEach } = require('vitest');
const { EdgeTransport } = require('../../src/transports/edge');
const { createTestEntry } = require('../utils');

describe('EdgeTransport', () => {
    let transport;
    let mockFetch;

    beforeEach(() => {
        mockFetch = vi.fn();
        global.fetch = mockFetch;
        transport = new EdgeTransport({
            endpoint: 'https://test-endpoint.com/logs',
            batchSize: 10,
            flushInterval: 1000
        });
        vi.clearAllMocks();
    });

    describe('Basic Transport', () => {
        it('should initialize with config', () => {
            expect(transport.endpoint).toBe('https://test-endpoint.com/logs');
            expect(transport.batchSize).toBe(10);
            expect(transport.flushInterval).toBe(1000);
        });

        it('should queue log entries', async () => {
            const entry = createTestEntry();
            await transport.log(entry);
            expect(transport.queue.length).toBe(1);
        });

        it('should respect batch size', async () => {
            const entries = Array(15).fill(null).map(() => createTestEntry());

            for (const entry of entries) {
                await transport.log(entry);
            }

            expect(mockFetch).toHaveBeenCalledTimes(1);
            expect(transport.queue.length).toBe(5);
        });
    });

    describe('Batch Processing', () => {
        it('should process batches correctly', async () => {
            const entries = Array(20).fill(null).map(() => createTestEntry());
            mockFetch.mockResolvedValue({ ok: true });

            for (const entry of entries) {
                await transport.log(entry);
            }

            expect(mockFetch).toHaveBeenCalledTimes(2);
            expect(transport.queue.length).toBe(0);
        });

        it('should handle failed batches', async () => {
            const entries = Array(10).fill(null).map(() => createTestEntry());
            mockFetch.mockRejectedValue(new Error('Network error'));

            for (const entry of entries) {
                await transport.log(entry);
            }

            expect(mockFetch).toHaveBeenCalledTimes(1);
            expect(transport.queue.length).toBe(10); // Entries should be retained
        });
    });

    describe('Auto Flush', () => {
        it('should auto-flush on interval', async () => {
            vi.useFakeTimers();
            mockFetch.mockResolvedValue({ ok: true });

            const entries = Array(5).fill(null).map(() => createTestEntry());
            for (const entry of entries) {
                await transport.log(entry);
            }

            expect(mockFetch).not.toHaveBeenCalled();
            expect(transport.queue.length).toBe(5);

            vi.advanceTimersByTime(1100);
            expect(mockFetch).toHaveBeenCalledTimes(1);
            expect(transport.queue.length).toBe(0);

            vi.useRealTimers();
        });

        it('should handle flush errors', async () => {
            vi.useFakeTimers();
            mockFetch.mockRejectedValue(new Error('Flush error'));

            const entries = Array(5).fill(null).map(() => createTestEntry());
            for (const entry of entries) {
                await transport.log(entry);
            }

            vi.advanceTimersByTime(1100);
            expect(mockFetch).toHaveBeenCalledTimes(1);
            expect(transport.queue.length).toBe(5); // Entries should be retained

            vi.useRealTimers();
        });
    });

    describe('Edge Runtime', () => {
        it('should handle edge runtime constraints', async () => {
            const entry = createTestEntry({
                context: {
                    runtime: 'edge',
                    environment: 'production'
                }
            });

            mockFetch.mockResolvedValue({ ok: true });
            await transport.log(entry);

            expect(mockFetch).toHaveBeenCalledWith(
                'https://test-endpoint.com/logs',
                expect.objectContaining({
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                })
            );
        });

        it('should handle large payloads', async () => {
            const largeEntry = createTestEntry({
                data: {
                    largePayload: 'x'.repeat(1000000) // 1MB of data
                }
            });

            await transport.log(largeEntry);
            expect(mockFetch).toHaveBeenCalledTimes(1);
            const [, options] = mockFetch.mock.calls[0];
            expect(options.body.length).toBeLessThan(1000000);
        });
    });

    describe('Error Handling', () => {
        it('should handle network errors', async () => {
            mockFetch.mockRejectedValue(new Error('Network error'));
            const entry = createTestEntry();

            await transport.log(entry);
            expect(transport.queue.length).toBe(1);

            mockFetch.mockResolvedValue({ ok: true });
            vi.advanceTimersByTime(1100);
            expect(transport.queue.length).toBe(0);
        });

        it('should handle malformed responses', async () => {
            mockFetch.mockResolvedValue({
                ok: false,
                status: 400,
                statusText: 'Bad Request'
            });

            const entry = createTestEntry();
            await transport.log(entry);

            expect(transport.queue.length).toBe(1);
            expect(mockFetch).toHaveBeenCalledTimes(1);
        });
    });

    describe('Cleanup', () => {
        it('should clean up resources on destroy', async () => {
            const entry = createTestEntry();
            await transport.log(entry);

            transport.destroy();
            expect(transport.queue.length).toBe(0);
            expect(transport.flushInterval).toBeNull();
        });

        it('should handle pending operations on destroy', async () => {
            mockFetch.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

            const entries = Array(10).fill(null).map(() => createTestEntry());
            for (const entry of entries) {
                await transport.log(entry);
            }

            transport.destroy();
            expect(transport.queue.length).toBe(0);
            expect(mockFetch).toHaveBeenCalledTimes(1);
        });
    });
});
