import React, { useEffect, useState, useMemo, useCallback, type ReactElement } from "react";
import type { LogEntry } from "../types/types.js";
import type { GUITransport, GUITransportState } from "./gui.js";

interface GUIProps {
  maxEntries?: number;
  transport: GUITransport;
}

export function GUI({ maxEntries = 1000, transport }: GUIProps): ReactElement {
  type LogEntryType = LogEntry<Record<string, unknown>>;

  const [entries, setEntries] = useState<LogEntryType[]>([]);
  const [filters, setFilters] = useState<Record<string, boolean>>({});

  // Register transport state updates
  useEffect(() => {
    const callback = (state: GUITransportState): void => {
      setFilters({ ...state.filters });
      setEntries([...state.entries]);
    };

    transport.onStateUpdate(callback);
    // Cleanup function
    return (): void => {
      // Note: The transport should handle callback removal internally
      transport.destroy().catch(console.error);
    };
  }, [transport]);

  // Add explicit return types to callbacks
  const handleFilterChange = useCallback((namespace: string, value: boolean): void => {
    transport.setFilter(namespace, value);
  }, [transport]);

  // Manage entry limit
  useEffect(() => {
    if (maxEntries > 0 && entries.length > maxEntries) {
      setEntries(prev => prev.slice(-maxEntries));
    }
  }, [entries.length, maxEntries]);

  // Filter entries based on namespace
  const filteredEntries = useMemo(() => {
    return entries.filter((entry): boolean => {
      const namespace = entry.context?.namespace;
      return typeof namespace === 'string' &&
        namespace.length > 0 &&
        filters[namespace] !== false;
    });
  }, [entries, filters]);

  // Get unique namespaces
  const namespaces = useMemo((): string[] => {
    const uniqueNamespaces = new Set<string>();

    entries.forEach((entry) => {
      const namespace = entry.context?.namespace;
      if (typeof namespace === 'string' && namespace.length > 0) {
        uniqueNamespaces.add(namespace);
      }
    });

    return Array.from(uniqueNamespaces);
  }, [entries]);

  return (
    <div className="p-4">
      <div className="mb-4 flex justify-between items-center">
        <h3 className="font-semibold">Debug Console</h3>
        <div className="space-x-2">
          {namespaces.map((namespace) => {
            const isEnabled = filters[namespace] ?? true;
            return (
              <button
                key={namespace}
                onClick={(): void => handleFilterChange(namespace, !isEnabled)}
                className={`px-2 py-1 text-sm rounded ${isEnabled
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 text-gray-700"
                  }`}
              >
                {namespace}
              </button>
            );
          })}
        </div>
      </div>
      <div className="space-y-2">
        {filteredEntries.map((entry, index) => (
          <div
            key={`${entry.context?.timestamp ?? ''}-${index}`}
            className="p-2 bg-gray-50 rounded"
          >
            <pre className="whitespace-pre-wrap">
              {JSON.stringify(entry, null, 2)}
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
}
