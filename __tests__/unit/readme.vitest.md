# Jitterbug Test Suite Documentation

## Test Structure

The test suite is organized into several categories to ensure comprehensive coverage of Jitterbug's functionality:

### 1. Core Tests (`core.test.ts`)
- Initialization and configuration
- Logging methods (debug, info, warn, error, fatal)
- Context management
- Enable/disable functionality

### 2. Runtime Detection Tests (`runtime.test.ts`)
- Edge runtime detection
- Node.js runtime detection
- Environment detection (development, production, test)

### 3. API Diagnostics Tests (`api.test.ts`)
- Request logging and context tracking
- Error handling and stack traces
- Performance monitoring
- Rate limiting diagnostics

### 4. Cache Diagnostics Tests (`cache.test.ts`)
- Cache operation logging
- Hit/miss tracking
- Eviction monitoring
- Error handling
- Performance metrics

### 5. Cache Plugin Tests (`cache-plugins.test.ts`)
- Upstash Redis Plugin
  - JSON serialization tracking
  - Connection error handling
  - Batch operation monitoring
- KV Plugin
  - List operation tracking
  - Storage quota management
  - Metadata operation logging
- Common Operations
  - TTL monitoring
  - Memory usage tracking

### 6. Component Debug Tests (`component-debug.test.ts`)
- NextUI Component Debugging
  - Render lifecycle tracking
  - Style system monitoring
  - Accessibility validation
  - Theme composition errors
- Sanity Integration
  - Visual editor interactions
  - Template persistence
  - Preview generation

## Test Coverage

Total Test Files: 6
Total Test Cases: 40

### Coverage Areas:
1. Core Functionality
   - Logger initialization
   - Log level management
   - Context handling
   - Runtime configuration

2. Edge Runtime
   - Runtime detection
   - Environment handling
   - Memory constraints
   - Request context

3. API Integration
   - Request lifecycle
   - Error scenarios
   - Performance tracking
   - Rate limiting

4. Cache Operations
   - Basic operations (get, set)
   - Hit rate monitoring
   - Eviction patterns
   - Performance metrics

5. Cache Plugins
   - Upstash Redis integration
   - KV store integration
   - Memory management
   - Error handling
   - Performance monitoring

6. Component Debugging
   - Render lifecycle
   - Style system
   - Accessibility
   - Theme composition
   - Visual editing
   - Template management

## Mock Implementations

### MockProcessor
- Implements `LogProcessor` interface
- Tracks processed log entries
- Supports all runtimes and environments
- Async processing simulation

### MockTransport
- Implements `LogTransport` interface
- Stores log entries for verification
- Supports all runtimes and environments
- Async write simulation

## Running Tests

```bash
pnpm test
```

## Best Practices

1. Test Isolation
   - Each test should be independent
   - Clean up resources after each test
   - Use beforeEach for setup

2. Async Testing
   - Use async/await for asynchronous operations
   - Handle promises correctly
   - Test error scenarios

3. Context Verification
   - Check log levels
   - Verify context data
   - Validate metrics

4. Edge Runtime Considerations
   - Test memory constraints
   - Verify request context
   - Check environment detection

5. Cache Plugin Testing
   - Test serialization/deserialization
   - Verify error handling
   - Monitor performance metrics
   - Check quota management

6. Component Testing
   - Track render lifecycle
   - Validate style systems
   - Check accessibility
   - Monitor theme composition
   - Test visual editing
   - Verify template persistence
