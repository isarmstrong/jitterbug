# Jitterbug

Edge-first debugging system for Next.js applications with type safety and runtime awareness.

## Key Features

- 🔒 **Type Safety**

  - Full TypeScript support with generic constraints
  - Runtime-aware type guards
  - Interface contracts for extensibility

- 🌐 **Edge Runtime First**

  - Built for Next.js 13+ Edge Runtime
  - SSE-based real-time logging
  - Memory-efficient streaming
  - Automatic runtime detection
  - Rate limiting and backpressure handling

- 📊 **Smart Processing**

  - Error aggregation and correlation
  - Performance metrics tracking
  - Automatic sensitive data redaction
  - Custom processors support

- 🎯 **Visual Debugging**
  - Real-time log visualization
  - React component lifecycle tracking
  - Server/client boundary monitoring
  - Interactive filtering and search

## Installation

```bash
npm install @isarmstrong/jitterbug
# or
yarn add @isarmstrong/jitterbug
# or
pnpm add @isarmstrong/jitterbug
```

## Quick Start

```typescript
import { createJitterbug } from "@isarmstrong/jitterbug";

// Create a type-safe debugger
const debug = createJitterbug({
  namespace: "my-app",
  // Optional: Override runtime detection
  runtime: "edge",
  // Optional: Configure minimum log level
  minLevel: "info",
});

// Basic logging with type inference
debug.info("API Route accessed", {
  path: "/api/users",
  method: "GET",
  duration: 45,
});

// Error tracking with aggregation
try {
  throw new Error("Database timeout");
} catch (error) {
  debug.error("Query failed", error, {
    query: "SELECT...",
    table: "users",
  });
}

// Component lifecycle debugging
debug.render("UserProfile mounted", {
  props: { userId: "123" },
  renderTime: 25,
  hydrated: true,
});
```

## Edge Runtime Usage

Jitterbug is optimized for Next.js Edge Runtime with built-in rate limiting:

```typescript
// app/api/logs/route.ts
import { createDebug } from "@isarmstrong/jitterbug";

// Configure Edge transport with rate limiting
const debug = createDebug("api:logs", {
  transport: {
    type: "edge",
    endpoint: "/api/logs",
    // Optional: Configure rate limiting
    requestsPerSecond: 10, // Default: 10
    maxPayloadSize: 128 * 1024, // Default: 128KB
    bufferSize: 100, // Default: 100 entries
  },
});

export async function GET() {
  debug.info("SSE connection established");

  // Streaming response with backpressure handling
  const stream = new ReadableStream({
    start(controller) {
      debug.info("Stream started", {
        memory: process.memoryUsage?.(),
      });
    },
    // ...
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
    },
  });
}
```

## Type-Safe Configuration

### Runtime Detection

```typescript
import { createJitterbug, Runtime, Environment } from "@isarmstrong/jitterbug";

const debug = createJitterbug({
  namespace: "my-app",
  // Type-safe runtime configuration
  runtime: Runtime.EDGE,
  // Type-safe environment setting
  environment: Environment.PRODUCTION,
  // Minimum log level with type checking
  minLevel: "warn",
});
```

### Custom Transport

```typescript
import { LogTransport, LogEntry } from "@isarmstrong/jitterbug";

class MetricsTransport implements LogTransport {
  async write<T extends Record<string, unknown>>(
    entry: LogEntry<T>,
  ): Promise<void> {
    // Type-safe access to log data
    if (entry.level === "error") {
      await this.trackError(entry.data);
    }
  }

  // Runtime compatibility check
  supports(runtime: Runtime): boolean {
    return runtime === Runtime.EDGE;
  }
}
```

### Custom Processor

```typescript
import { LogProcessor, LogEntry } from "@isarmstrong/jitterbug";

class PerformanceProcessor implements LogProcessor {
  async process<T extends Record<string, unknown>>(
    entry: LogEntry<T>,
  ): Promise<LogEntry<T & { performance: unknown }>> {
    // Enhance log entry with performance data
    return {
      ...entry,
      data: {
        ...entry.data,
        performance: {
          timestamp: Date.now(),
          memory: process.memoryUsage?.(),
        },
      },
    };
  }
}
```

## Best Practices

### Server/Client Boundary

```typescript
// app/components/UserProfile.tsx
'use client';

import { createDebug } from '@isarmstrong/jitterbug';

const debug = createDebug('ui:user-profile');

export function UserProfile({ user }) {
  debug.render('UserProfile render', {
    userId: user.id,
    hydrated: typeof window !== 'undefined'
  });

  return <div>{/* ... */}</div>;
}
```

### Error Correlation

```typescript
const debug = createDebug("api:users");

try {
  const result = await db.query(sql);
  debug.info("Query completed", {
    duration: result.duration,
    rows: result.rowCount,
  });
} catch (error) {
  // Error will be aggregated with similar errors
  debug.error("Query failed", error, {
    sql,
    params,
    // Add request ID for correlation
    requestId: headers.get("x-request-id"),
  });
}
```

### Memory Management

```typescript
const debug = createDebug("edge:stream");

// Monitor memory usage in Edge functions
setInterval(() => {
  const memory = process.memoryUsage?.();
  if (memory && memory.heapUsed > threshold) {
    debug.warn("High memory usage", { memory });
  }
}, 1000);
```

## Documentation

- [Architecture](docs/architecture.md)
- [Type Patterns](docs/type-patterns.xml)
- [Maintenance Guide](docs/maintenance.md)

## License

MIT
