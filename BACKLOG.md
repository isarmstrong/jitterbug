# Jitterbug Backlog

## Recently Completed

- ✅ Edge Boundary Layer (EBL)
  - Implemented validation strategies
  - Added memory management with WeakMap
  - Added runtime guards
  - Implemented hydration checks

- ✅ Core Transport Layer
  - Added basic SSE implementation
  - Implemented rate limiting
  - Added backpressure handling
  - Added basic error reporting

## In Progress

### Critical Path (This Week)
- Memory management stabilization
  - Finish WeakMap validation caching
  - Complete cleanup triggers
  - Test memory thresholds
  - Verify Edge compatibility

### Next Steps
- Environment-aware transport selection
  - Localhost: Console transport with full debug output
  - Staging: Client-side transport for server messages
  - Production: Sentry integration for critical paths

### Transport Implementation
1. Console Transport (P0)
   - Full debug output in development
   - Memory usage warnings
   - Type validation errors
   - Runtime detection logs

2. Client Transport (P1)
   - Server message forwarding
   - Basic UI for server logs
   - Simple filtering options
   - Keep Edge runtime constraints

3. Sentry Transport (P2)
   - Critical error reporting
   - Memory threshold alerts
   - Basic breadcrumbs
   - Context preservation

## Future Scope (Post-Integration)
- Advanced Sentry Integration
  - Performance monitoring
  - Error correlation
  - Custom context injection
- GUI Transport & Analytics
- LLM Integration

## Maintenance Guidelines
- Keep Edge runtime constraints in mind
- Maintain type safety across boundaries
- Document memory management decisions
- Test in actual Edge environment

### Temporary Workarounds
- [ ] Remove custom shim for '@isarmstrong/jitterbug-shim' once upstream or a stable alternative provides proper types. 