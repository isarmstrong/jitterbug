# Jitterbug Maintenance Guide

## Type System Maintenance

### Common Type Issues
1. Runtime type detection issues (see `type-patterns.xml`)
2. Generic constraints on log entries
3. Transport/processor interface implementations
4. Async method contracts

### When Adding New Features
1. Review existing type patterns
2. Ensure consistent interface implementation
3. Add appropriate tests
4. Update documentation

### Testing Guidelines
1. Keep test files in JavaScript for simplicity
2. Focus on runtime behavior over type checking
3. Test each architectural layer independently
4. Include integration tests across layers

## Architecture Maintenance

### Adding New Components
1. Follow the four-layer architecture (see `architecture.md`)
2. Implement required interface contracts
3. Add appropriate type constraints
4. Include runtime detection

### Runtime Considerations
1. Test in all supported runtimes (Edge, Browser, Node)
2. Verify SSE functionality in Edge functions
3. Check memory usage and performance
4. Validate type safety across boundaries

## Common Patterns

### Type Safety
- Always use proper generic constraints
- Implement complete interfaces
- Handle async contracts correctly
- Use runtime type guards

### Error Handling
- Proper error aggregation
- Consistent error types
- Runtime-specific error handling
- Error boundary considerations

### Performance
- Buffer size management
- Connection handling
- Memory usage monitoring
- Edge function constraints 