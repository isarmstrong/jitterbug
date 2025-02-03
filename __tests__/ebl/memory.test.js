import { describe, expect, it } from 'vitest';
import { MemoryManager } from '../../dist/src/types/ebl/memory.js';

describe('MemoryManager', () => {
    it('initializes with current metrics', () => {
        const manager = new MemoryManager();
        const metrics = manager.getMetrics();

        expect(metrics).toHaveProperty('heapUsed');
        expect(metrics).toHaveProperty('heapTotal');
        expect(metrics).toHaveProperty('rss');
        expect(metrics).toHaveProperty('memoryThreshold');
        expect(metrics.memoryThreshold).toBe(128);
    });

    it('checks memory threshold', () => {
        const manager = new MemoryManager();
        const exceeded = manager.isMemoryExceeded();
        expect(typeof exceeded).toBe('boolean');
    });

    it('performs cleanup', () => {
        const manager = new MemoryManager();
        const beforeMetrics = manager.getMetrics();
        manager.cleanup();
        const afterMetrics = manager.getMetrics();

        expect(afterMetrics).toHaveProperty('heapUsed');
        expect(typeof afterMetrics.heapUsed).toBe('number');
    });
}); 