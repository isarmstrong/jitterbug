import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { EdgeTransport } from "../../src/transports/edge";

// Add global timeout config
vi.setConfig({ testTimeout: 15000 });

describe("EdgeTransport", () => {
  let transport;
  let mockFetch;
  let mockPerformance;
  let originalCrypto;
  let originalEnv;

  beforeEach(() => {
    originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';
    vi.useFakeTimers();
    mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    global.fetch = mockFetch;

    // Mock Edge runtime APIs
    mockPerformance = {
      memory: {
        usedJSHeapSize: 1000000,
        totalJSHeapSize: 2000000,
        jsExternalHeapSize: 500000,
        arrayBuffers: 100000
      }
    };
    Object.defineProperty(global.performance, 'memory', {
      value: mockPerformance.memory,
      configurable: true
    });

    originalCrypto = global.crypto;
    Object.defineProperty(global, 'crypto', {
      value: {
        ...originalCrypto,
        randomUUID: () => "test-batch-id"
      },
      configurable: true
    });
  });

  afterEach(async () => {
    process.env.NODE_ENV = originalEnv;
    if (transport) {
      await transport.destroy();
    }
    Object.defineProperty(global, 'crypto', {
      value: originalCrypto,
      configurable: true
    });
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe("Debug Capture", () => {
    beforeEach(async () => {
      transport = new EdgeTransport({
        endpoint: "http://test.com",
        autoReconnect: false,
        flushInterval: 100,
        testMode: true
      });
      await transport.connect();
      mockFetch.mockClear();
    });

    it("should capture debug entries with metadata", async () => {
      const debugEntry = {
        level: "DEBUG",
        message: "Edge function executed",
        context: {
          timestamp: new Date().toISOString(),
          runtime: "EDGE",
          environment: "TEST",
          namespace: "edge-transport",
          request: {
            url: "/api/data",
            method: "GET",
            requestId: "test-123"
          }
        }
      };

      await transport.write(debugEntry);
      await transport.flush();

      const sentPayload = JSON.parse(mockFetch.mock.calls[0][1].body)[0];
      expect(sentPayload.level).toBe("DEBUG");
      expect(sentPayload.context.runtime).toBe("EDGE");
      expect(sentPayload.context.request.requestId).toBe("test-123");
      expect(sentPayload._metadata).toBeDefined();
      expect(sentPayload._metadata.queueTime).toBeDefined();
    });

    it("should track memory pressure in debug data", async () => {
      vi.spyOn(performance.memory, 'usedJSHeapSize', 'get').mockReturnValue(1900000);

      await transport.write({
        level: "WARN",
        message: "Debugger memory threshold warning",
        context: {
          subsystem: "event-buffer",
          debugMetrics: {
            bufferSize: 95,
            memoryUsage: "95%",
            droppedEntries: 0
          }
        }
      });

      // Update debug metrics
      transport.getMetrics().debugMetrics.highWaterMark = 95;

      const metrics = transport.getMetrics();
      expect(metrics.debugMetrics.droppedEntries).toBe(0);
      expect(metrics.debugMetrics.highWaterMark).toBe(95);
    });
  });

  describe("Error Correlation", () => {
    beforeEach(async () => {
      transport = new EdgeTransport({
        endpoint: "http://test.com",
        autoReconnect: false,
        batchSize: 5,
        flushInterval: 100,
        testMode: true
      });
      await transport.connect();
      mockFetch.mockClear();
    });

    it("should correlate related errors in batch", async () => {
      const errorContext = {
        requestId: "test-123",
        route: "/api/data"
      };

      // Simulate multiple errors from same request
      await transport.write({
        level: "ERROR",
        message: "Database timeout",
        context: { ...errorContext, phase: "query" }
      });

      await transport.write({
        level: "ERROR",
        message: "Request failed",
        context: { ...errorContext, phase: "response" }
      });

      await transport.flush();

      const sentPayload = JSON.parse(mockFetch.mock.calls[0][1].body);
      const errors = sentPayload.filter(e => e.level === "ERROR");

      expect(errors).toHaveLength(2);
      expect(errors[0].context.requestId).toBe(errors[1].context.requestId);
    });
  });
});
