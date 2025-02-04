# Jitterbug Next.js Integration Debug Log
2024-01-27 19:15 UTC

## Latest Status
- ✅ Fixed: 405 Method Not Allowed errors resolved by implementing proper health check handlers
- ✅ Fixed: SSE transport implementation for Next.js 15
- ✅ Fixed: Access modifiers in base and Next.js 15 SSE transports
- ✅ Fixed: Version detection and logging
- ✅ Fixed: Type safety for log entries
- ❌ New Issue: SSE transport not connecting to client console

## Issue Timeline

### Initial Issues
1. Function.prototype.apply errors
2. 405 Method Not Allowed errors
3. SSE connection issues with Next.js 15

### Attempted Solutions

#### 1. Direct Method Export
```typescript
// First attempt - Direct export of handler methods
const { GET, POST, HEAD, OPTIONS } = createLogHandler({...});
export { GET, POST, HEAD, OPTIONS };
```
Result: 405 Method Not Allowed errors

#### 2. Method Binding with call()
```typescript
// Second attempt - Using .call() to bind methods
export async function GET(req: Request) {
    return handler.GET.call(handler, req);
}
```
Result: Type mismatches and still getting 405s

#### 3. Explicit Method Binding
```typescript
// Third attempt - Explicit bind() on handler object
const handler = {
    async GET() { ... },
    async POST() { ... }
};

return {
    GET: handler.GET.bind(handler),
    POST: handler.POST.bind(handler)
};
```
Result: Still getting 405s

### Current Understanding
1. The EdgeTransport is successfully connecting (no more 405 errors)
2. Health checks (GET/HEAD) are working
3. SSE stream is not being established for client console output
4. Debug mode is confirmed active in localStorage

### Next Steps to Try
1. Investigate if Next.js 15 requires specific route handler signatures
2. Check if the runtime export needs to be before the handlers
3. Consider implementing a single handler function that routes based on method
4. Review Next.js 15 route handler documentation for any special requirements

### Edge Transport Behavior
1. Tries GET first for health check
2. Falls back to HEAD if GET fails
3. Uses POST for actual log transmission
4. Requires OPTIONS for CORS preflight

### Required Headers
```typescript
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, HEAD',
    'Access-Control-Allow-Headers': 'Content-Type'
};
```

### Version Information
- Next.js: 15.1.6
- Node: 22.11.0
- React: 18.2.0
- Runtime: Edge

## Long-term Improvements
1. Move route handler into Next.js client package
2. Add version-specific implementations
3. Improve error handling and debugging
4. Add comprehensive tests for all HTTP methods

## Project Context - 2024-01-27 18:08

### Project Purpose
- Edge-first debugging system for Next.js applications
- NOT a Next.js app, but rather a development debugger that works with Next.js Edge Runtime
- Core features: Type safety, Edge Runtime First, Smart Processing
- Packages:
  - @jitterbug (core logging)
  - @jitterbug-next (Next.js integration)

### Current Debugging Session
1. SSE Transport Implementation:
   - Successfully implemented version-specific SSE transports
   - Added runtime detection and feature negotiation
   - Fixed 405 errors by properly handling both Edge and Node.js runtimes

2. Current Issue:
   - Client errors are reaching the server (visible in server logs)
   - But not showing in Chrome console despite debug mode being enabled
   - Debug mode is confirmed active: "[Jitterbug] Debug mode enabled in localStorage"

3. Error Flow Analysis:
   - Client error is triggered and captured
   - Successfully sent to server (confirmed by server logs)
   - LogType shows proper structure with error details
   - Console output is missing despite logger configuration

4. Type Issues Found:
   - LogType interface needs refinement for error context
   - NextLoggerConfig missing handlerConfig in type definition
   - Level comparison needs to match actual log levels

### Environment Notes
- Next.js 15 for testing compatibility
- Node 22 for development
- React 18.2 compatibility testing
- TypeScript project with strong type safety focus

### Recent Changes
1. Implemented SSE transport versioning
2. Added runtime detection
3. Fixed 405 errors
4. Attempting to add console output

### Current Issues
1. Console Output Missing:
   - Need to fix type definitions
   - Need to ensure proper log processing
   - Debug mode is active but output silent

2. Type System Improvements Needed:
   - LogType needs context.error definition
   - NextLoggerConfig needs handlerConfig
   - Log levels need standardization

### Dependencies
- typescript: ~5.3.3
- node: >=18.17.0 required
- next: ^14.0.0 (for testing compatibility)
- react: ^18.2.0 (for testing compatibility)

