# Jitterbug Consolidation Backlog

## Overview
Current State: In-progress consolidation of transports and core types
Target: Clean, Edge-first implementation with consolidated types
Priority: Complete transport layer and finalize core type system

## Project Requirements

### Dependencies
- TypeScript 5.0+
- Next.js 15+
- Edge Runtime
- React 18.2+

### Acceptance Criteria
- Full Next.js 15 support
- Clean component architecture
- Edge-first implementation
- Development tools working

## Workstreams & Order of Operations

### Critical Path (Immediate Focus)
1. **Module Resolution & Edge Runtime Types** (Blocking)
   - Fix missing package references in tsconfig.json
   - Resolve EdgeRuntime global type declaration
   - Address window vs. globalThis type conflicts
   - Update runtime detection type safety
   - **Impact:** Blocking test suite and type system stability

2. **Package Cleanup** (Blocking)
   - Remove `@isarmstrong/jitterbug-types`
   - Remove `@isarmstrong/jitterbug-core-types`
   - Update all import statements
   - Clean up package.json dependencies
   - **Impact:** Required for clean module resolution

### Concurrent Workstreams
1. **Type System & Package Structure**
   ```typescript
   // Core consolidation
   BaseEntry<T> -> LogEntry<T>
   BaseContext -> LogContext
   Transport -> LogTransport
   ```
   - Consolidate core types in src/types/core.ts
   - Update Next.js component imports
   - Clean up package.json exports
   - **Parallelizable with:** Transport Layer work

2. **Transport Layer & Memory Management**
   - Enhance ConsoleTransport implementation
   - Update EdgeTransport with core types
   - Integrate WeakMap caching
   - Add memory thresholds
   - **Parallelizable with:** Type System work

3. **Client Components & Development Tools**
   - Refine LogStream components
   - Update debug overlay
   - Implement hot reloading
   - **Parallelizable with:** All other streams

4. **Test Suite & Linting**
   - Update Vitest configuration
   - Add test type declarations
   - Refine ESLint settings
   - **Parallelizable with:** All other streams

## Type System Architecture

### Core Type Organization
1. Single Source of Truth
   - Location: `src/types/core.ts`
   - Purpose: Canonical type definitions
   - Status: ✓ Initial implementation complete

2. Type Hierarchy
   ```typescript
   // Core Types (Established)
   BaseEntry<T> -> LogEntry<T>
   BaseContext -> LogContext
   Transport -> LogTransport
   
   // Feature Types (In Progress)
   ExtendedEntry -> BaseEntry
   ExtendedContext -> BaseContext
   ```

3. Package Structure
   - Main Package: `@isarmstrong/jitterbug`
   - Subpath Exports:
     ```json
     {
       "./types": "./dist/types/core.js",
       "./next": "./dist/next/index.js",
       "./ebl": "./dist/types/ebl/index.js"
     }
     ```

### Type Migration Status
1. Deprecated Packages (To Remove)
   - [x] Identified all type dependencies
   - [ ] `@isarmstrong/jitterbug-types`
   - [ ] `@isarmstrong/jitterbug-core-types`
   - [ ] Update all import statements

2. Import Path Updates
   - [x] Core type imports consolidated
   - [x] Next.js component imports updated
   - [ ] Transport layer imports
   - [ ] EBL imports

## Sprint Progress

### Sprint 1: Core Cleanup & Consolidation
Focus: Remove legacy code and establish clean core

#### Package Consolidation (In Progress)
- Package Removal
  - [ ] Remove deprecated packages:
    - [ ] @isarmstrong/jitterbug-types
    - [ ] @isarmstrong/jitterbug-core-types
  - [ ] Update all import statements to use main package
  - [ ] Clean up package.json dependencies

#### Type System Finalization
- Core Type System
  - [✓] Move all core types to `src/types/core.ts`
  - [✓] Implement proper type hierarchy
  - [✓] Set up Edge Boundary Layer (EBL)
  - [✓] Establish single source of truth
  - [✓] Define canonical type hierarchy
  - [✓] Implement proper type exports
