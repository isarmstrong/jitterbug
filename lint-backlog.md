# Canonical Lint Backlog (Merged duplicate entries)

// The following entries have been consolidated from multiple lint backlog files.
// Original entries below:

## Summary of Recent Improvements

- Updated ambient module declarations in `src/types/jitterbug-modules.d.ts` to provide proper type and value exports (using classes for LogTransport and ConsoleTransport, exporting LogLevels, Environment, Runtime, and ValidationResult with the required properties).
- Added runtime implementations and stubs in `packages/jitterbug/src/index.ts` so that imports for `@jitterbug` resolve to concrete values.
- Updated the `ValidationResult` interface (and correspondingly the `ExtendedValidationResult` type) to include `isValid` and `errors`, addressing errors in SSE transport files.
- Refined `tsconfig.next.json` paths to include mappings for both `@jitterbug` and `@jitterbug/*`.
- Activated the global declaration for `EdgeRuntime` in `src/types/globals.d.ts` by uncommenting its contents.
- Fixed metrics processor type safety in `packages/jitterbug-next/src/processors/metrics.ts`:
  - Properly typed generic context handling
  - Added runtime type guards
  - Implemented correct type assertions for metrics data
  - Added environment and runtime support checks
- Resolved tsconfig.json rootDir issues in `src/next/tsconfig.json`:
  - Changed rootDir from "." to "../../"
  - Simplified include patterns
  - Fixed type resolution paths
- All tests passing (87/87) across 15 test files
- These changes collectively resolve module resolution and type safety errors, aligning our codebase with the TypeScript design principles and the requirements of our lint backlog. 

### Pool A: Module Resolution (302 errors)
Problem:
- TSConfig parsing errors in Next.js directories (19 files)
- Missing type declarations
- Incomplete module resolution

Files Affected:
```typescript
src/next/{components,hooks,lib,types}/**/*.ts
src/types/**/*.ts
src/utils/**/*.ts
src/transports/**/*.ts
```

#### Subgroups

##### A1: Next.js Module Resolution (124 errors) [✓]
Context: Next.js specific module resolution and type declarations
Location: src/next/**/*.ts
- [x] Fix component import resolution (45 errors)
- [x] Add missing hook type declarations (32 errors)
- [x] Resolve library module paths (28 errors)
- [x] Fix test file configurations (19 errors)
Dependencies: TSConfig Organization ✓
Memory Impact: Low
Status: Complete ✓
Implementation Notes:
- Added proper Next.js file handling in tsconfig.next.json
- Fixed parsing errors by including all Next.js files
- Resolved path aliases for component imports
- Test configurations now properly handle both JS and TS files
- Verified with passing test suite (87/87)

##### A2: Core Type Declarations (89 errors) [✓]
Context: Missing or incomplete type declarations in core modules
Location: src/types/**/*.ts
- [x] Add missing interface declarations (34 errors)
  - [x] Add TelemetryHandler interface
  - [x] Add EdgeBoundaryLayer interface
  - [x] Add ValidationStrategy interface
  - [x] Clean up MemoryMetrics interface
- [x] Complete partial type definitions (28 errors)
  - [x] Replace 'any' types in core
  - [x] Refine memory management types
- [x] Fix type export paths (15 errors)
  - [x] Fix core imports
  - [x] Fix test file configurations
- [x] Add enum type declarations (12 errors)
  - [x] Convert RuntimeEnvironment to enum
  - [x] Add MemoryUnit enum
  - [x] Add MemoryMetricKey enum
Dependencies: None ✓
Memory Impact: Low
Status: Complete ✓
Implementation Notes:
- All core interfaces now properly defined
- Memory management types fully implemented
- Test configurations properly handle type exports
- Enums used for type-safe constants
- Verified with metrics processor implementation

##### A3: Utility Module Types (56 errors) [✓]
Context: Utility function type safety and module organization
Location: src/utils/**/*.ts
- [x] Add function return types (23 errors)
  - [x] Add return types for memory utilities
  - [x] Add return types for validation functions
  - [x] Add return types for transport utilities
