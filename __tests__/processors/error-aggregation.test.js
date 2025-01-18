import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ErrorAggregationProcessor } from "../../src/processors/error-aggregation";
import { Runtime } from "../../src/types/enums";

describe("ErrorAggregationProcessor", () => {
  let processor;
  let mockDate;

  beforeEach(() => {
    vi.useFakeTimers();
    mockDate = vi.spyOn(Date, "now").mockReturnValue(1000);
    processor = new ErrorAggregationProcessor();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe("Basic Error Processing", () => {
    it("should process errors correctly", async () => {
      const error = new Error("Test error");
      const entry = { context: {}, data: {}, error };

      const result = await processor.process(entry);
      expect(result.data.patternId).toBeDefined();
      expect(result.data.errorGroup).toBeDefined();
      expect(result.data.frequency).toBe(1);
    });

    it("should handle entries without errors", async () => {
      const entry = { context: {}, data: {} };
      const result = await processor.process(entry);
      expect(result).toEqual(entry);
    });
  });

  describe("Error Pattern Recognition", () => {
    it("should detect error patterns", async () => {
      const error = new Error(
        "Test error with ID 123 and timestamp 2024-01-17",
      );
      const similarError = new Error(
        "Test error with ID 456 and timestamp 2024-01-18",
      );

      // Process first error
      await processor.process({ context: {}, data: {}, error });

      // Process similar error after some time
      mockDate.mockReturnValue(2000);
      const result = await processor.process({
        context: {},
        data: {},
        error: similarError,
      });

      expect(result.data.frequency).toBe(2);
      expect(result.data.similarErrors.length).toBeGreaterThan(0);
    });

    it("should handle different error types", async () => {
      const error1 = new Error("Database connection failed: timeout");
      const error2 = new TypeError("Invalid input: missing required field");

      const result1 = await processor.process({
        context: {},
        data: {},
        error: error1,
      });
      const result2 = await processor.process({
        context: {},
        data: {},
        error: error2,
      });

      expect(result1.data.patternId).not.toBe(result2.data.patternId);
      expect(result1.data.errorGroup).not.toBe(result2.data.errorGroup);
    });
  });

  describe("Error Frequency Analysis", () => {
    it("should track error frequency", async () => {
      const error = new Error("Repeated error");
      const entry = { context: {}, data: {}, error };

      // Process same error multiple times
      await processor.process(entry);
      mockDate.mockReturnValue(2000);
      await processor.process(entry);
      mockDate.mockReturnValue(3000);
      const result = await processor.process(entry);

      expect(result.data.frequency).toBe(3);
    });

    it("should handle error bursts", async () => {
      const error = new Error("Burst error");
      const entry = { context: {}, data: {}, error };

      // Create error burst
      for (let i = 0; i < 20; i++) {
        mockDate.mockReturnValue(1000 + i * 100); // 100ms between errors
        await processor.process(entry);
      }

      // Get the last result
      const result = await processor.process(entry);
      expect(result.data.frequency).toBe(20);
      expect(result.data.similarErrors.length).toBeGreaterThan(0);
    });
  });

  describe("Runtime Support", () => {
    it("should support Node.js and Edge runtimes", () => {
      expect(processor.supports(Runtime.NODE)).toBe(true);
      expect(processor.supports(Runtime.EDGE)).toBe(true);
      expect(processor.supports(Runtime.BROWSER)).toBe(false);
    });
  });
});
