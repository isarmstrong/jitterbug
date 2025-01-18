# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.4] - 2024-03-XX

### Added

- Rate limiting in Edge transport using p-throttle
  - Configurable requests per second (default: 10)
  - Automatic queue management with backpressure handling
  - Graceful payload splitting for large batches
  - New config options: `requestsPerSecond` and `maxConcurrent`
- Added RegExp pattern support to SanitizeProcessor for flexible key matching
- Added configurable array sanitization to SanitizeProcessor
  - New `sanitizeArrays` option for recursive array processing
  - Default `false` for backward compatibility
  - Enables thorough sanitization of nested array data
- Enhanced runtime detection with explicit checks
  - Added process.versions.node validation for Node.js
  - Added window.document.createElement check for Browser
  - Added EdgeRuntime string validation for Edge
- Improved namespace validation and handling
  - Added strict empty string validation for APP_NAME
  - Implemented automatic whitespace trimming
  - Enhanced fallback to "app" for invalid namespaces
  - Improved hierarchical namespace construction with proper separators
- Added new GUITransport state management system
  - Introduced `GUITransportState` interface for unified state updates
  - Added `onStateUpdate` callback for real-time state synchronization
  - Improved entry filtering with configurable filters
- Enhanced GUITransport with EdgeTransport integration
  - Added EdgeTransport configuration support
  - Implemented bidirectional log synchronization
  - Added connection state tracking
  - Improved state management with immutable updates
  - Enhanced backward compatibility with legacy callbacks
- Aligned React dependencies for ecosystem compatibility
  - Downgraded to React 18.2.0 for Next.js 15 compatibility
  - Matched @types/react version to 18.2.0 for type safety
  - Enhanced JSX runtime configuration
  - Improved React component type definitions
  - Added proper TypeScript/ESLint integration for React

### Changed

- Enhanced type safety across the codebase
  - Stricter boolean expressions and null checks
  - Improved error message handling
  - Runtime-aware type guards
  - Strengthened configuration type safety
- Updated ESLint configuration for stricter type checking
  - Added version-specific React rules
  - Enhanced TypeScript/ESLint integration
  - Improved JSX runtime configuration
  - Added component return type validation
  - Enhanced hook dependency validation
  - Strengthened prop type checking
  - Added state management type safety
- Improved error handling patterns in core components
- Reduced dependency footprint
- Renamed package from @pocma/jitterbug to @isarmstrong/jitterbug
- Enhanced SanitizeProcessor key matching
  - Now supports both string and RegExp patterns
  - Improved exact match comparison for string patterns
  - Added support for complex pattern matching with RegExp
- Improved environment detection
  - Added explicit process and env existence checks
  - Enhanced NODE_ENV validation
  - Better development environment fallback logic
- Refactored GUITransport for better state management
  - Converted to async write operations for LogTransport compatibility
  - Added configuration options for maxEntries and default filters
  - Improved entry validation and sanitization
  - Enhanced type safety for callbacks and state updates
  - Added immutable state handling with readonly types
  - Improved React state management with proper type boundaries
- Improved GUITransport architecture
  - Added async write operations for better transport compatibility
  - Enhanced state management with immutable updates
  - Improved entry validation and sanitization
  - Added proper cleanup of Edge transport resources
  - Enhanced type safety for callbacks and state updates

### Deprecated

- Default sensitive keys list in SanitizeProcessor
  - The default list will be removed in version 2.0.0
  - Users must explicitly provide sensitive keys through constructor
  - See migration guide below for updating existing code
- Legacy GUITransport methods
  - `onUpdate`: Use `onStateUpdate` for state-aware updates
  - `setFilter`: Use the new filtering system via state management
  - `getEntries`: Use state updates for entry access
  - These methods will be removed in version 2.0.0

### Fixed

- Memory leak in Edge transport queue management
  - Fixed unbounded growth of throttled promises queue
  - Added request tracking with pendingRequests counter
  - Implemented maxPendingRequests limit (2x maxConcurrent)
  - Enhanced backpressure mechanism for queue control
  - Improved resource cleanup and memory management
- Type inference issues in processor chain
- Incorrect runtime detection edge cases
  - Restored explicit EdgeRuntime check as primary detection method
  - Improved runtime detection order (Edge → Browser → Node.js)
  - Added safe fallback for Next.js Edge Runtime environments
  - Enhanced type safety in runtime checks
- Fixed transport configuration synchronization
  - Resolved mismatch between instance transports and config transports
  - Added proper transport array initialization with spread operator
  - Improved transport state management and configuration
  - Enhanced transport configuration safety and validation
  - Fixed transport array reference issues
- Fixed nested array sanitization in SanitizeProcessor
  - Resolved issue with deeply nested sensitive data not being properly sanitized
  - Added recursive processing of nested arrays when sanitizeArrays is enabled
  - Improved type safety for array traversal
  - Enhanced handling of multi-dimensional arrays
- Environment detection reliability
  - Added null checks for process.env
  - Improved NODE_ENV validation
  - Better handling of undefined environment cases
- Fixed shouldLog method to properly respect logger's enabled state
  - Added enabled flag check before level evaluation
  - Prevents unintended log processing when logger is disabled
  - Maintains existing log level threshold behavior
- Fixed message handling in LogContext
  - Added explicit string type checking
  - Improved empty string handling
  - Better null/undefined value management
- Fixed namespace handling to prevent empty or invalid namespaces
  - Added validation for process.env.APP_NAME
  - Improved fallback behavior for undefined cases
  - Enhanced namespace concatenation safety
- Fixed GUITransport filter synchronization
  - Resolved filter state inconsistency between transport and UI
  - Improved filter state propagation through state updates
  - Enhanced filter performance by preventing unnecessary entry processing
  - Added proper type safety for filter operations
- Fixed GUITransport backward compatibility
  - Restored legacy callback support while maintaining new state system
  - Fixed entry synchronization between GUI and Edge transports
  - Improved connection state handling and error recovery
  - Enhanced cleanup and resource management
  - Fixed filter state synchronization issues

### Security

- Added automatic sanitization of sensitive data in logs
- Improved validation of transport configurations
- Fixed critical security vulnerability in SanitizeProcessor where compound keys containing sensitive patterns (e.g., "userPassword") were not being properly redacted
- Enhanced error stack trace handling
- Improved runtime detection security
  - Added type guards for global objects
  - Enhanced validation of environment variables
  - Better protection against undefined runtime states
- Enhanced Edge transport security
  - Added proper connection state management
  - Improved payload validation and sanitization
  - Enhanced error handling and recovery
  - Added proper resource cleanup
  - Improved type safety for transport operations

### Migration

To update your SanitizeProcessor initialization to use explicit sensitive keys:

```typescript
const processor = new SanitizeProcessor({
  sensitiveKeys: [
    "password",
    "token",
    /secret.*/i,
    // ... add your sensitive patterns
  ],
});
```

To migrate from legacy GUITransport methods to the new state management system:

```typescript
// Before
const transport = new GUITransport();
transport.onUpdate((entries) => {
  console.log("Entries updated:", entries);
});
transport.setFilter("namespace", true);
const entries = transport.getEntries();

// After
const transport = new GUITransport({
  maxEntries: 1000,
  defaultFilters: { namespace: true },
});
transport.onStateUpdate((state) => {
  console.log("State updated:", {
    entries: state.entries,
    filters: state.filters,
  });
});
```
