import React, { useEffect, useState } from "react";
import type { LogTransport, LogEntry, RuntimeType } from "../types/types";
import { LogLevels, Runtime } from "../types/enums";

interface GUIConfig {
  maxEntries?: number;
  defaultFilters?: Record<string, boolean>;
  bufferSize?: number;
  retryInterval?: number;
  edge?: {
    endpoint: string;
  };
}

interface BufferedEntry<T extends Record<string, unknown>> {
  entry: LogEntry<T>;
  timestamp: number;
}

export class GUITransport implements LogTransport {
  private _entries: LogEntry<Record<string, unknown>>[] = [];
  private _buffer: BufferedEntry<Record<string, unknown>>[] = [];
  private _filters: Record<string, boolean> = {};
  private _namespaces = new Set<string>();
  private _maxEntries: number;
  private _bufferSize: number;
  private _retryInterval: number;
  private _onUpdate?: () => void;
  private _isConnected: boolean = false;
  private _retryTimeout?: NodeJS.Timeout;
  private _eventSource?: EventSource;

  constructor(config?: GUIConfig) {
    this._maxEntries = config?.maxEntries ?? 1000;
    this._bufferSize = config?.bufferSize ?? 500;
    this._retryInterval = config?.retryInterval ?? 5000;
    this._filters = config?.defaultFilters ?? {};

    if (config?.edge) {
      this._setupEventSource(config.edge.endpoint);
    }
  }

  configure(config: GUIConfig): void {
    if (config.maxEntries) {
      this._maxEntries = config.maxEntries;
    }
    if (config.bufferSize) {
      this._bufferSize = config.bufferSize;
    }
    if (config.retryInterval) {
      this._retryInterval = config.retryInterval;
    }
    if (config.defaultFilters) {
      this._filters = { ...this._filters, ...config.defaultFilters };
    }
    if (config.edge?.endpoint) {
      this._setupEventSource(config.edge.endpoint);
    }
  }

  private _setupEventSource(endpoint: string): void {
    this._eventSource?.close();

    this._eventSource = new EventSource(endpoint);

    this._eventSource.onopen = () => {
      this._isConnected = true;
      this._processBuffer();
    };

    this._eventSource.onmessage = (event: MessageEvent<string>) => {
      try {
        const entry = JSON.parse(event.data) as LogEntry<
          Record<string, unknown>
        >;
        this._addEntry(entry);
      } catch (error) {
        console.error("Failed to parse event data:", error);
      }
    };

    this._eventSource.onerror = (error: Event) => {
      this._isConnected = false;
      console.error("EventSource error:", error);
      this._scheduleReconnect();
    };
  }

  supports(runtime: RuntimeType): boolean {
    return runtime === Runtime.BROWSER;
  }

  async write<T extends Record<string, unknown>>(
    entry: LogEntry<T>,
  ): Promise<void> {
    if (!this._filters[entry.context.namespace]) return;

    if (!this._isConnected) {
      this._bufferEntry(entry as LogEntry<Record<string, unknown>>);
      return;
    }

    this._addEntry(entry as LogEntry<Record<string, unknown>>);
  }

  private _bufferEntry<T extends Record<string, unknown>>(
    entry: LogEntry<T>,
  ): void {
    const bufferedEntry: BufferedEntry<Record<string, unknown>> = {
      entry: entry as LogEntry<Record<string, unknown>>,
      timestamp: Date.now(),
    };

    this._buffer.push(bufferedEntry);

    while (this._buffer.length > this._bufferSize) {
      this._buffer.shift();
    }
  }

  private _addEntry<T extends Record<string, unknown>>(
    entry: LogEntry<T>,
  ): void {
    this._entries.push(entry as LogEntry<Record<string, unknown>>);
    this._namespaces.add(entry.context.namespace);

    if (this._entries.length > this._maxEntries) {
      this._entries.shift();
    }

    this._onUpdate?.();
  }

  setFilter(namespace: string, enabled: boolean): void {
    this._filters[namespace] = enabled;
  }

