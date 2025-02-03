import React, {
  Component,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactElement
} from "react";
import type { LogEntry } from "../types";
import type { GUITransportState } from "./gui-transport";
import { GUITransport } from "./gui-transport";

interface GUIProps {
  maxEntries?: number;
  transport: GUITransport;
}

// Error boundary for the GUI component
class GUIErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-50 text-red-700 rounded">
          <h3 className="font-semibold">Debug Console Error</h3>
          <p>Something went wrong loading the debug console.</p>
        </div>
      );
    }

    return this.props.children;
  }
}

function GUIContent({ maxEntries = 1000, transport }: GUIProps): ReactElement {
  type LogEntryType = LogEntry<Record<string, unknown>>;

  const [entries, setEntries] = useState<LogEntryType[]>([]);
  const [filters, setFilters] = useState<Record<string, boolean>>({});
  const [isPending, startTransition] = useTransition();
  const callbackRef = useRef<((state: GUITransportState) => void) | null>(null);

  // Register transport state updates with proper cleanup
  useEffect(() => {
    const callback = (state: GUITransportState): void => {
      startTransition(() => {
        setFilters({ ...state.filters });
        setEntries([...state.entries]);
      });
    };

    callbackRef.current = callback;
    transport.onStateUpdate(callback);

    return () => {
      const currentCallback = callbackRef.current;
      if (currentCallback) {
        // Properly remove the callback before destroying
        transport.onStateUpdate(currentCallback);
        transport.destroy().catch(console.error);
        callbackRef.current = null;
      }
    };
  }, [transport]);

  // Add explicit return types to callbacks with memoization
  const handleFilterChange = useCallback((namespace: string, value: boolean): void => {
    startTransition(() => {
      transport.setFilter(namespace, value);
    });
  }, [transport]);

  // Manage entry limit with transition
  useEffect(() => {
    if (maxEntries > 0 && entries.length > maxEntries) {
      startTransition(() => {
        setEntries(prev => prev.slice(-maxEntries));
      });
    }
  }, [entries.length, maxEntries]);

  // Filter entries based on namespace with memoization
  const filteredEntries = useMemo(() => {
    return entries.filter((entry): boolean => {
      const namespace = entry.context?.namespace;
      return typeof namespace === 'string' &&
        namespace.length > 0 &&
        filters[namespace] !== false;
    });
  }, [entries, filters]);

  // Get unique namespaces with memoization
  const namespaces = useMemo((): string[] => {
    const uniqueNamespaces = new Set<string>();
    entries.forEach((entry) => {
      const namespace = entry.context?.namespace;
      if (typeof namespace === 'string' && namespace.length > 0) {
        uniqueNamespaces.add(namespace);
      }
    });
    return Array.from(uniqueNamespaces).sort();
  }, [entries]);

  return (
    <div className="p-4 relative">
      {isPending && (
        <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
          <div className="animate-pulse">Updating...</div>
        </div>
      )}
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
        {filteredEntries.map((entry) => (
          <div
            key={`${entry.context?.timestamp}-${entry.context?.namespace}-${entry.level}`}
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

export function GUI(props: GUIProps): ReactElement {
  return (
    <GUIErrorBoundary>
      <Suspense fallback={<div>Loading debug console...</div>}>
        <GUIContent {...props} />
      </Suspense>
    </GUIErrorBoundary>
  );
}

export { GUITransport };
