import { expect } from "vitest";
import { LogLevels, Environment } from "../../src/types/enums";

export function createTestEntry(level, message, data, context = {}) {
  return {
    level,
    message,
    data,
    context: {
      timestamp: new Date().toISOString(),
      runtime: "EDGE",
      environment: Environment.DEVELOPMENT,
      namespace: "test",
      ...context,
    },
  };
}

export function assertLogEntry(entry, level, dataCheck) {
  if (!entry) {
    throw new Error("Expected log entry to exist");
  }
  if (!entry.data) {
    throw new Error("Expected log entry to have data");
  }
  expect(entry.level).toBe(level);
  expect(dataCheck(entry.data)).toBe(true);
}
