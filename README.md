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
<!-- TASKMASTER_EXPORT_START -->
> 🎯 **Taskmaster Export** - 2025-07-19 23:02:29 UTC
> 📋 Export: with subtasks • Status filter: none
> 🔗 Powered by [Task Master](https://task-master.dev?utm_source=github-readme&utm_medium=readme-export&utm_campaign=jitterbug&utm_content=task-export-link)

| Project Dashboard |  |
| :-                |:-|
| Task Progress     | ░░░░░░░░░░░░░░░░░░░░ 0% |
| Done | 0 |
| In Progress | 0 |
| Pending | 5 |
| Deferred | 0 |
| Cancelled | 0 |
|-|-|
| Subtask Progress | ░░░░░░░░░░░░░░░░░░░░ 0% |
| Completed | 0 |
| In Progress | 0 |
| Pending | 10 |


| ID | Title | Status | Priority | Dependencies | Complexity |
| :- | :-    | :-     | :-       | :-           | :-         |
| 2 | Create Core Orchestrator Module | ○&nbsp;pending | high | None | N/A |
| 2.1 | Design Core Orchestrator Architecture and Interfaces | ○&nbsp;pending | -            | None | N/A |
| 2.2 | Implement Branch Registry and Dynamic Registration System | ○&nbsp;pending | -            | 2.1 | N/A |
| 2.3 | Create Intelligent Log Routing and Delegation Engine | ○&nbsp;pending | -            | 2.1, 2.2 | N/A |
| 2.4 | Implement Pub/Sub System for Inter-Branch Communication | ○&nbsp;pending | -            | 2.1, 2.2 | N/A |
| 2.5 | Add Configuration Management and Error Resilience Layer | ○&nbsp;pending | -            | 2.1, 2.2, 2.3, 2.4 | N/A |
| 3 | Implement Browser Console API with window.jitterbug Interface | ○&nbsp;pending | high | 2 | N/A |
| 3.1 | Design and Implement Core window.jitterbug API Structure | ○&nbsp;pending | -            | None | N/A |
| 3.2 | Implement Branch Management Methods | ○&nbsp;pending | -            | 3.1 | N/A |
| 3.3 | Build Debug Mode Control Methods | ○&nbsp;pending | -            | 3.1 | N/A |
| 3.4 | Implement Configuration Persistence with localStorage | ○&nbsp;pending | -            | 3.2, 3.3 | N/A |
| 3.5 | Create Log Inspection and Export Utilities | ○&nbsp;pending | -            | 3.1, 3.2 | N/A |
| 4 | Create Beautiful Emoji Console Transport with Expandable Details | ○&nbsp;pending | medium | 2 | N/A |
| 5 | Implement SSE (Server-Sent Events) Transport for Unified Client/Server Log Streaming | ○&nbsp;pending | medium | 2 | N/A |
| 6 | Create Next.js Integration Package with App Router Support | ○&nbsp;pending | low | 2, 5 | N/A |

> 📋 **End of Taskmaster Export** - Tasks are synced from your project using the `sync-readme` command.
<!-- TASKMASTER_EXPORT_END -->
