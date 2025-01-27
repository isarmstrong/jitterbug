import { describe, it, expect, beforeEach } from "vitest";
import { ErrorAggregationProcessor } from "../../src/processors/error-aggregation";
import { Runtime } from "../../src/types/core";

describe("ErrorAggregationProcessor", () => {
  let processor;

  beforeEach(() => {
    processor = new ErrorAggregationProcessor();
  });

  describe("Basic Error Processing", () => {
    it("should process errors correctly", async () => {
      const error = new Error("Test error");
      const entry = {
        level: "ERROR",
        message: "Test message",
        error,
        context: {
          timestamp: new Date().toISOString(),
          runtime: Runtime.NODE,
          environment: "TEST",
          namespace: "test"
        }
      };

      const result = await processor.process(entry);
      expect(result.context.error.errorType).toBe("Error");
      expect(result.context.error.errorMessage).toBe("Test error");
      expect(result.context.error.patternId).toBeDefined();
      expect(result.context.error.errorGroup).toBeDefined();
      expect(result.context.error.frequency).toBe(1);
    });

    it("should handle entries without errors", async () => {
      const entry = {
        level: "INFO",
        message: "Test message",
        context: {
          timestamp: new Date().toISOString(),
          runtime: Runtime.NODE,
          environment: "TEST",
          namespace: "test"
        }
      };

      const result = await processor.process(entry);
      expect(result).toBe(entry);
    });
  });

  describe("Error Pattern Recognition", () => {
    it("should detect error patterns", async () => {
      const error = new Error("Test error");
      const entry = {
        level: "ERROR",
        message: "Test message",
        error,
        context: {
          timestamp: new Date().toISOString(),
          runtime: Runtime.NODE,
          environment: "TEST",
          namespace: "test"
        }
      };

      // Process same error twice
      await processor.process(entry);
      const result = await processor.process(entry);

      expect(result.context.error.frequency).toBe(2);
      expect(result.context.error.similarErrors.length).toBeGreaterThan(0);
    });

    it("should handle different error types", async () => {
      const error1 = new Error("Test error 1");
      const error2 = new TypeError("Test error 2");

      const entry1 = {
        level: "ERROR",
        message: "Test message 1",
        error: error1,
        context: {
          timestamp: new Date().toISOString(),
          runtime: Runtime.NODE,
          environment: "TEST",
          namespace: "test"
        }
      };

      const entry2 = {
        level: "ERROR",
        message: "Test message 2",
        error: error2,
        context: {
          timestamp: new Date().toISOString(),
          runtime: Runtime.NODE,
          environment: "TEST",
          namespace: "test"
        }
      };

      const result1 = await processor.process(entry1);
      const result2 = await processor.process(entry2);

      expect(result1.context.error.patternId).not.toBe(result2.context.error.patternId);
      expect(result1.context.error.errorGroup).not.toBe(result2.context.error.errorGroup);
    });
  });

  describe("Error Frequency Analysis", () => {
    it("should track error frequency", async () => {
      const error = new Error("Test error");
      const entry = {
        level: "ERROR",
        message: "Test message",
        error,
        context: {
          timestamp: new Date().toISOString(),
          runtime: Runtime.NODE,
          environment: "TEST",
          namespace: "test"
        }
      };

      // Process same error three times
      await processor.process(entry);
      await processor.process(entry);
      const result = await processor.process(entry);

      expect(result.context.error.frequency).toBe(3);
    });

    it("should handle error bursts", async () => {
      const error = new Error("Test error");
      const entry = {
        level: "ERROR",
        message: "Test message",
        error,
        context: {
          timestamp: new Date().toISOString(),
          runtime: Runtime.NODE,
          environment: "TEST",
          namespace: "test"
        }
      };

      // Process same error multiple times in quick succession
      for (let i = 0; i < 25; i++) {
        await processor.process(entry);
      }

      // Get the last result
      const result = await processor.process(entry);
      expect(result.context.error.frequency).toBe(26);
      expect(result.context.error.similarErrors.length).toBeGreaterThan(0);
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
