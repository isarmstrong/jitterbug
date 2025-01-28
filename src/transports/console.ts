import type { LogEntry } from "../types/core";
import { BaseTransport } from "./types";

/**
 * Console transport configuration
 */
export interface ConsoleConfig {
  colors?: boolean;
}

/**
 * Console transport implementation
 */
export class ConsoleTransport extends BaseTransport {
  constructor(_config: ConsoleConfig = {}) {
    super({
      enabled: true,
      format: "pretty"
    });
  }

  public async write<T extends Record<string, unknown>>(entry: LogEntry<T>): Promise<void> {
    if (!this.shouldLog(entry.level)) {
      return;
    }

    const formatted = this.formatEntry(entry);

    switch (entry.level) {
      case "ERROR":
      case "FATAL":
        console.error(formatted);
        break;
      case "WARN":
        console.warn(formatted);
        break;
      case "INFO":
        console.info(formatted);
        break;
      default:
        console.debug(formatted);
    }
  }
}
