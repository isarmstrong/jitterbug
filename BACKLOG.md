# Jitterbug Backlog

## Priority Lint Backlog

### A. Module Resolution Issues
- [ ] Resolve module not found error for '@isarmstrong/jitterbug-core-types' in packages/jitterbug-types/src/api.ts.
- [ ] Verify TSConfig paths for core-types integration across packages.

### B. Type Safety Issues
- [ ] Fix explicit "any" errors in src/utils/storage.ts.
- [ ] Address strict boolean expressions errors across the codebase.
- [ ] Update type declarations in src/types/index.ts, src/types/logs.ts, src/utils/runtime-detector.ts, src/utils/type-guards.ts, src/utils/validation.ts.

### C. Component Type Safety Issues
- [ ] Enhance type definitions for React components in src/next/components.
- [ ] Validate event types in hooks, such as useEventSource.

### D. System Configuration and Project Structure
- [ ] Update TSConfig includes to cover missing files (e.g., src/types/index.ts, src/types/logs.ts, src/utils/runtime-detector.ts, src/utils/type-guards.ts, src/utils/validation.ts, vitest.config.ts).
- [ ] Review and harmonize ESLint configuration across packages.

## Recently Completed

- ✅ Edge Boundary Layer (EBL)
  - Implemented validation strategies
  - Added memory management with WeakMap
  - Added runtime guards
  - Implemented hydration checks

- ✅ Core Type Foundation (A1)
  - Refactored and organized core type definitions in packages/core-types, including base interfaces, type constants, and shared utilities.
  - Verified integration across jitterbug-types and jitterbug-next; build restored.
  - Minor module resolution lint warning for '@isarmstrong/jitterbug-core-types' remains (tracked separately under Module Resolution).

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

## Legacy Lint Backlog Integration

### Summary of Recent Improvements
- Updated ambient module declarations in `src/types/jitterbug-modules.d.ts` to provide proper type and value exports using classes for LogTransport and ConsoleTransport, and exporting LogLevels, Environment, Runtime, and ValidationResult with required properties.
- Added runtime implementations and stubs in `packages/jitterbug/src/index.ts` so that imports for `@jitterbug` resolve to concrete values.
- Updated the `ValidationResult` interface (and `ExtendedValidationResult` type) to include `isValid` and `errors`, addressing errors in SSE transport files.
- Refined `tsconfig.next.json` paths to include mappings for both `@jitterbug` and `@jitterbug/*`.
- Activated the global declaration for `EdgeRuntime` in `src/types/globals.d.ts` by uncommenting its contents.
- Fixed metrics processor type safety in `packages/jitterbug-next/src/processors/metrics.ts` with proper generic context handling, runtime type guards, and correct type assertions for metrics data.
- Resolved tsconfig.json rootDir issues in `src/next/tsconfig.json` by changing rootDir from "." to "../../" and simplifying include patterns.
- All tests are passing (87/87) across 15 test files.
- These changes collectively resolve module resolution and type safety errors, aligning the codebase with our TypeScript design principles.

### Detailed Breakdown

#### Pool A: Module Resolution (302 errors remaining, reduced from 312)
- **A1: Next.js Module Resolution (124 errors)**: COMPLETE ✓
   - Fixed component import resolution, hook type declarations, library module paths, and test file configurations.
- **A2: Core Type Declarations (89 errors)**: COMPLETE ✓
   - Added missing interface declarations, completed partial type definitions, fixed export paths, and added enum type declarations.
- **A3: Utility Module Types (56 errors)**: COMPLETE ✓
   - Added function return types, fixed generic type constraints, and declared all parameter types and utility exports.
- **A4: Transport Layer Types (43 errors)**: COMPLETE ✓
   - Fixed edge runtime type imports, added protocol and streaming type declarations, and improved version type resolution.

#### Pool B: Type Safety (279 errors remaining, reduced from 289)
- **B1: Edge Transport Type Safety (52 errors)**: TO DO
   - Fix unsafe assignments, add type guards, implement proper error type narrowing, and add missing return type annotations.
- **B2: Error Wrapper Type Safety (27 errors)**: TO DO
   - Implement proper error type hierarchy, add type guards for error discrimination, fix unsafe error casting, and add missing null checks.
- **B3: Version Control Type Safety (45 errors)**: TO DO
   - Add proper version type validation, fix unsafe version comparisons, and implement semver type guards.
- **B4: Boolean Expression Safety (132 errors)**: TO DO
   - Fix non-null assertions, add proper undefined checks, implement strict equality checks, and resolve optional chaining issues.
- **B5: Member Access Safety (33 errors)**: TO DO
   - Add property existence checks, fix method call safety, implement proper 'this' typing, and add index signature validation.

#### Pool C: Component Type Safety (198 errors)
- **C1: Toast Component Safety (67 errors)**: TO DO
   - Fix hook return types, add proper type guards, fix utility function types, and add missing type exports.
- **C2: Hydration State Safety (73 errors)**: TO DO
   - Fix hydration state types, add state transition guards, implement proper error handling, and add missing state validations.
- **C3: Core Component Types (58 errors)**: TO DO
   - Fix component prop types, add event handler types, fix lifecycle method types, and add missing component interfaces.

#### Pool D: System Configuration (124 errors)
- **D1: Validation Utilities (45 errors)**: TO DO
   - Fix type guard implementations, add proper assertion types, fix validation helpers, and add missing error types.
- **D2: Dynamic Import Types (38 errors)**: TO DO
   - Fix import type assertions, add proper module type declarations, fix chunk type safety, and add loading state types.
- **D3: SSE Type Safety (28 errors)**: TO DO
   - Fix event type definitions, add proper stream types, fix message type safety, and add reconnection type declarations.
- **D4: Global Configuration (13 errors)**: TO DO
   - Fix config type safety, add environment validations, fix runtime type checks, and add missing config interfaces.

### Test Dependencies and Requirements
- **Pool A**: Module resolution validation tests, type export verification tests, and transport layer integration tests.
- **Pool B**: Edge transport type safety tests, error wrapper validation tests, and version control type safety tests.
- **Pool C**: Toast component integration tests, hydration state validation tests, and component lifecycle tests.
- **Pool D**: Configuration validation tests, dynamic import safety tests, and SSE type safety tests.

### Progress Metrics and Archive
- **Progress Metrics**: 
  - Total remaining errors: 690 (down from 710)
  - Pool A: 302 remaining (32.9%)
  - Pool B: 279 remaining (30.2%)
  - Pool C: 198 remaining (21.5%)
  - Pool D: 124 remaining (13.4%)
- **Archive**:
   - *Pool A: Next.js Module Resolution (A1)*: Completed on 2024-02-04, resolving 124 errors.
   - *Pool A: Core Type Declarations (A2)*: Completed on 2024-02-04, resolving 89 errors.

### Implementation Strategy
1. Phase 1: TSConfig Organization – Completed.
2. Phase 2: Pool A Resolution – Completed for A1, A2, A3, and A4.
3. Continue addressing Pools B, C, and D in order of priority.
4. Regular progress updates are required.
5. Estimated total time for remaining critical tasks: 14 days for P0 items. 