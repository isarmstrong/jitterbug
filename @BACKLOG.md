# Type System & Core Implementation Backlog

## Overview
Current State: Pre-alpha with legacy facade pattern
Target: Clean, Edge-first implementation with consolidated types
Priority: Remove legacy code and establish clean architecture

## Sprint 1: Core Cleanup & Consolidation
Duration: 1 week
Focus: Remove legacy code and establish clean core

### Tasks
1. **Remove Legacy Code** (P0)
   - [ ] Delete facade pattern and legacy exports
   - [ ] Remove duplicate package structure
   - [ ] Clean up legacy type definitions
   - [ ] Delete transitional compatibility layers

2. **Establish Core Package** (P0)
   - [ ] Move all core types to `src/types/core.ts`
   - [ ] Implement proper type hierarchy
   - [ ] Set up Edge Boundary Layer (EBL)
   - [ ] Create clean export structure

3. **Package Structure** (P0)
   - [ ] Remove `jitterbug-types` package
   - [ ] Remove `jitterbug-core-types` package
   - [ ] Consolidate into single package structure
   - [ ] Update all import paths

### Acceptance Criteria
- Zero legacy code or facades
- Single source of truth for types
- Clean package structure
- All imports updated

## Sprint 2: Edge Runtime Implementation
Duration: 1 week
Focus: Implement core Edge runtime features

### Tasks
1. **Transport Layer** (P0)
   - [ ] Implement Edge-optimized transport
   - [ ] Add SSE implementation
   - [ ] Create memory-aware streaming
   - [ ] Add backpressure handling

2. **Memory Management** (P0)
   - [ ] Implement WeakMap caching
   - [ ] Add memory thresholds
   - [ ] Create cleanup strategies
   - [ ] Add allocation tracking

3. **Validation Layer** (P0)
   - [ ] Implement runtime validation
   - [ ] Add type guards
   - [ ] Create boundary checks
   - [ ] Add error aggregation

### Acceptance Criteria
- Full Edge runtime support
- Memory-safe implementation
- Complete validation system
- No Node.js dependencies

## Sprint 3: Next.js Integration
Duration: 1 week
Focus: Clean Next.js implementation

### Tasks
1. **Core Integration** (P0)
   - [ ] Implement Next.js middleware
   - [ ] Add App Router support
   - [ ] Create Edge API routes
   - [ ] Add streaming support

2. **Client Components** (P0)
   - [ ] Create LogStream component
   - [ ] Add debug components
   - [ ] Implement error boundary
   - [ ] Add metrics display

3. **Development Tools** (P1)
   - [ ] Add development transport
   - [ ] Create debug overlay
   - [ ] Implement hot reloading
   - [ ] Add development API

### Acceptance Criteria
- Full Next.js 15 support
- Clean component architecture
- Edge-first implementation
- Development tools working

## Dependencies
- TypeScript 5.0+
- Next.js 15+
- Edge Runtime
- React 18.2+

## Implementation Notes
- No backward compatibility required
- Remove all legacy patterns
- Focus on Edge runtime
- Clean implementation only

## Success Metrics
- Zero legacy code
- 100% Edge compatible
- <150kb bundle size
- <10ms initialization

## Architecture Rules
1. Edge-First
   - No Node.js specific code
   - Memory conscious
   - Stream-based
   - Runtime validation

2. Type Safety
   - Single source of truth
   - No type duplication
   - Full inference
   - Runtime validation

3. Package Structure
   - Single main package
   - Clean exports
   - No internal packages
   - Clear boundaries

4. Development
   - Fast refresh support
   - Clear error messages
   - Development tools
   - Easy debugging 