import { describe, it, beforeEach, expect } from 'vitest';
import { createJitterbug } from '../../src/core';
import { LogLevels } from '../../src/types/enums';

class MockProcessor {
    constructor() {
        this.entries = [];
    }

    supports() {
        return true;
    }

    allowedIn() {
        return true;
    }

    async process(entry) {
        this.entries.push(entry);
        return entry;
    }
}

class MockTransport {
    constructor() {
        this.entries = [];
    }

    async write(entry) {
        this.entries.push(entry);
    }
}

describe('Edge Runtime Pattern Detection', () => {
    let processor;
    let transport;
    let logger;

    beforeEach(() => {
        processor = new MockProcessor();
        transport = new MockTransport();
        logger = createJitterbug({
            processors: [processor],
            transports: [transport]
        });
    });

    describe('SSE Pattern Detection', () => {
        it('should detect SSE conversion patterns', async () => {
            await logger.info('Converting response to SSE', {
                method: 'Response.json()',
                hasCleanup: false,
                maintainsBackpressure: false
            }, {
                stream: {
                    conversion: {
                        method: 'Response.json()',
                        hasCleanup: false,
                        maintainsBackpressure: false
                    },
                    risks: ['No cleanup handler', 'No backpressure handling']
                }
            });

            const entry = processor.entries[0];
            expect(entry.level).toBe(LogLevels.INFO);
            expect(entry.data.method).toBe('Response.json()');
            expect(entry.data.hasCleanup).toBe(false);
            expect(entry.data.maintainsBackpressure).toBe(false);
        });
    });

    describe('Memory Usage Tracking', () => {
        it('should track memory usage against Vercel limits', async () => {
            await logger.warn('Memory usage approaching limit', {
                currentUsage: 7000,
                limit: 8192,
                remaining: 1192
            }, {
                memory: {
                    current: 7000,
                    peak: 7500,
                    limits: {
                        max: 8192,
                        warningThreshold: 7000
                    },
                    risks: ['Approaching memory limit']
                }
            });

            const entry = processor.entries[0];
            expect(entry.level).toBe(LogLevels.WARN);
            expect(entry.data.currentUsage).toBe(7000);
            expect(entry.data.limit).toBe(8192);
            expect(entry.data.remaining).toBe(1192);
        });
    });

    describe('Cache Operation Tracking', () => {
        it('should track cache operations and strategies', async () => {
            await logger.debug('Cache operation executed', {
                operation: 'set',
                key: 'user:123',
                value: { id: 123, name: 'Test' },
                ttl: 3600
            }, {
                cache: {
                    operation: 'set',
                    key: 'user:123',
                    strategy: 'stale-while-revalidate',
                    operations: {
                        ttl: 3600,
                        size: 256
                    }
                }
            });

            const entry = processor.entries[0];
            expect(entry.level).toBe(LogLevels.DEBUG);
            expect(entry.data.operation).toBe('set');
            expect(entry.data.key).toBe('user:123');
            expect(entry.data.ttl).toBe(3600);
        });
    });
}); 