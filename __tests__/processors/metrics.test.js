const { describe, it, expect, vi, beforeEach } = require('vitest');
const { MetricsProcessor } = require('../../src/processors/metrics');

describe('MetricsProcessor', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Basic Metrics', () => {
        it('should track basic metrics', async () => {
            const processor = new MetricsProcessor();
            const entry = {
                level: 'INFO',
                message: 'Test message',
                timestamp: new Date().toISOString(),
                data: {}
            };

            const result = await processor.process(entry);
            expect(result.data).toBeDefined();
            expect(result.data.timestamp).toBeDefined();
        });

        it('should respect sample rate', async () => {
            const processor = new MetricsProcessor({ sampleRate: 0 });
            const entry = {
                level: 'INFO',
                message: 'Test message',
                timestamp: new Date().toISOString(),
                data: {}
            };

            const result = await processor.process(entry);
            expect(result).toEqual(entry);
        });
    });

    describe('Memory Tracking', () => {
        it('should track memory usage when enabled', async () => {
            const processor = new MetricsProcessor({
                trackMemory: false,
                runtime: 'node'
            });

            const entry = {
                level: 'INFO',
                message: 'Test message',
                timestamp: new Date().toISOString(),
                data: {}
            };

            const result = await processor.process(entry);
            expect(result.data).toBeDefined();
            expect(result.data.memoryUsage).toBeUndefined();
        });

        it('should handle memory warnings', async () => {
            const mockMemoryUsage = vi.spyOn(process, 'memoryUsage');
            mockMemoryUsage.mockReturnValue({
                heapUsed: 900 * 1024 * 1024, // 900MB
                heapTotal: 1024 * 1024 * 1024, // 1GB
                external: 0,
                arrayBuffers: 0,
                rss: 0
            });

            const processor = new MetricsProcessor({ trackMemory: true });
            const entries = Array(10).fill({
                level: 'INFO',
                message: 'Test message',
                timestamp: new Date().toISOString(),
                data: {}
            });

            let warningCount = 0;
            for (const entry of entries) {
                const result = await processor.process(entry);
                if (result.data && result.data.memoryWarning) warningCount++;
            }

            expect(warningCount).toBeGreaterThan(0);
            mockMemoryUsage.mockRestore();
        });
    });

    describe('Event Loop Tracking', () => {
        it('should track event loop lag', async () => {
            const processor = new MetricsProcessor({
                trackEventLoop: true,
                runtime: 'node'
            });

            const entry = {
                level: 'INFO',
                message: 'Test message',
                timestamp: new Date().toISOString(),
                data: {}
            };

            const result = await processor.process(entry);
            expect(result.data).toBeDefined();
            expect(result.data.eventLoop).toBeDefined();
            expect(typeof result.data.eventLoop.lag).toBe('number');
        });

        it('should detect event loop lag spikes', async () => {
            const processor = new MetricsProcessor({
                trackEventLoop: true,
                runtime: 'node'
            });

            const entries = Array(4).fill({
                level: 'INFO',
                message: 'Test message',
                timestamp: new Date().toISOString(),
                data: {}
            });

            // Simulate lag by delaying responses
            const results = [];
            for (const entry of entries) {
                if (results.length === 1) {
                    await new Promise(resolve => setTimeout(resolve, 100)); // Introduce lag
                }
                results.push(await processor.process(entry));
            }

            expect(results[0].data.eventLoop.lag).toBeLessThan(50); // Normal
            expect(results[1].data.eventLoop.lag).toBeGreaterThan(50); // Lag
            expect(results[2].data.eventLoop.lag).toBeLessThan(50); // Recovery
            expect(results[3].data.eventLoop.lag).toBeLessThan(50); // Normal
        });
    });

    describe('Cross-Runtime Support', () => {
        it('should handle both Node.js and browser metrics', async () => {
            const nodeProcessor = new MetricsProcessor({
                trackMemory: true,
                runtime: 'node'
            });

            const browserProcessor = new MetricsProcessor({
                trackMemory: true,
                runtime: 'browser'
            });

            // Mock Node.js memory
            const mockNodeMemory = vi.spyOn(process, 'memoryUsage');
            mockNodeMemory.mockReturnValue({
                heapUsed: 100,
                heapTotal: 1000,
                external: 0,
                arrayBuffers: 0,
                rss: 0
            });

            // Mock browser memory
            const mockPerformance = {
                memory: {
                    usedJSHeapSize: 200,
                    totalJSHeapSize: 2000,
                    jsHeapSizeLimit: 4000
                }
            };
            global.performance = mockPerformance;

            const entry = {
                level: 'INFO',
                message: 'Test message',
                timestamp: new Date().toISOString(),
                data: {}
            };

            const nodeResult = await nodeProcessor.process(entry);
            const browserResult = await browserProcessor.process(entry);

            expect(nodeResult.data.memoryUsage.heapUsed).toBe(100);
            expect(browserResult.data.memoryUsage.heapUsed).toBe(200);

            mockNodeMemory.mockRestore();
            delete global.performance;
        });
    });
});
