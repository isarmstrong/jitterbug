# Changelog

## [Unreleased] P4.3 Production-Grade Server Push

### Added
- **P4.3 Server Push System**: Production-grade real-time push infrastructure
- Token bucket rate limiting (10 frame burst, 2 frames/sec sustained)
- Frame size hard cap (1KB) with DoS protection
- Registry auto-sealing and memory pressure protection
- PII redaction for user activity frames
- Factory functions for controlled API surface

### Breaking Changes
- **PushOrchestrator config**: Added `tokenBucket` configuration field
  - Migration: Update config objects to include token bucket settings
  - Default values provided for backward compatibility
- **API Surface**: Internalized low-level emitter factories
  - `createHeartbeatEmitter`, `createTelemetryEmitter`, `createUserActivityEmitter` now internal
  - Use `bootstrapPushSystem()` for standard emitter setup
  - Migration: Replace direct emitter creation with bootstrap function

### Security
- DoS protection via frame count and size limits
- Rate limiting prevents connection flooding
- PII redaction strips sensitive fields from activity metadata
- Registry sealing prevents runtime mutations

## Previous Versions

See git history for earlier P4.x milestones and SSE transport development.