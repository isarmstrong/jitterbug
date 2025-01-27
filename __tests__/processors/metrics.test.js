import { describe, beforeEach, test, expect, afterEach } from 'vitest';
import { MetricsProcessor } from '../../src/processors/metrics';
import { LogLevels, Runtime } from '../../src/types';
import { vi } from 'vitest';

describe('MetricsProcessor', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Mock performance.now to simulate time passing
    let time = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => {
      time += 1;
      return time;
    });

    // Mock setImmediate to be synchronous
    vi.spyOn(global, 'setImmediate').mockImplementation((fn) => {
      fn();
      return { unref: () => { } };
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  test('should track event loop lag', async () => {
    const processor = new MetricsProcessor({
      trackEventLoop: true,
      sampleRate: 1
    });

    // Force a metrics collection cycle
    const metrics = await processor.collect();

    expect(metrics.eventLoop).toBeDefined();
    expect(metrics.eventLoop.lag).toBeGreaterThanOrEqual(0);
    expect(metrics.eventLoop.samples).toBe(1);
  });

  test('should track memory metrics', async () => {
    const processor = new MetricsProcessor({
      trackMemory: true,
      sampleRate: 1
    });

    // Mock memory usage
    const mockMemory = {
      heapUsed: 1000000,
      heapTotal: 2000000,
      rss: 3000000,
      external: 500000
    };

    vi.spyOn(process, 'memoryUsage').mockReturnValue(mockMemory);

    // Force a metrics collection cycle
    const metrics = await processor.collect();

    expect(metrics.memoryUsage).toBeDefined();
    expect(metrics.memoryUsage.heapUsed).toBe(mockMemory.heapUsed);
    expect(metrics.memoryUsage.heapTotal).toBe(mockMemory.heapTotal);
    expect(metrics.memoryUsage.rss).toBe(mockMemory.rss);
    expect(metrics.memoryUsage.external).toBe(mockMemory.external);
  });

  test('should respect sample rate', async () => {
    const processor = new MetricsProcessor({
      trackEventLoop: true,
      trackMemory: true,
      sampleRate: 1000 // Sample every second
    });

    // First collection should work
    let metrics = await processor.collect();
    expect(metrics.samples).toBe(1);

    // Second collection within sampleRate should return cached metrics
    metrics = await processor.collect();
    expect(metrics.samples).toBe(1);

    // Advance time past sampleRate
    vi.advanceTimersByTime(1001);

    // Third collection should increment samples
    metrics = await processor.collect();
    expect(metrics.samples).toBe(2);
  });

  test('should add metrics to log context', async () => {
    const processor = new MetricsProcessor({
      trackEventLoop: true,
      trackMemory: true,
      sampleRate: 1
    });

    const entry = {
      level: LogLevels.INFO,
      message: 'test',
      context: {
        timestamp: new Date().toISOString(),
        runtime: Runtime.NODE,
        environment: 'TEST',
        namespace: 'test'
      }
    };

    const processedEntry = await processor.process(entry);
    expect(processedEntry.context.metrics).toBeDefined();
    expect(processedEntry.context.metrics.samples).toBe(1);
  });
});
