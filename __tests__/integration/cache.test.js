import { describe, it, beforeEach, expect } from "vitest";
import { createJitterbug } from "../../src/core";
import { LogLevels } from "../../src/types/enums";
import { MockProcessor, MockTransport } from "../unit/mocks";

describe("Cache Integration", () => {
  let processor;
  let transport;
  let logger;

  beforeEach(() => {
    processor = new MockProcessor();
    transport = new MockTransport();
    logger = createJitterbug({
      namespace: "cache-integration",
      processors: [processor],
      transports: [transport],
    });
  });

  describe("KV Operations", () => {
    it("should track KV write operations", async () => {
      await logger.debug("KV write operation", {
        cache: {
          operation: "set",
          key: "product:123",
          size: 1024,
          ttl: 3600,
          metadata: {
            type: "product",
            version: 2,
          },
        },
      });

      const entry = processor.entries[0];
      expect(entry.level).toBe(LogLevels.DEBUG);
      expect(entry.data.cache.operation).toBe("set");
      expect(entry.data.cache.metadata.type).toBe("product");
    });

    it("should handle KV errors", async () => {
      const error = new Error("Key not found");
      await logger.error("KV operation failed", error, {
        cache: {
          operation: "get",
          key: "missing:123",
          error: {
            code: "KEY_NOT_FOUND",
            retryable: false,
          },
        },
      });

      const entry = processor.entries[0];
      expect(entry.level).toBe(LogLevels.ERROR);
      expect(entry.error).toBe(error);
      expect(entry.data.cache.error.code).toBe("KEY_NOT_FOUND");
    });
  });

  describe("Redis Operations", () => {
    it("should track Redis pipeline operations", async () => {
      await logger.info("Redis pipeline executed", {
        cache: {
          operation: "pipeline",
          commands: ["set", "expire", "get"],
          duration: 50,
          size: {
            commands: 3,
            bytes: 2048,
          },
        },
      });

      const entry = processor.entries[0];
      expect(entry.level).toBe(LogLevels.INFO);
      expect(entry.data.cache.operation).toBe("pipeline");
      expect(entry.data.cache.size.commands).toBe(3);
    });

    it("should handle Redis connection errors", async () => {
      const error = new Error("Connection refused");
      await logger.error("Redis connection failed", error, {
        cache: {
          operation: "connect",
          host: "redis.internal",
          port: 6379,
          error: {
            code: "ECONNREFUSED",
            retryable: true,
          },
        },
      });

      const entry = processor.entries[0];
      expect(entry.level).toBe(LogLevels.ERROR);
      expect(entry.error).toBe(error);
      expect(entry.data.cache.error.retryable).toBe(true);
    });
  });
});
