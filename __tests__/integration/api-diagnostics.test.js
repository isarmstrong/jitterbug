import { describe, it, beforeEach, expect } from "vitest";
import { createJitterbug } from "../../src/core";
import { LogLevels } from "../../src/types/enums";
import { MockProcessor, MockTransport } from "../unit/mocks";

describe("API Diagnostics Integration", () => {
  let processor;
  let transport;
  let logger;

  beforeEach(() => {
    processor = new MockProcessor();
    transport = new MockTransport();
    logger = createJitterbug({
      namespace: "api-diagnostics",
      processors: [processor],
      transports: [transport],
    });
  });

  describe("Request Lifecycle", () => {
    it("should track API request lifecycle", async () => {
      await logger.info("API request started", {
        request: {
          method: "POST",
          path: "/api/data",
          headers: {
            "content-type": "application/json",
          },
        },
      });

      const entry = processor.entries[0];
      expect(entry.level).toBe(LogLevels.INFO);
      expect(entry.data.request.method).toBe("POST");
      expect(entry.data.request.path).toBe("/api/data");
    });

    it("should handle API errors", async () => {
      const error = new Error("Rate limit exceeded");
      await logger.error("API request failed", error, {
        request: {
          method: "GET",
          path: "/api/users",
          rateLimit: {
            limit: 100,
            remaining: 0,
            reset: Date.now() + 60000,
          },
        },
      });

      const entry = processor.entries[0];
      expect(entry.level).toBe(LogLevels.ERROR);
      expect(entry.error).toBe(error);
      expect(entry.data.request.rateLimit.remaining).toBe(0);
    });
  });

  describe("Performance Monitoring", () => {
    it("should track response times", async () => {
      await logger.debug("API response time", {
        request: {
          method: "GET",
          path: "/api/products",
        },
        performance: {
          total: 250,
          db: 150,
          cache: 20,
        },
      });

      const entry = processor.entries[0];
      expect(entry.level).toBe(LogLevels.DEBUG);
      expect(entry.data.performance.total).toBe(250);
      expect(entry.data.performance.db).toBe(150);
    });
  });
});