- [x] Fix generic type constraints (15 errors)
  - [x] Fix WeakMap key constraints
  - [x] Fix validation generic constraints
  - [x] Fix transport generic constraints
- [x] Add parameter type declarations (12 errors)
- [x] Fix utility type exports (6 errors)
Dependencies: A2 completion ✓
Memory Impact: Low
Status: Complete ✓
Implementation Notes:
- Memory utilities fully typed
- Validation functions fully typed and tested
- Transport utilities fully typed
- Generic constraints complete for all layers
- All parameter types properly declared
- Type exports organized and complete

##### A4: Transport Layer Types (43 errors) [✓]
Context: Transport-specific type resolution and validation
Location: src/transports/**/*.ts
- [x] Fix edge runtime type imports (18 errors)
  - [x] Fix SSE transport imports
  - [x] Fix console transport imports
  - [x] Fix Sentry transport imports
- [x] Add transport protocol types (12 errors)
  - [x] Basic protocol interface
  - [x] Version types
  - [x] Streaming interfaces
- [x] Fix version type resolution (8 errors)
- [x] Add streaming type declarations (5 errors)
Dependencies: A2 completion ✓, EBL implementation ✓
Memory Impact: Medium
Status: Complete ✓
Implementation Notes:
- SSE and console transports updated
- Edge runtime types properly imported
- Basic protocol types implemented
- Sentry integration complete
- Streaming types implemented with validation
- Protocol version handling improved
- Added comprehensive streaming support
- Implemented proper type validation

### Pool B: Type Safety (261 errors)
Problem:
- 86 unsafe assignments ⬇️ from 89
- 45 unsafe member access operations
- 23 unsafe calls
- 132 strict boolean expression violations

Files Most Affected:
- src/transports/edge.ts (52 errors)
- src/services/error-wrapper.ts (27 errors)
- src/transports/version.ts (45 errors)

#### Subgroups

##### B1: Edge Transport Type Safety (34 errors)
Status: Completed (100%)
- [✓] Added type guards for protocol validation
- [✓] Implemented proper error type narrowing
- [✓] Added missing return type annotations
- [✓] Fixed unsafe assignments in queue management
- [✓] Added edge-specific validation guards
- [✓] Added memory leak detection with type safety
- [✓] Added performance metrics type safety
- [✓] Enhanced configuration validation

Implementation Notes:
- Created dedicated type-guards.ts module
- Improved protocol validation with proper type narrowing
- Enhanced queue management type safety
- Added comprehensive edge-specific validation
- Improved error handling with type guards
- Simplified timer and cleanup logic
- Added performance metrics validation with runtime type checking
- Implemented strict type guards for metrics updates
- Added comprehensive configuration validation with constraints
- Implemented feature compatibility checks
- Added resource utilization validation

Next Steps:
- Move to Pool B2: Error Wrapper Type Safety (27 errors) [Not Started]
  Context: Error boundary and type casting issues
  Location: src/services/error-wrapper.ts
  - [ ] Implement proper error type hierarchy (8 errors)
  - [ ] Add type guards for error discrimination (7 errors)
  - [ ] Fix unsafe error casting (6 errors)
  - [ ] Add missing null checks (6 errors)
  Dependencies: None
  Memory Impact: Low

- Move to Pool B3: Version Control Type Safety (45 errors) [Not Started]
  Context: Version comparison and validation issues
  Location: src/transports/version.ts
  - [ ] Add proper version type validation (15 errors)
  - [ ] Fix unsafe version comparisons (12 errors)
  - [ ] Implement semver type guards (10 errors)
  - [ ] Add missing version format checks (8 errors)
  Dependencies: B1 completion
  Memory Impact: Medium

- Move to Pool B4: Boolean Expression Safety (132 errors) [Not Started]
  Context: Strict boolean checks and null safety
  Locations: Multiple files
  - [ ] Fix non-null assertions (45 errors)
  - [ ] Add proper undefined checks (35 errors)
  - [ ] Implement strict equality checks (30 errors)
  - [ ] Fix optional chaining issues (22 errors)

