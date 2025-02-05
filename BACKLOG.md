# Jitterbug Backlog

## Priority Lint Backlog

### A. Module Resolution Issues (302 remaining)
- [x] Resolve module not found error for '@isarmstrong/jitterbug-core-types' in packages/jitterbug-types/src/api.ts
- [x] Verify TSConfig paths for core-types integration across packages
- [x] Fix Next.js component module resolution:
  - [x] Add proper type exports for LogStreamContent component
  - [x] Fix useEventSource hook type dependencies and imports
  - [x] Add missing type declarations for EventSource events
- [x] Address transport layer module resolution:
  - [x] Add proper type exports for transport configurations
  - [x] Fix import paths for BaseTransport and TransportConfig
  - [x] Establish single source of truth for transport types
  - [x] Resolve circular dependencies in edge.ts and hydration.ts
  - [x] Add missing type declarations for transport events
  - [x] Resolve type conflicts between Edge and Hydration transports
  - [x] Implement proper error handling in transport layer

### B. Type Safety Issues (279 remaining)
- [ ] Fix explicit "any" types in:
  - src/utils/storage.ts (3 instances)
  - src/next/lib/logger.ts (8 instances)
  - src/transports/resource.ts (2 instances)
  - src/transports/version.ts (2 instances)
- [ ] Add missing return types in:
  - src/next/api/transport.ts
  - src/next/components/LogStreamContent.ts
  - src/next/hooks/useEventSource.ts
  - src/next/lib/client.ts
  - src/types/api.ts
- [ ] Address unused variables and parameters across:
  - src/next/hooks/useEventSource.ts
  - src/processors/error-aggregation.ts
  - src/processors/sanitize.ts
  - src/transports/edge.ts
  - src/types/api.ts

### C. Component Type Safety Issues (198 remaining)
- [ ] Enhance type definitions for React components in src/next/components
- [ ] Validate event types in hooks, particularly in useEventSource.ts
- [ ] Fix type safety in LogStreamContent and related components
- [ ] Address hydration type safety issues in transports/hydration.ts

### D. System Configuration and Project Structure (124 remaining)
- [ ] Update TSConfig includes to cover missing files
- [ ] Review and harmonize ESLint configuration across packages
- [ ] Address generic type usage in validation.ts
- [ ] Fix configuration type safety in version.ts and resource.ts

## Recently Completed

- ✅ Edge Boundary Layer (EBL)
  - Implemented validation strategies
  - Added memory management with WeakMap
  - Added runtime guards
  - Implemented hydration checks

- ✅ Core Type Foundation (A1)
  - Refactored and organized core type definitions
  - Verified integration across packages
  - Build restored and stable

- ✅ Core Transport Layer
  - Added basic SSE implementation
  - Implemented rate limiting
  - Added backpressure handling
  - Added basic error reporting

## In Progress

### Critical Path (This Week)
1. Type Safety Improvements (Pool B)
   - Fix explicit "any" types (15 instances identified)
   - Add missing return types (8 functions identified)
   - Address unused variables (12 instances found)

2. Memory Management Stabilization
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

## Legacy Lint Backlog Integration

### Summary of Recent Improvements
- Updated ambient module declarations in `src/types/jitterbug-modules.d.ts` to provide proper type and value exports using classes for LogTransport and ConsoleTransport, and exporting LogLevels, Environment, Runtime, and ValidationResult with required properties.
- Added runtime implementations and stubs in `packages/jitterbug/src/index.ts` so that imports for `@jitterbug` resolve to concrete values.
- Updated the `ValidationResult` interface (and `ExtendedValidationResult` type) to include `isValid` and `errors`, addressing errors in SSE transport files.
- Refined `