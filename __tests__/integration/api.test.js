import { describe, it, beforeEach, expect } from "vitest";
import { createJitterbug } from "../../src/core";
import { LogLevels } from "../../src/types/enums";
import { MockProcessor, MockTransport } from "../unit/mocks";

describe("API Integration", () => {
  let processor;
  let transport;
  let logger;

  beforeEach(() => {
    processor = new MockProcessor();
    transport = new MockTransport();
    logger = createJitterbug({
      namespace: "api-integration",
      processors: [processor],
      transports: [transport],
    });
  });

  describe("Edge Function Integration", () => {
    it("should track Edge function execution", async () => {
      await logger.info("Edge function executed", {
        function: {
          name: "processImage",
          region: "iad1",
          duration: 250,
          memory: {
            used: 128,
            limit: 256,
          },
        },
      });

      const entry = processor.entries[0];
      expect(entry.level).toBe(LogLevels.INFO);
      expect(entry.data.function.name).toBe("processImage");
      expect(entry.data.function.duration).toBe(250);
    });

    it("should handle Edge function errors", async () => {
      const error = new Error("Memory limit exceeded");
      await logger.error("Edge function failed", error, {
        function: {
          name: "processVideo",
          region: "sfo1",
          memory: {
            used: 512,
            limit: 256,
          },
          error: {
            code: "MEMORY_LIMIT",
            retryable: false,
          },
        },
      });

      const entry = processor.entries[0];
      expect(entry.level).toBe(LogLevels.ERROR);
      expect(entry.error).toBe(error);
      expect(entry.data.function.error.code).toBe("MEMORY_LIMIT");
    });
  });

  describe("Cache Integration", () => {
    it("should track cache operations", async () => {
      await logger.debug("Cache operation", {
        cache: {
          operation: "set",
          key: "user:123",
          size: 2048,
          ttl: 3600,
          backend: "KV",
        },
      });

      const entry = processor.entries[0];
      expect(entry.level).toBe(LogLevels.DEBUG);
      expect(entry.data.cache.operation).toBe("set");
      expect(entry.data.cache.backend).toBe("KV");
    });
  });
});
