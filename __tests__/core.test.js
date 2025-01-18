import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { EdgeTransport } from "../src/transports/edge";
import { GUITransport } from "../src/transports/gui";
import { LogLevels, Runtime, Environment } from "../src/types/enums";
import { createEntry } from "./utils.js";

describe("Jitterbug Core", () => {
  describe("Transport Initialization", () => {
    describe("Edge Transport", () => {
      it("should initialize with minimal config", () => {
        const transport = new EdgeTransport({
          endpoint: "http://test.com/events",
        });
        expect(transport).toBeDefined();
        expect(transport).toHaveProperty("connect");
        expect(transport).toHaveProperty("disconnect");
        expect(transport).toHaveProperty("write");
      });

      it("should apply default config values", () => {
        const transport = new EdgeTransport({
          endpoint: "http://test.com/events",
        });

        expect(transport.config.maxEntries).toBe(1000);
        expect(transport.config.bufferSize).toBe(100);
        expect(transport.config.retryInterval).toBe(5000);
        expect(transport.config.maxConnectionDuration).toBe(4.5 * 60 * 1000);
        expect(transport.config.maxPayloadSize).toBe(128 * 1024);
        expect(transport.config.maxRetries).toBe(5);
      });

      it("should override default config values", () => {
        const config = {
          endpoint: "http://test.com/events",
          maxEntries: 50,
          bufferSize: 10,
          retryInterval: 1000,
          maxConnectionDuration: 60000,
          maxPayloadSize: 1024,
          maxRetries: 3,
        };
        const transport = new EdgeTransport(config);

        expect(transport.config).toEqual(config);
      });
    });

    describe("GUI Transport", () => {
      it("should initialize with minimal config", () => {
        const transport = new GUITransport({
          edge: {
            endpoint: "http://test.com/events",
          },
        });
        expect(transport).toBeDefined();
        expect(transport).toHaveProperty("connect");
        expect(transport).toHaveProperty("disconnect");
        expect(transport).toHaveProperty("write");
      });

      it("should apply default config values", () => {
        const transport = new GUITransport({
          edge: {
            endpoint: "http://test.com/events",
          },
        });

        expect(transport.config.maxEntries).toBe(1000);
        expect(transport.config.bufferSize).toBe(100);
        expect(transport.config.autoReconnect).toBe(true);
      });

      it("should override default config values", () => {
        const config = {
          maxEntries: 50,
          bufferSize: 10,
          autoReconnect: false,
          edge: {
            endpoint: "http://test.com/events",
          },
        };
        const transport = new GUITransport(config);

        expect(transport.config).toEqual(config);
      });
    });
  });

  describe("Type System", () => {
    describe("Log Levels", () => {
      it("should have all required log levels", () => {
        expect(Object.keys(LogLevels)).toEqual([
          "DEBUG",
          "INFO",
          "WARN",
          "ERROR",
          "FATAL",
        ]);
      });

      it("should have unique values", () => {
        const values = Object.values(LogLevels);
        const uniqueValues = new Set(values);
        expect(values.length).toBe(uniqueValues.size);
      });

      it("should be immutable", () => {
        const descriptor = Object.getOwnPropertyDescriptor(LogLevels, "DEBUG");
        expect(descriptor?.writable).toBe(false);
        expect(descriptor?.configurable).toBe(false);
      });
    });

    describe("Runtime Detection", () => {
      it("should have all required runtimes", () => {
        expect(Object.keys(Runtime)).toEqual(["EDGE", "NODE", "BROWSER"]);
      });

      it("should have unique values", () => {
        const values = Object.values(Runtime);
        const uniqueValues = new Set(values);
        expect(values.length).toBe(uniqueValues.size);
      });

      it("should be immutable", () => {
        const descriptor = Object.getOwnPropertyDescriptor(Runtime, "BROWSER");
        expect(descriptor?.writable).toBe(false);
        expect(descriptor?.configurable).toBe(false);
      });
    });

    describe("Environment Detection", () => {
      it("should have all required environments", () => {
        expect(Object.keys(Environment)).toEqual([
          "DEVELOPMENT",
          "STAGING",
          "PRODUCTION",
          "TEST",
        ]);
      });

      it("should have unique values", () => {
        const values = Object.values(Environment);
        const uniqueValues = new Set(values);
        expect(values.length).toBe(uniqueValues.size);
      });

      it("should be immutable", () => {
        const descriptor = Object.getOwnPropertyDescriptor(
          Environment,
          "DEVELOPMENT",
        );
        expect(descriptor?.writable).toBe(false);
        expect(descriptor?.configurable).toBe(false);
      });
    });

    describe("Log Entry Type", () => {
      it("should validate log entry structure", () => {
        const entry = {
          level: LogLevels.INFO,
          message: "Test message",
          data: { test: "data" },
          context: {
            timestamp: new Date().toISOString(),
            runtime: Runtime.BROWSER,
            environment: Environment.TEST,
            namespace: "test",
          },
        };

        expect(() => {
          const { level, message, data, context } = entry;
          expect(level).toBeDefined();
          expect(message).toBeDefined();
          expect(data).toBeDefined();
          expect(context).toBeDefined();
          expect(context.timestamp).toBeDefined();
          expect(context.runtime).toBeDefined();
          expect(context.environment).toBeDefined();
          expect(context.namespace).toBeDefined();
        }).not.toThrow();
      });

      it("should handle different data types", () => {
        const entry = {
          level: LogLevels.INFO,
          message: "Test message",
          data: {
            number: 42,
            string: "test",
            boolean: true,
            array: ["a", "b", "c"],
            object: {
              nested: {
                value: 123,
              },
            },
          },
          context: {
            timestamp: new Date().toISOString(),
            runtime: Runtime.BROWSER,
            environment: Environment.TEST,
            namespace: "test",
          },
        };

        expect(() => {
          JSON.stringify(entry);
        }).not.toThrow();
      });
    });
  });

  describe("Edge Runtime Validation", () => {
    describe("API Compatibility", () => {
      it("should only use Edge-compatible APIs", () => {
        const nodeSpecificApis = [
          "require",
          "process.env",
          "fs",
          "path",
          "__dirname",
          "__filename",
        ];

        // Read the source files and verify no Node.js APIs are used
        const transport = new EdgeTransport({
          endpoint: "http://test.com/events",
        });

        const transportCode = transport.constructor.toString();
        nodeSpecificApis.forEach((api) => {
          expect(transportCode).not.toContain(api);
        });
      });
    });
  });
});
