import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MetricsProcessor } from "../../src/processors/metrics";
import { Runtime } from "../../src/types/enums";

describe("MetricsProcessor", () => {
  let processor;
  let mockDate;
  let mockMemoryUsage;

  beforeEach(() => {
    vi.useFakeTimers();
    mockDate = vi.spyOn(Date, "now").mockReturnValue(1000);
    mockMemoryUsage = vi.spyOn(process, "memoryUsage").mockReturnValue({
      heapUsed: 100,
      heapTotal: 1000,
      rss: 2000,
      external: 50,
    });
    processor = new MetricsProcessor();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe("Basic Metrics", () => {
    it("should track basic metrics", async () => {
      const entry = { context: {}, data: {} };
      const result = await processor.process(entry);

      expect(result.data).toBeDefined();
      expect(result.data.timestamp).toBe(1000);
      expect(result.data.memoryUsage).toBeDefined();
      expect(result.data.eventLoop).toBeDefined();
    });

    it("should respect sample rate", async () => {
      processor = new MetricsProcessor({ sampleRate: 0.5 });
      const entry = { context: {}, data: {} };

      // First call should be sampled
      let result = await processor.process(entry);
      expect(result.data.timestamp).toBeDefined();

      // Second call within 2 seconds should not be sampled
      mockDate.mockReturnValue(1500);
      result = await processor.process(entry);
      expect(result.data.timestamp).toBeUndefined();

      // Call after 2 seconds should be sampled
      mockDate.mockReturnValue(3000);
      result = await processor.process(entry);
      expect(result.data.timestamp).toBeDefined();
    });
  });

  describe("Memory Tracking", () => {
    it("should track memory usage when enabled", async () => {
      const entry = { context: {}, data: {} };
      const result = await processor.process(entry);

      expect(result.data.memoryUsage).toEqual({
        heapUsed: 100,
        heapTotal: 1000,
        rss: 2000,
        external: 50,
      });
    });

    it("should handle memory warnings", async () => {
      mockMemoryUsage.mockReturnValue({
        heapUsed: 950, // 95% usage
        heapTotal: 1000,
        rss: 2000,
        external: 50,
      });

      const entry = { context: {}, data: {} };
      const result = await processor.process(entry);

      expect(result.warnings).toBeDefined();
      expect(result.warnings[0]).toContain("High memory usage");
      expect(processor.getWarningCount()).toBe(1);
    });
  });

  describe("Event Loop Tracking", () => {
    it("should track event loop lag", async () => {
      const entry = { context: {}, data: {} };

      mockDate
        .mockReturnValueOnce(1000) // Initial time
        .mockReturnValueOnce(1010); // 10ms lag

      const result = await processor.process(entry);
      expect(result.data.eventLoop).toBeDefined();
      expect(result.data.eventLoop.lag).toBe(9); // 10ms - 1ms minimum timer
    });

    it("should detect event loop lag spikes", async () => {
      const entry = { context: {}, data: {} };
      const results = [];

      // Normal lag
      mockDate.mockReturnValueOnce(1000).mockReturnValueOnce(1010);
      results.push(await processor.process(entry));

      // High lag
      mockDate.mockReturnValueOnce(1100).mockReturnValueOnce(1200);
      results.push(await processor.process(entry));

      // Back to normal
      mockDate.mockReturnValueOnce(1300).mockReturnValueOnce(1310);
      results.push(await processor.process(entry));

      expect(results[0].data.eventLoop.lag).toBeLessThan(50);
      expect(results[1].data.eventLoop.lag).toBeGreaterThan(50);
      expect(results[2].data.eventLoop.lag).toBeLessThan(50);
      expect(results[1].warnings).toContain("High event loop lag: 99ms");
    });
  });

  describe("Cross-Runtime Support", () => {
    it("should handle both Node.js and browser metrics", async () => {
      // Test Node.js runtime
      const nodeProcessor = new MetricsProcessor({}, Runtime.NODE);
      const nodeEntry = { context: {}, data: {} };
      const nodeResult = await nodeProcessor.process(nodeEntry);

      // Test browser runtime
      const browserProcessor = new MetricsProcessor({}, Runtime.BROWSER);
      const browserEntry = { context: {}, data: {} };

      // Mock browser performance.memory
      const mockPerformance = {
        memory: {
          usedJSHeapSize: 200,
          totalJSHeapSize: 1000,
        },
      };
      global.performance = mockPerformance;

      const browserResult = await browserProcessor.process(browserEntry);

      expect(nodeResult.data.memoryUsage.heapUsed).toBe(100);
      expect(browserResult.data.memoryUsage.heapUsed).toBe(200);
    });
  });
});
