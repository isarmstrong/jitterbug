import { describe, it, beforeEach, expect } from "vitest";
import { createJitterbug } from "../../src/core";
import { LogLevels } from "../../src/types/enums";

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

describe("Cache Plugin Diagnostics", () => {
  let processor;
  let transport;
  let logger;

  beforeEach(() => {
    processor = new MockProcessor();
    transport = new MockTransport();
    logger = createJitterbug({
      namespace: "cache-plugins",
      processors: [processor],
      transports: [transport],
    });
  });

  describe("Upstash Redis Plugin", () => {
    it("should track JSON serialization operations", async () => {
      await logger.debug("Cache serialization", {
        cache: {
          operation: "set",
          key: "user:123",
          valueType: "object",
          serializedSize: 2048,
          duration: 15,
        },
        metrics: {
          compressionRatio: 0.75,
          serializationTime: 5,
        },
      });

      const entry = processor.entries[0];
      expect(entry.level).toBe(LogLevels.DEBUG);
      expect(entry.data.cache.valueType).toBe("object");
      expect(entry.data.metrics.compressionRatio).toBe(0.75);
    });

    it("should handle connection errors", async () => {
      const error = new Error("Redis connection timeout");
      await logger.error("Redis connection failed", error, {
        cache: {
          operation: "connect",
          host: "redis.upstash.com",
          retries: 3,
          duration: 5000,
        },
      });

      const entry = processor.entries[0];
      expect(entry.level).toBe(LogLevels.ERROR);
      expect(entry.error).toBe(error);
      expect(entry.data.cache.retries).toBe(3);
    });

    it("should track batch operations", async () => {
      await logger.info("Batch cache operation", {
        cache: {
          operation: "mset",
          keys: ["user:1", "user:2", "user:3"],
          totalSize: 6144,
          duration: 25,
        },
      });

      const entry = processor.entries[0];
      expect(entry.level).toBe(LogLevels.INFO);
      expect(entry.data.cache.keys.length).toBe(3);
      expect(entry.data.cache.totalSize).toBe(6144);
    });
  });

  describe("KV Plugin", () => {
    it("should track list operations", async () => {
      await logger.debug("KV list operation", {
        cache: {
          operation: "list",
          prefix: "user:",
          limit: 100,
          cursor: "next_cursor",
          duration: 50,
        },
      });

      const entry = processor.entries[0];
      expect(entry.level).toBe(LogLevels.DEBUG);
      expect(entry.data.cache.prefix).toBe("user:");
      expect(entry.data.cache.limit).toBe(100);
    });

    it("should handle storage quota errors", async () => {
      const error = new Error("Storage quota exceeded");
      await logger.error("KV storage quota exceeded", error, {
        cache: {
          operation: "set",
          key: "large:object",
          size: 1024 * 1024 * 100, // 100MB
          quotaLimit: 1024 * 1024 * 50, // 50MB
        },
      });

      const entry = processor.entries[0];
      expect(entry.level).toBe(LogLevels.ERROR);
      expect(entry.error).toBe(error);
      expect(entry.data.cache.size).toBeGreaterThan(
        entry.data.cache.quotaLimit,
      );
    });
  });
});