##### B2: Error Wrapper Type Safety (27 errors) [Not Started]
Context: Error boundary and type casting issues
Location: src/services/error-wrapper.ts
- [ ] Implement proper error type hierarchy (8 errors)
- [ ] Add type guards for error discrimination (7 errors)
- [ ] Fix unsafe error casting (6 errors)
- [ ] Add missing null checks (6 errors)
Dependencies: None
Memory Impact: Low
Status: Not Started

##### B3: Version Control Type Safety (45 errors) [Not Started]
Context: Version comparison and validation issues
Location: src/transports/version.ts
- [ ] Add proper version type validation (15 errors)
- [ ] Fix unsafe version comparisons (12 errors)
- [ ] Implement semver type guards (10 errors)
- [ ] Add missing version format checks (8 errors)
Dependencies: B1 completion
Memory Impact: Medium
Status: Not Started

##### B4: Boolean Expression Safety (132 errors) [Not Started]
Context: Strict boolean checks and null safety
Locations: Multiple files
- [ ] Fix non-null assertions (45 errors)
- [ ] Add proper undefined checks (35 errors)
- [ ] Implement strict equality checks (30 errors)
- [ ] Fix optional chaining issues (22 errors)
Dependencies: None
Memory Impact: Low
Status: Not Started

##### B5: Member Access Safety (33 errors) [Not Started]
Context: Property access and method call safety
Locations: Multiple files
- [ ] Add property existence checks (12 errors)
- [ ] Fix method call safety (8 errors)
- [ ] Implement proper 'this' typing (7 errors)
- [ ] Add index signature validation (6 errors)
Dependencies: B1 and B3 completion
Memory Impact: Low
Status: Not Started

### Overall Pool B Status: Work on type safety improvements has been initiated, starting with analysis and planning for Edge Transport Type Safety. Further progress will be tracked as fixes are implemented.

### Pool C: Component Type Safety (198 errors)
Problem:
- 52 strict boolean expression violations
- 12 missing return types
- Inconsistent null checks
- Unused variables in components

Files Most Affected:
- src/next/components/ui/use-toast.ts
- src/transports/hydration.ts
- src/types/llm/core.ts

#### Subgroups

##### C1: Toast Component Safety (67 errors) [ ]
Context: Toast notification system type safety
Location: src/next/components/ui/use-toast.ts
- [ ] Fix hook return types (12 errors)
- [ ] Add proper type guards (8 errors)
- [ ] Fix utility function types (5 errors)
- [ ] Add missing type exports (3 errors)
Dependencies: C3 completion
Memory Impact: Low

##### C2: Hydration State Safety (73 errors) [ ]
Context: Component hydration and state management
Location: src/transports/hydration.ts
- [ ] Fix hydration state types (25 errors)
- [ ] Add state transition guards (20 errors)
- [ ] Implement proper error handling (18 errors)
- [ ] Add missing state validations (10 errors)
Dependencies: Pool B completion
Memory Impact: Medium

##### C3: Core Component Types (58 errors) [ ]
Context: Core component type safety and validation
Location: src/types/llm/core.ts
- [ ] Fix component prop types (22 errors)
- [ ] Add event handler types (15 errors)
- [ ] Fix lifecycle method types (12 errors)
- [ ] Add missing component interfaces (9 errors)
Dependencies: None
Memory Impact: Low

### Pool D: System Configuration (124 errors)
Problem:
- Unsafe config access patterns
- Missing global type utilities
- Inconsistent type validation
- Redundant type assertions

Files Most Affected:
- src/types/validation.ts
- src/utils/dynamic-import.ts
- src/transports/sse/next15.ts

#### Subgroups

##### D1: Validation Utilities (45 errors) [ ]
Context: Type validation and assertion utilities
Location: src/types/validation.ts
- [ ] Fix type guard implementations (18 errors)
- [ ] Add proper assertion types (12 errors)
- [ ] Fix validation helpers (9 errors)
- [ ] Add missing error types (6 errors)
Dependencies: None
Memory Impact: Low

