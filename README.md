# Jitterbug

Edge-first debugging system for Next.js applications with type safety and runtime awareness.

## Key Features

- 🔒 **Type Safety**
  - Edge Boundary Layer (EBL) for runtime validation
  - Memory-efficient type validation
  - WeakMap-based validation caching
  - Progressive type enhancement

- 🌐 **Edge Runtime First**
  - Built for Next.js 13+ Edge Runtime
  - SSE-based real-time logging
  - Memory threshold monitoring
  - Rate limiting and backpressure handling

- 📊 **Smart Processing**
  - Strict and lenient validation strategies
  - Automatic sensitive data redaction
  - Custom processor support
  - Memory usage tracking

- 🎯 **Runtime Awareness**
  - Automatic runtime detection
  - SSR hydration validation
  - Framework version validation
  - Edge-specific optimizations

## Installation

```bash
npm install @jitterbug
# or
yarn add @jitterbug
# or
pnpm add @jitterbug
```

## Quick Start

```typescript
import { createJitterbug } from "@jitterbug";

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

// Error tracking with type safety
try {
  throw new Error("Database timeout");
} catch (error) {
  debug.error("Query failed", error, {
    query: "SELECT...",
    table: "users",
  });
}
```

## Edge Runtime Usage

Jitterbug is optimized for Next.js Edge Runtime with built-in rate limiting:

```typescript
// app/api/logs/route.ts
import { createDebug } from "@jitterbug";

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

  const stream = new ReadableStream({
    start(controller) {
      debug.info("Stream initialized", {
        backpressure: controller.desiredSize
      });
    },
  });

  return new Response(stream);
}