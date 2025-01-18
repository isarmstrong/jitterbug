# Jitterbug Architecture

## Core Components

Jitterbug uses a four-layer architecture for robust logging and debugging:

### 1. Core Layer (Entry Point)

- Handles log creation and initial validation
- Manages configuration and context
- Provides the main debug/log interface
- Example: `createJitterbug()`, `createDebug()`

### 2. Processor Layer (Transformation)

- Processes log entries before transport
- Handles error aggregation and metrics
- Sanitizes sensitive data
- Example: `ErrorAggregationProcessor`, `MetricsProcessor`

### 3. Transport Layer (Output)

- Manages log delivery to various targets
- Handles connection and buffering
- Supports different runtimes (Edge, Browser, Node)
- Example: `ConsoleTransport`, `GUITransport`

### 4. UI Layer (Visualization)

- Provides real-time log visualization
- Manages log filtering and display
- Handles user interaction
- Example: `DebugUI` component

## Key Design Principles

1. **Type Safety**

   - Strong typing across all layers
   - Generic constraints for log data
   - Runtime-specific type guards

2. **Runtime Awareness**

   - Edge-first design
   - Runtime detection and validation
   - Environment-specific optimizations

3. **Extensibility**

   - Modular processor architecture
   - Pluggable transport system
   - Custom UI components

4. **Performance**
   - Efficient buffering and batching
   - Minimal runtime overhead
   - Smart reconnection strategies

## Testing Strategy

Each layer should be tested independently and in integration:

- Unit tests for core functionality
- Integration tests across layers
- Runtime-specific tests
- UI component tests

## Type System

The type system follows these principles:

1. Generic constraints for type safety
2. Interface contracts for extensibility
3. Runtime type detection
4. Async method contracts

See `type-patterns.xml` for specific type patterns and solutions.