  onUpdate(callback: () => void): void {
    this._onUpdate = callback;
  }

  getEntries(): LogEntry<Record<string, unknown>>[] {
    return this._entries;
  }

  getNamespaces(): string[] {
    return Array.from(this._namespaces);
  }

  connect(): void {
    // EventSource does not support connect method
  }

  disconnect(): void {
    this._eventSource?.close();
  }

  private _processBuffer(): void {
    const now = Date.now();
    const validEntries = this._buffer.filter(
      (buffered) => now - buffered.timestamp <= this._retryInterval,
    );

    validEntries.forEach((buffered) => {
      this._addEntry(buffered.entry);
    });

    this._buffer = [];
  }

  private _scheduleReconnect(): void {
    if (this._retryTimeout) {
      clearTimeout(this._retryTimeout);
    }

    const endpoint = this._eventSource?.url;
    if (!endpoint) {
      console.error("No endpoint available for reconnection");
      return;
    }

    this._retryTimeout = setTimeout(() => {
      this._setupEventSource(endpoint);
    }, this._retryInterval);
  }
}

interface DebugUIProps {
  transport: GUITransport;
}

export function DebugUI({ transport }: DebugUIProps): JSX.Element {
  const [entries, setEntries] = useState<LogEntry<Record<string, unknown>>[]>(
    [],
  );
  const [namespaces, setNamespaces] = useState<string[]>([]);
  const [filters, setFilters] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const updateUI = () => {
      setEntries([...transport.getEntries()]);
      setNamespaces(transport.getNamespaces());
    };

    transport.onUpdate(updateUI);
    updateUI();

    return () => transport.onUpdate(() => { });
  }, [transport]);

  const toggleNamespace = (namespace: string) => {
    const newFilters = {
      ...filters,
      [namespace]: !filters[namespace],
    };
    setFilters(newFilters);
    transport.setFilter(namespace, newFilters[namespace]);
  };

  return (
    <div className="fixed bottom-0 right-0 w-96 h-96 bg-white border shadow-lg overflow-hidden flex flex-col">
      <div className="p-2 border-b flex items-center justify-between">
        <h3 className="font-semibold">Debug Console</h3>
        <div className="space-x-2">
          {namespaces.map((namespace) => (
            <button
              key={namespace}
              onClick={() => toggleNamespace(namespace)}
              className={`px-2 py-1 text-sm rounded ${filters[namespace]
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 text-gray-700"
                }`}
            >
              {namespace}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-auto p-2 space-y-2 font-mono text-sm">
        {entries.map((entry, i) => (
          <div
            key={i}
            className={`p-2 rounded ${entry.level === LogLevels.ERROR || entry.level === LogLevels.FATAL
                ? "bg-red-50"
                : entry.level === LogLevels.WARN
                  ? "bg-yellow-50"
                  : "bg-gray-50"
              }`}
          >
            <div className="flex items-center space-x-2">
              <span className="text-gray-500">
                {new Date(entry.context.timestamp).toISOString().split("T")[1]}
              </span>
              <span
                className={`px-1 rounded ${entry.level === LogLevels.ERROR ||
                    entry.level === LogLevels.FATAL
                    ? "bg-red-200 text-red-800"
                    : entry.level === LogLevels.WARN
                      ? "bg-yellow-200 text-yellow-800"
                      : "bg-gray-200 text-gray-800"
                  }`}
              >
                {entry.level}
              </span>
              <span className="font-medium">{entry.context.namespace}</span>
            </div>
            <div className="mt-1">{entry.message}</div>
            {entry.data && (
              <pre className="mt-1 text-xs bg-gray-100 p-1 rounded overflow-auto">
                {JSON.stringify(entry.data, null, 2)}
              </pre>
            )}
            {entry.error && (
              <pre className="mt-1 text-xs bg-red-100 text-red-800 p-1 rounded overflow-auto">
                {entry.error.stack || entry.error.message}
              </pre>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
