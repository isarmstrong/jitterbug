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
  debug.info("SSE connection established", {
    debugContext: {
      connectionType: "SSE",
      clientInfo: headers.get("user-agent"),
      protocolVersion: "2024-1"
    }
  });

  const stream = new ReadableStream({
    start(controller) {
      debug.info("Stream controller initialized", {
        // Track debugger internals
        backpressureStatus: controller.desiredSize,
        streamState: "open"
      });
    },
  });

  return new Response(stream, {
    headers: debug.injectDiagnosticHeaders({
      'x-jitterbug-session': crypto.randomUUID()
    })
  });
}
```