### Critical Notes
- Project uses pnpm workspaces
- Focus on Edge Runtime optimization
- Type safety is a core feature
- Memory-efficient streaming and logging
- Debug mode should be verbose in development 

## Technical Details

### Working Components
```typescript
// Health check handler working correctly
async function healthCheck(req: NextRequest) {
    return NextResponse.json({ status: 'ok' }, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, HEAD, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        }
    });
}
```

### Missing Components
1. SSE Stream Setup
   - Need to check if GET requests for SSE are being properly identified
   - Need to verify stream headers are correct
   - Need to ensure stream connection is maintained

### Next Steps
1. Investigate SSE stream establishment:
   - Check Accept header for 'text/event-stream'
   - Verify stream response headers
   - Add debug logging for stream setup
2. Review EdgeTransport SSE implementation:
   - Verify version detection
   - Check stream reader setup
   - Validate event format

### Environment Context
- Next.js: 15.1.6
- Node: 22.11.0
- React: 18.2.0
- Runtime: Edge
- Debug Mode: Enabled

### Recent Changes Timeline
1. Fixed 405 errors by implementing proper health check handlers
2. Separated concerns between health checks and SSE
3. Added proper CORS headers
4. Lost SSE connection in the process

## Investigation Plan
1. Add debug logging to track SSE connection attempts
2. Verify SSE headers in both request and response
3. Check EdgeTransport version detection
4. Review SSE stream setup in Next.js 15 context

## Long-term Improvements
1. Add comprehensive SSE connection logging
2. Implement SSE connection recovery
3. Add metrics for SSE stream health
4. Consider separate route for SSE vs health checks

## Jitterbug Development Context
Last Updated: 2024-01-27 20:00 UTC

### Latest Status
✅ Fixed: SSE transport implementation for Next.js 15
✅ Fixed: Access modifiers in base and Next.js 15 SSE transports
✅ Fixed: Version detection and logging
✅ Fixed: Type safety for log entries

### Current Understanding
1. SSE Transport Architecture:
   - Base SSE transport provides common functionality and protected access methods
   - Next.js 15 transport extends base with version-specific implementation
   - Version detection is handled by the version provider
   - Log entries use the LogType interface from types.ts

2. Working Components:
   - Version detection and validation
   - SSE connection establishment
   - Log writing with proper headers
   - Connection state management
   - Clean disconnection handling

3. Implementation Notes:
   - Base SSE transport:
     - Protected access to connection state and EventSource
     - Common header generation
     - Stream timeout handling
     - End-of-stream event creation

   - Next.js 15 SSE transport:
     - Uses EventSource for SSE connections
     - Proper error handling and logging
     - Version validation on initialization
     - Clean state management through base class methods

### Next Steps
1. Implement message buffering for disconnected state
2. Add reconnection logic with backoff
3. Consider adding metrics for connection health
4. Add tests for version-specific behaviors

### Environment Context
- Next.js: 15.1.6
- Node.js: 22
- React: 18.2.0
- Runtime: Edge

### Recent Changes Timeline
1. Created version provider for Next.js version detection
2. Implemented base SSE transport with protected access methods
3. Created Next.js 15 SSE transport with version-specific implementation
4. Fixed access modifiers and type safety issues
5. Added proper error handling and logging

### Long-term Improvements
1. Consider exposing connection metrics
2. Add support for custom serialization
3. Implement message compression
4. Add support for binary message formats
5. Consider adding connection pooling for high-volume scenarios 

# Version Handling

## React Version Compatibility

### Key Points
- Next.js 15 commonly uses React 18.2
- React 19 introduces "everything is a promise" model
- Need to handle both versions explicitly

### Implementation Strategy
1. **Version Detection**
   ```typescript
   const versions = {
       next: process?.versions?.['next'] || '15.1.6',
       node: process?.versions?.node || '22',
       react: React.version || '18.2.0'
   };
   ```

2. **Version-Specific Behavior**
   - React 18.2: Synchronous initialization, direct rendering
   - React 19: Async initialization, Suspense wrapping

3. **Transport Configuration**
   ```typescript
   const isReact19 = versions.react.startsWith('19');
   const transportConfig = {
       retryInterval: isReact19 ? 2000 : 1000,
       ...(isReact19 && {
           usePromises: true,
           asyncInit: true
       })
   };
   ```

### Hydration Considerations
- Client ID generation must be stable
- Timestamp handling must be client-side only
- Component mounting states must be version-aware 