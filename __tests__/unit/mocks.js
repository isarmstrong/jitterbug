import { Runtime, Environment } from "../../src/types/enums";

export class MockProcessor {
  constructor() {
    this.entries = [];
  }

  supports(runtime) {
    return true;
  }

  allowedIn(environment) {
    return true;
  }

  async process(entry) {
    // Create a deep copy of the entry to avoid mutation
    const processedEntry = {
      ...entry,
      context: {
        ...entry.context,
        // Move cache data from data to context
        cache: entry.data?.cache || {}
      }
    };

    // Copy any debug metadata
    if (entry.data?._debug) {
      processedEntry._debug = { ...entry.data._debug };
    }

    // Remove cache from data since it's now in context
    if (processedEntry.data) {
      const { cache, ...rest } = processedEntry.data;
      processedEntry.data = Object.keys(rest).length > 0 ? rest : undefined;
    }

    this.entries.push(processedEntry);
    return processedEntry;
  }
}

export class MockTransport {
  constructor() {
    this.entries = [];
  }

  async write(entry) {
    this.entries.push(entry);
  }
}
