import { describe, it, beforeEach, expect } from "vitest";
import { createJitterbug } from "../../src/core";
import { LogLevels } from "../../src/types/enums";
import { MockProcessor, MockTransport } from "./mocks";

describe("Cache Plugin Diagnostics", () => {
  let processor;
  let transport;
  let logger;

  beforeEach(() => {
    processor = new MockProcessor();
    transport = new MockTransport();
    logger = createJitterbug({
      namespace: "cache-debug",
      processors: [processor],
      transports: [transport],
    });
  });

  describe("Cache Operation Monitoring", () => {
    it("should track cache operation timing", async () => {
      const data = {
        cache: {
          operation: "set",
          key: "user:123",
          duration: 15,
          size: 2048
        }
      };

      await logger.debug("Cache operation timing", data);

      const entry = processor.entries[0];
      expect(entry.level).toBe(LogLevels.DEBUG);
      expect(entry.context.cache.operation).toBe("set");
      expect(entry.context.cache.duration).toBe(15);
    });

    it("should monitor cache errors", async () => {
      const error = new Error("Cache operation failed");
      const data = {
        cache: {
          operation: "get",
          key: "user:123",
          duration: 5000
        }
      };

      await logger.error("Cache error detected", error, data);

      const entry = processor.entries[0];
      expect(entry.level).toBe(LogLevels.ERROR);
      expect(entry.error).toBe(error);
      expect(entry.context.cache.operation).toBe("get");
      expect(entry.context.cache.duration).toBe(5000);
    });

    it("should track cache operation patterns", async () => {
      const data = {
        cache: {
          operation: "set",
          key: "users:batch",
          size: 6144,
          duration: 25,
          ttl: 3600
        }
      };

      await logger.info("Cache operation pattern", data);

      const entry = processor.entries[0];
      expect(entry.level).toBe(LogLevels.INFO);
      expect(entry.context.cache.size).toBe(6144);
      expect(entry.context.cache.ttl).toBe(3600);
    });
  });

  describe("Cache Debug Metadata", () => {
    it("should track debug timing information", async () => {
      const data = {
        cache: {
          operation: "get",
          key: "test:key",
          duration: 50,
          hit: true
        },
        _debug: {
          operationId: 'debug-123',
          timing: {
            start: performance.now() - 50,
            end: performance.now(),
            duration: 50
          },
          memoryDelta: -1024
        }
      };

      await logger.debug("Cache debug timing", data);

      const entry = processor.entries[0];
      expect(entry.context.cache.hit).toBe(true);
      expect(entry._debug.timing.duration).toBe(50);
      expect(entry._debug.memoryDelta).toBe(-1024);
    });
  });
});