- Cleanup and Standardization
  - [ ] Remove duplicate type definitions
  - [ ] Update transport configurations

### Sprint 2: Edge Runtime Implementation
Duration: 1 week
Focus: Implement core Edge runtime features

#### Transport Layer (P0)
   - [✓] Implement Edge-optimized transport
   - [✓] Add SSE implementation
   - [✓] Create memory-aware streaming
   - [✓] Add backpressure handling

#### Memory Management (P0)
   - [✓] Implement WeakMap caching
   - [✓] Add memory thresholds
   - [✓] Create cleanup strategies
   - [ ] Add allocation tracking

#### Validation Layer (P0)
   - [✓] Implement runtime validation
   - [✓] Add type guards
   - [✓] Create boundary checks
   - [ ] Add error aggregation

#### Client Components (P0)
   - [✓] Create LogStream component
   - [✓] Add debug components
   - [✓] Implement error boundary
   - [✓] Add metrics display

#### Development Tools (P1)
   - [✓] Add development transport
   - [✓] Create debug overlay
   - [ ] Implement hot reloading
   - [✓] Add development API

## Current Blockers & Issues

### Type System
1. Module Resolution
   - Missing package references causing test failures
   - Import path resolution in tsconfig.json
   - Package.json exports field configuration

2. Edge Runtime Types
   - EdgeRuntime global type declaration
   - Window vs globalThis type conflicts
   - Runtime detection type safety

### Test Suite
1. Current Status
   - All test suites failing due to package resolution
   - Vitest configuration needs update
   - Type-check failures in test files

2. Required Fixes
   - Update test imports to new package structure
   - Fix module resolution in test environment
   - Add type declarations for test utilities

### Linting Configuration
1. Current Setup
   ```json
   "lint": "eslint . --ext .ts,.tsx,.js,.jsx",
   "lint:strict": "eslint . --ext .ts,.tsx --max-warnings=0"
   ```

2. Outstanding Issues
   - Component return type annotations
   - Unused variables in hooks
   - Edge runtime type declarations

## Implementation Notes

### Core Principles
- No backward compatibility required
- Remove all legacy patterns
- Focus on Edge runtime
- Clean implementation only

### Type System
- Core types now defined in src/types/core.ts
- Using progressive enhancement pattern
- Maintaining Edge runtime compatibility
- Following TypeScript Design Philosophy

### Transport Layer
- Consolidated transport implementations
- Using core type definitions
- Proper error handling
- Memory-conscious design

### Package Structure
- Moving to single package with subpath exports
- Maintaining backward compatibility
- Proper versioning strategy

## Success Metrics
1. Zero duplicate type definitions
2. All imports using main package
3. Consistent transport implementations
4. Memory usage within Edge limits
5. Clean package structure

## Architecture Rules
1. All types must extend from core.ts
2. Transport implementations must use core types
3. Memory management required for Edge runtime
4. Proper error handling in all transports

## Quality Gates
- [ ] Type coverage > 95%
- [ ] No duplicate type definitions
- [ ] All transports implement core interfaces
- [ ] Memory usage within thresholds
- [ ] Error handling in place

## Next Steps
1. Remove deprecated packages
2. Update import statements
3. Clean up package structure
4. Finalize transport implementations
5. Complete memory management integration

## Progress Tracking
- Total Tasks: 35
- Completed: 23
- In Progress: 7
- Pending: 5

## Decision Log
1. 2024-02-06: Consolidated core types into src/types/core.ts
2. 2024-02-06: Implemented Edge Boundary Layer (EBL)
3. 2024-02-06: Updated package structure to use subpath exports
4. 2024-02-06: Standardized transport layer implementations
5. 2024-02-06: Added comprehensive type declarations for Edge runtime
6. 2024-02-06: Reorganized workstreams to prioritize blocking issues

Last Updated: 2024-02-06