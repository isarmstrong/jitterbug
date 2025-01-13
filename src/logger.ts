import { LogEntry, LogProcessor, LogTransport } from "./types";

export function processLog<T extends Record<string, unknown>>(
  entry: LogEntry<T>,
  processors: LogProcessor[],
): Promise<LogEntry<T>> {
  return processors.reduce(
    async (promise, processor) => processor.process(await promise),
    Promise.resolve(entry),
  );
}

export function writeLog<T extends Record<string, unknown>>(
  entry: LogEntry<T>,
  transports: LogTransport[],
): Promise<void[]> {
  return Promise.all(transports.map((transport) => transport.write(entry)));
}

export function processAndWrite<T extends Record<string, unknown>>(
  entry: LogEntry<T>,
  processors: LogProcessor[],
  transports: LogTransport[],
): Promise<void[]> {
  return processLog(entry, processors).then((processedEntry) =>
    writeLog(processedEntry, transports),
  );
}