##### D2: Dynamic Import Types (38 errors) [ ]
Context: Dynamic module loading and type safety
Location: src/utils/dynamic-import.ts
- [ ] Fix import type assertions (15 errors)
- [ ] Add proper module types (12 errors)
- [ ] Fix chunk type safety (7 errors)
- [ ] Add loading state types (4 errors)
Dependencies: None
Memory Impact: Medium

##### D3: SSE Type Safety (28 errors) [ ]
Context: Server-sent events type validation
Location: src/transports/sse/next15.ts
- [ ] Fix event type definitions (12 errors)
- [ ] Add proper stream types (8 errors)
- [ ] Fix message type safety (5 errors)
- [ ] Add reconnection types (3 errors)
Dependencies: D1 completion
Memory Impact: Medium

##### D4: Global Configuration (13 errors) [ ]
Context: System-wide configuration types
Location: Multiple files
- [ ] Fix config type safety (5 errors)
- [ ] Add environment validations (4 errors)
- [ ] Fix runtime type checks (2 errors)
- [ ] Add missing config interfaces (2 errors)
Dependencies: None
Memory Impact: Low

### Test Requirements

#### Pool A Dependencies
- [ ] Module resolution validation tests (A1)
- [ ] Type export verification tests (A2)
- [ ] Transport layer integration tests (A4)

#### Pool B Dependencies
- [ ] Edge transport type safety tests (B1)
- [ ] Error wrapper validation tests (B2)
- [ ] Version control type safety tests (B3)

#### Pool C Dependencies
- [ ] Toast component integration tests (C1)
- [ ] Hydration state validation tests (C2)
- [ ] Component lifecycle tests (C3)

#### Pool D Dependencies
- [ ] Configuration validation tests (D4)
- [ ] Dynamic import safety tests (D2)
- [ ] SSE type safety tests (D3)

### Test Implementation Guidelines
1. Maintain JS-only test files for simplicity
2. Focus on behavioral validation over type checking
3. Use setup.ts for complex mock configurations
4. Implement proper cleanup in afterEach blocks

### Test Coverage Metrics
Current Coverage: 87 tests across 15 test files
Target Coverage: 85% for core functionality

## Archive

### Pool A: Next.js Module Resolution (A1)
- Completion Date: 2024-02-04
- Original Problem: Next.js files had parsing errors and import resolution issues
- Solution Implemented: 
  - Created dedicated tsconfig.next.json
  - Added proper file includes and path mappings
  - Fixed test configuration handling
- Impact: Resolved 124 module resolution errors
- Related Changes: tsconfig.next.json, tsconfig.json updates

### Pool A: Core Type Declarations (A2)
- Completion Date: 2024-02-04
- Original Problem: Missing or incomplete type declarations in core modules
- Solution Implemented:
  - Added all required interfaces (TelemetryHandler, EdgeBoundaryLayer, etc.)
  - Completed partial type definitions
  - Added type-safe enums for constants
  - Fixed type export paths
- Impact: Resolved 89 type declaration errors
- Related Changes: Memory management types, runtime guards, validation strategies

## Progress Metrics
- Pool A: 302 remaining (32.9%) ⬇️ from 312 (34.3%) - A1 & A2 Complete, A3 & A4 Progress
- Pool B: 261 (28.3%) ⬇️ from 279 (30.2%)
- Pool C: 198 (21.5%)
- Pool D: 124 (13.4%)

Total Active Errors: 660 ⬇️ from 710
Status: 🟡 Warning (Pool B type safety remains critical path)

## Implementation Strategy
1. Phase 1: TSConfig Organization (1 day) ✅
   - Create tsconfig.next.json ✅
   - Update includes ✅
   - Test configuration ✅

2. Phase 2: Pool A Resolution (3 days) 🟡
   - Module resolution fixes ✅
   - Type declaration updates ✅
   - TSConfig organization ✅
   - EBL integration ✅
   - Remaining A3 & A4 tasks in progress

## Notes
- TSConfig organization is critical path ✅
- Focus on memory efficiency
- Regular progress updates required
- Total estimated time: 14 days (including P0 items)

### Temporary Workarounds
- [ ] Remove custom shim for '@isarmstrong/jitterbug-shim' once upstream or a stable alternative provides proper types.