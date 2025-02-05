export { createDebug, createJitterbug, factory } from "./core";
export { ErrorAggregationProcessor } from "./processors/error-aggregation";
export { MetricsProcessor } from "./processors/metrics";
export { SanitizeProcessor } from "./processors/sanitize";
export { ConsoleTransport } from "./transports/console";
export { EdgeTransport, type EdgeTransportConfig } from "./transports/edge";
export * from "./types";
export { Environment, LogLevels, Runtime } from "./types/core";

// Export EBL types
export type { ValidationResult } from "./types/ebl/core";
export type { RuntimeEnvironment, RuntimeGuard } from "./types/ebl/guards";
export type { MemoryMetricKey, MemoryMetrics, MemoryUnit } from "./types/ebl/memory";
export type { ValidationStrategy, ValidationStrategyConfig } from "./types/ebl/strategy";

// Export subpath exports for transports
export * as console from "./transports/console";
export * as edge from "./transports/edge";

