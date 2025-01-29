import type { LogEntry, LogLevel } from "../types/core";
import { AsyncBaseTransport } from "./async-base";
import { LogLevels } from "../types/enums";

/**
 * Console transport configuration
 */
export interface ConsoleConfig {
  colors?: boolean;
}

/**
 * Console transport implementation
 */
export class ConsoleTransport extends AsyncBaseTransport {
  private readonly config: Required<ConsoleConfig>;

  constructor(config: ConsoleConfig = {}) {
    super();
    this.config = {
      colors: config.colors ?? true
    };
  }

  protected async writeToTransport<T extends Record<string, unknown>>(entry: LogEntry<T>): Promise<void> {
    const formatted = this.formatEntry(entry);

    // Use type-safe switch with LogLevels enum
    switch (entry.level) {
      case LogLevels.ERROR:
      case LogLevels.FATAL:
        console.error(formatted);
        break;
      case LogLevels.WARN:
        console.warn(formatted);
        break;
      case LogLevels.INFO:
        console.info(formatted);
        break;
      case LogLevels.DEBUG:
      default:
        console.debug(formatted);
    }

    return Promise.resolve();
  }
}
