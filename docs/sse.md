Below is a **friendly**, **comprehensive** guide to **Server-Sent Events (SSE)** in **Next.js 15** and **Node.js 22**---including how you can still make it work on **Vercel** without the guide yelling at you. We'll cover recent SSE changes, potential pitfalls, IDE/tooling considerations, and how to stream logs from a serverless environment while respecting Vercel's constraints.

Table of Contents
----------------

1.  [Overview](#overview)
2.  [Key Changes in Node.js 22](#key-changes-in-nodejs-22)
3.  [Enhancements in Next.js 15](#enhancements-in-nextjs-15)
4.  [Potential Gotchas](#potential-gotchas)
5.  [Best Practices for SSE in Next.js 15 & Node.js 22](#best-practices-for-sse-in-nextjs-15--nodejs-22)
6.  [Example: SSE in Next.js 15 and Node.js 22](#example-sse-in-nextjs-15-and-nodejs-22)
7.  [Serving SSE on Vercel](#serving-sse-on-vercel)
8.  [IDE Considerations & Tooling](#ide-considerations--tooling)
9.  [Final Recommendations](#final-recommendations)
10. [Appendix: Reference Articles & Documentation](#appendix-reference-articles--documentation)

* * * * *

How SSE Has Changed in Next.js 15 and Node.js 22
================================================

In **Next.js 15** and **Node.js 22**, modern runtime improvements and API updates have made SSE more convenient while introducing a few new caveats. Below is a deeper look at what's changed, especially around file operations, streaming logs, and IDE configurations.

* * * * *

Key Changes in Node.js 22
-----------------------------

### Native Fetch API in Node.js

**Direct fetch in Node**\
Node.js 22 includes (experimental) support for the WHATWG `fetch` API, simplifying server logic for data requests.
- If your SSE route needs to fetch from external services (e.g., logging or metrics), you can now do so natively.
- Note that SSE itself is about **writing** to a response stream, whereas `fetch` is typically used for reading from other endpoints.

### Improved Streams API

**Web Streams vs. Node.js Streams**\
Node.js 22 offers better support for the **Web Streams API**, but many Node libraries still expect the classic `stream` module.
- If your SSE code or underlying libraries (like those accessing S3) require a Node.js `Readable`, you may see errors like `stream.on is not a function` if you pass them a Web `ReadableStream`.
- **Fix**: Convert Web Streams to Node.js streams using `Readable.fromWeb()` or use a Node.js `Readable` from the start.

### Better Edge Runtime Compatibility

**Edge vs. Node**\
Node.js 22 aligns well with edge environments, but **long-lived connections** (like SSE) still can be terminated by strict edge timeouts.
- If you want stable SSE, ensure you're on the **Node.js runtime**, not the Edge runtime. In Next.js, set `export const runtime = 'nodejs';` in your route.

* * * * *

Enhancements in Next.js 15
------------------------------

### App Router with Server Actions

**New `app/` directory**\
Next.js 15's App Router organizes server logic under `app/api/`. SSE routes live in `app/api/sse/route.ts`, for instance.

**Server Actions**\
These are great for form submissions and data mutations. SSE remains a **custom API** pattern.

### React 18+ Streaming Features

**Server Components & Suspense**\
Concurrent React can progressively stream HTML to the client, which is different from SSE. If you need push-based updates, SSE remains the go-to pattern.

**File-based API Routes**\
You can place SSE logic in a dedicated `route.ts` under `app/api/`, which is simpler to maintain than older Next.js versions.

### Edge Runtime Support

**Potential Timeouts**\
If you try to run SSE from the Edge runtime, you may face disconnections. Explicitly opt into `runtime = 'nodejs'` for more stable SSE connections.

* * * * *

Potential Gotchas
---------------------

1. **Web Streams vs. Node Streams**
   - Passing a Web `ReadableStream` to a library expecting Node.js streams triggers errors.
   - **Fix**: Use `Readable.fromWeb()` or revert to Node streams.

2. **Long-Lived Connections on Edge**
   - Edge environments typically can't support indefinite SSE. If you see abrupt connections closing, switch to the Node.js runtime.

3. **IDE/TypeScript Config**
   - If using Web Streams or `EventSource`, add `"DOM"` in `lib` within your `tsconfig.json`.
   - If dealing with Node streams, add `"types": ["node"]`.

4. **HTTP/2**
   - Some SSE failures occur under HTTP/2, so ensure HTTP/1.1 is used if you see random disruptions.

5. **CORS**
   - If the browser and SSE endpoint are on different domains, configure `Access-Control-Allow-Origin` headers.

6. **File-Based Logging**
   - When streaming logs from your server's S3 or disk operations, confirm your libraries are Node-stream-compatible (if you're converting to/from Web streams).

* * * * *

Best Practices for SSE in Next.js 15 / Node.js 22
---------------------------------------------

1. **Use `app/api/` for SSE**\
   Keep SSE routes separate from UI, making your IDE aware of the difference between server and client code.

2. **Convert Streams Where Needed**\
   If your library wants a Node.js stream, but you have a Web `ReadableStream`, use `Readable.fromWeb()`.

3. **Leverage `req.signal` for Cleanup**\
   Next.js 15 sets `req.signal`. If the client disconnects, you can close your SSE gracefully.

4. **Explicitly Use `runtime = 'nodejs'`**\
   This keeps your SSE route off Edge, where it might get terminated prematurely.

5. **Be Mindful of Timer Usage**\
   Use intervals or pings in SSE, but clear them when the request ends to prevent memory leaks.

6. **Test with Real Browsers**\
   SSE can behave differently across Chrome, Firefox, etc. Full end-to-end testing is recommended.

7. **Type Annotations for SSE Data**\
   If you're sending JSON logs, define an interface so your IDE can auto-complete your SSE event object properties.

* * * * *

Example: SSE in Next.js 15 and Node.js 22
---------------------------------------------

**Server Route** (`app/api/sse/route.ts`):

```typescript
export const runtime = 'nodejs';

export async function GET(req: Request) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Initial event
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: 'info', message: 'Connection established' })}\n\n`)
      );

      const intervalId = setInterval(() => {
        const now = new Date();
        const payload = {
          type: 'update',
          timestamp: now.toISOString(),
          message: `Current time: ${now.toLocaleTimeString()}`,
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      }, 1000);

      // If the client disconnects
      req.signal.addEventListener('abort', () => {
        clearInterval(intervalId);
        controller.close();
      });
    },
  });

  // Return streaming response
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
}
```

**Client (React Component)**:

```typescript
import { useEffect } from 'react';

export default function SSELogs() {
  useEffect(() => {
    const eventSource = new EventSource('/api/sse');

    eventSource.onmessage = (e) => {
      const data = JSON.parse(e.data);
      console.log('[SSE] Received:', data);
    };

    eventSource.onerror = (err) => {
      console.error('[SSE] Error:', err);
    };

    return () => {
      eventSource.close();
    };
  }, []);

  return <div>Check the console for SSE updates</div>;
}
```

* * * * *

Serving SSE on Vercel (Without Getting Yelled At!)
------------------------------------------------------

**Yes, you can use SSE on Vercel,** but note:

1. **Serverless Function Timeouts**
   - Hobby/Free plan: ~10s
   - Pro plan: ~30s\
     If your SSE route runs longer, Vercel terminates it.

2. **Short-Burst SSE with Auto-Reconnect**
   - Stream logs for the duration of your function's time limit, then send an event like `data: {"type": "end"}`.
   - The client sees the end event, closes, and reconnects. This approximates real-time logs in short intervals.

3. **Polling / Hybrid**
   - Alternatively, poll every few seconds if SSE reconnect logic feels too cumbersome.

4. **Dedicated Real-Time Services**
   - If you need indefinite streaming (e.g., a continuous S3→ImageKit log pipeline), a dedicated Node server or specialized real-time platform is best.

**Example**: SSE with a 25-second limit that "resets":

```typescript
// app/api/logs/route.js
export const runtime = 'nodejs';
export async function GET(req) {
  const encoder = new TextEncoder();
  const start = Date.now();
  const maxDuration = 25000; // 25s
  let timer;

  const stream = new ReadableStream({
    start(controller) {
      timer = setInterval(() => {
        const now = Date.now();
        if (now - start >= maxDuration) {
          controller.enqueue(encoder.encode('data: {"type": "end"}\n\n'));
          clearInterval(timer);
          controller.close();
          return;
        }
        const logLine = { message: 'Sync log: ' + new Date().toISOString() };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(logLine)}\n\n`));
      }, 1000);

      req.signal.addEventListener('abort', () => {
        clearInterval(timer);
        controller.close();
      });
    },
    cancel() {
      clearInterval(timer);
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
}
```

Then the **client** reconnects whenever it receives `type: "end"`.

* * * * *

IDE Considerations & Tooling
--------------------------------

1. **TypeScript Configuration**
   - `"lib": ["DOM"]` if you use `ReadableStream` or `EventSource`.
   - `"types": ["node"]` if you deal with Node.js streams or older Node APIs.

2. **ESLint & Prettier**
   - Ensure your config knows about Next.js 15's `app/api/` routes.

3. **Auto-Completion**
   - If you see warnings about `ReadableStream`, verify you have the correct `"lib"` entries in your `tsconfig.json`.
   - For SSE, the DOM `EventSource` type is included if `"DOM"` is in `lib`.

4. **Server vs. Browser**
   - Don't mix `window` or DOM APIs in your server route. Keep them separate so your IDE doesn't complain.

* * * * *

Final Recommendations
-------------------------

- **Short-Burst SSE** on Vercel is *fine* for sync logs---just handle timeouts gracefully.
- For **continuous** streaming that lasts longer than your plan's limit, consider a dedicated solution.
- Always confirm you're on `runtime = 'nodejs'` to avoid Edge timeouts.
- Convert streams if you have a mismatch between Web Streams and Node.js streams.
- Test thoroughly in real browsers to confirm SSE behaves as expected.

* * * * *

Appendix: Reference Articles & Documentation
--------------------------------------------

1. **MDN: Server-Sent Events**\
   <https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events>\
   Baseline SSE specification, explaining `EventSource` and data formats.

2. **MDN: Streams API**\
   <https://developer.mozilla.org/en-US/docs/Web/API/Streams_API>\
   Overview of the Web Streams standard, including `ReadableStream`, `WritableStream`, etc.

3. **Node.js 22 Docs: Web Streams**\
   <https://nodejs.org/docs/latest-v22.x/api/webstreams.html>\
   Details on Node's native Web Streams support, including conversions with `Readable.fromWeb()` and `toWeb()`.

4. **Node.js 22 Docs: Globals (`fetch`)**\
   <https://nodejs.org/docs/latest-v22.x/api/globals.html#fetch>\
   Explains the built-in `fetch`, removing the need for external HTTP libraries.

5. **Next.js Documentation: App Router & API Routes**\
   <https://nextjs.org/docs/app/building-your-application/routing/router-handlers>\
   Shows how to write streaming responses in `app/api/`.

6. **Next.js Docs: `runtime = 'nodejs'`**\
   <https://nextjs.org/docs/app/api-reference/next-config-js#runtime>\
   Force a Node.js environment instead of Edge, critical for SSE.

7. **SSE vs. WebSockets vs. Polling**\
   <https://ably.com/topic/server-sent-events>\
   Great overview of real-time communication approaches.

8. **GitHub Discussions: SSE with Next.js**\
   <https://github.com/vercel/next.js/discussions/12562>\
   Community threads covering various SSE implementations and troubleshooting.

9. **AWS S3 / GCP Storage Docs**
   - AWS: <https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html>
   - GCP: <https://cloud.google.com/storage/docs>\
   If your SSE logs represent file operations, these references help ensure Node.js stream or Web Stream support.

10. **TypeScript Configuration Handbook**\
    <https://www.typescriptlang.org/docs/handbook/tsconfig-json.html>\
    Ensures your project recognizes the correct types for SSE, Node, or DOM APIs.

* * * * *

### Wrapping Up

This guide is designed to keep SSE running smoothly in **Next.js 15** and **Node.js 22**---including **Vercel** use cases---without scolding you for wanting logs in real time. Remember:

- **Short-burst SSE** can work on serverless platforms.
- Reconnect logic is easy to implement on the client side.
- If you need unlimited streaming, consider a dedicated environment.

With these tips, your IDE should stay happy, and you'll get your live S3-to-ImageKit logs (or any other logs) on the client without a fuss!