import type {
  LogEntry,
  Processor,
  LogTransport,
} from "./types/index.js";

export async function processLog<T extends Record<string, unknown>>(
  entry: LogEntry<T>,
  processors: Processor[],
): Promise<LogEntry<T>> {
  let processedEntry = { ...entry };

  for (const processor of processors) {
    processedEntry = await processor.process(processedEntry);
  }

  return processedEntry;
}

export async function writeLog<T extends Record<string, unknown>>(
  entry: LogEntry<T>,
  transports: LogTransport[],
): Promise<void> {
  const promises = transports.map((transport) => transport.write(entry));
  await Promise.all(promises);
}

export async function processAndWrite<T extends Record<string, unknown>>(
  entry: LogEntry<T>,
  processors: Processor[],
  transports: LogTransport[],
): Promise<void> {
  const processedEntry = await processLog(entry, processors);
  await writeLog(processedEntry, transports);
}
