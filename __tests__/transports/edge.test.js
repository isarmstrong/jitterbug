import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EdgeTransport } from '../../src/transports/edge';
import { createTestEntry } from '../utils';

describe('EdgeTransport', () => {
    let transport;
    let mockFetch;

    beforeEach(() => {
        vi.useFakeTimers();
        mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });
        global.fetch = mockFetch;
        transport = new EdgeTransport({
            endpoint: 'https://test-endpoint.com/logs',
            batchSize: 10,
            flushInterval: 1000,
            maxRetries: 3,
            maxConnectionDuration: 60000,
            maxEntries: 50,
            maxPayloadSize: 1024
        });
    });

    afterEach(() => {
        vi.clearAllTimers();
        vi.useRealTimers();
        vi.clearAllMocks();
    });

    describe('Basic Transport', () => {
        it('should initialize with config', () => {
            expect(transport.config.endpoint).toBe('https://test-endpoint.com/logs');
            expect(transport.config.batchSize).toBe(10);
            expect(transport.config.flushInterval).toBe(1000);
            expect(transport.config.maxRetries).toBe(3);
            expect(transport.config.maxConnectionDuration).toBe(60000);
            expect(transport.config.maxEntries).toBe(50);
            expect(transport.config.maxPayloadSize).toBe(1024);
        });

        it('should queue log entries', async () => {
            const entry = createTestEntry();
            await transport.write(entry);
            expect(transport.queue.length).toBe(1);
        });

        it('should respect batch size', async () => {
            const entries = Array(15).fill(null).map(() => createTestEntry());

            for (const entry of entries.slice(0, 9)) {
                await transport.write(entry);
            }
            expect(mockFetch).not.toHaveBeenCalled();

            await transport.write(entries[9]); // This should trigger a flush
            expect(mockFetch).toHaveBeenCalledTimes(1);
            expect(transport.queue.length).toBe(5);
        });
    });

    describe('Batch Processing', () => {
        it('should process batches correctly', async () => {
            const entries = Array(10).fill(null).map(() => createTestEntry());

            for (const entry of entries) {
                await transport.write(entry);
            }

            expect(mockFetch).toHaveBeenCalledTimes(1);
            const [url, options] = mockFetch.mock.calls[0];
            expect(url).toBe('https://test-endpoint.com/logs');
            expect(JSON.parse(options.body).length).toBe(10);
        });

        it('should handle failed batches', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Network error'))
                .mockResolvedValueOnce({ ok: true, status: 200 });

            const entries = Array(10).fill(null).map(() => createTestEntry());

            for (const entry of entries) {
                await transport.write(entry);
            }

            expect(mockFetch).toHaveBeenCalledTimes(2);
            expect(transport.queue.length).toBe(0);
        });
    });

    describe('Auto Flush', () => {
        it('should auto-flush on interval', async () => {
            const entry = createTestEntry();
            await transport.write(entry);

            expect(mockFetch).not.toHaveBeenCalled();
            vi.advanceTimersByTime(1100);
            expect(mockFetch).toHaveBeenCalledTimes(1);
        });

        it('should handle flush errors', async () => {
            mockFetch.mockRejectedValue(new Error('Flush error'));

            const entries = Array(5).fill(null).map(() => createTestEntry());
            for (const entry of entries) {
                await transport.write(entry);
            }

            vi.advanceTimersByTime(1100);
            expect(mockFetch).toHaveBeenCalledTimes(1);
            expect(transport.queue.length).toBe(5);
        });
    });

    describe('Edge Runtime', () => {
        it('should handle edge runtime constraints', async () => {
            const entry = createTestEntry();
            await transport.write(entry);

            vi.advanceTimersByTime(1100);
            expect(mockFetch).toHaveBeenCalledWith(
                'https://test-endpoint.com/logs',
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'X-Runtime': 'edge',
                        'X-Environment': 'production'
                    })
                })
            );
        });

        it('should handle large payloads', async () => {
            const largeEntry = createTestEntry();
            largeEntry.data = { large: 'x'.repeat(1000000) };

            await transport.write(largeEntry);
            vi.advanceTimersByTime(1100);

            expect(mockFetch).toHaveBeenCalledTimes(1);
            const [, options] = mockFetch.mock.calls[0];
            expect(options.body.length).toBeLessThan(1000000);
        });
    });

    describe('Error Handling', () => {
        it('should handle network errors', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Network error'))
                .mockResolvedValueOnce({ ok: true, status: 200 });

            const entry = createTestEntry();
            await transport.write(entry);

            vi.advanceTimersByTime(1100);
            expect(transport.queue.length).toBe(0);
        });

        it('should handle malformed responses', async () => {
            mockFetch.mockResolvedValue({ ok: false, status: 400 });

            const entry = createTestEntry();
            await transport.write(entry);

            vi.advanceTimersByTime(1100);
            expect(transport.queue.length).toBe(1);
            expect(mockFetch).toHaveBeenCalledTimes(1);
        });
    });

    describe('Cleanup', () => {
        it('should clean up resources on destroy', async () => {
            const entry = createTestEntry();
            await transport.write(entry);

            await transport.destroy();
            expect(transport.queue.length).toBe(0);
            expect(transport.flushTimeout).toBeNull();
        });

        it('should handle pending operations on destroy', async () => {
            mockFetch.mockResolvedValue({ ok: true, status: 200 });

            const entries = Array(5).fill(null).map(() => createTestEntry());
            for (const entry of entries) {
                await transport.write(entry);
            }

            await transport.destroy();
            expect(mockFetch).toHaveBeenCalledTimes(1);
            expect(transport.queue.length).toBe(0);
        });
    });
});
