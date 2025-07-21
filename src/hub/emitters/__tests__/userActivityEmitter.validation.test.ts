/**
 * User Activity Emitter Validation Tests - RT-6
 * Tests schema validation for UserActivity to prevent malformed data injection
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { trackUserActivity, type UserActivity } from '../userActivityEmitter.js';

describe('UserActivity Schema Validation (RT-6)', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  const validActivity: UserActivity = {
    sessionId: 'test-session-123',
    activityType: 'page_view',
    timestamp: Date.now(),
    metadata: { page: '/dashboard' }
  };

  it('should accept valid UserActivity objects', () => {
    trackUserActivity(validActivity);
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('should reject activity with empty sessionId', () => {
    trackUserActivity({
      ...validActivity,
      sessionId: ''
    });
    
    expect(consoleSpy).toHaveBeenCalledWith(
      '[UserActivityEmitter] Invalid UserActivity rejected: sessionId must be a non-empty string',
      expect.any(Object)
    );
  });

  it('should reject activity with whitespace-only sessionId', () => {
    trackUserActivity({
      ...validActivity,
      sessionId: '   '
    });
    
    expect(consoleSpy).toHaveBeenCalledWith(
      '[UserActivityEmitter] Invalid UserActivity rejected: sessionId must be a non-empty string',
      expect.any(Object)
    );
  });

  it('should reject activity with non-string sessionId', () => {
    trackUserActivity({
      ...validActivity,
      sessionId: 123 as any
    });
    
    expect(consoleSpy).toHaveBeenCalledWith(
      '[UserActivityEmitter] Invalid UserActivity rejected: sessionId must be a non-empty string',
      expect.any(Object)
    );
  });

  it('should reject activity with invalid activityType', () => {
    trackUserActivity({
      ...validActivity,
      activityType: 'malicious_injection' as any
    });
    
    expect(consoleSpy).toHaveBeenCalledWith(
      '[UserActivityEmitter] Invalid UserActivity rejected: activityType must be one of: page_view, filter_change, debug_toggle, connection_event',
      expect.any(Object)
    );
  });

  it('should accept all valid activityTypes', () => {
    const validTypes: UserActivity['activityType'][] = [
      'page_view', 'filter_change', 'debug_toggle', 'connection_event'
    ];

    validTypes.forEach(activityType => {
      consoleSpy.mockClear();
      trackUserActivity({
        ...validActivity,
        activityType
      });
      expect(consoleSpy).not.toHaveBeenCalled();
    });
  });

  it('should reject activity with invalid timestamp', () => {
    // Test NaN
    trackUserActivity({
      ...validActivity,
      timestamp: NaN
    });
    expect(consoleSpy).toHaveBeenCalledWith(
      '[UserActivityEmitter] Invalid UserActivity rejected: timestamp must be a positive finite number',
      expect.any(Object)
    );

    consoleSpy.mockClear();

    // Test negative
    trackUserActivity({
      ...validActivity,
      timestamp: -1
    });
    expect(consoleSpy).toHaveBeenCalledWith(
      '[UserActivityEmitter] Invalid UserActivity rejected: timestamp must be a positive finite number',
      expect.any(Object)
    );

    consoleSpy.mockClear();

    // Test zero
    trackUserActivity({
      ...validActivity,
      timestamp: 0
    });
    expect(consoleSpy).toHaveBeenCalledWith(
      '[UserActivityEmitter] Invalid UserActivity rejected: timestamp must be a positive finite number',
      expect.any(Object)
    );

    consoleSpy.mockClear();

    // Test Infinity
    trackUserActivity({
      ...validActivity,
      timestamp: Infinity
    });
    expect(consoleSpy).toHaveBeenCalledWith(
      '[UserActivityEmitter] Invalid UserActivity rejected: timestamp must be a positive finite number',
      expect.any(Object)
    );
  });

  it('should reject activity with invalid metadata', () => {
    // Test null metadata
    trackUserActivity({
      ...validActivity,
      metadata: null as any
    });
    expect(consoleSpy).toHaveBeenCalledWith(
      '[UserActivityEmitter] Invalid UserActivity rejected: metadata must be a non-array object',
      expect.any(Object)
    );

    consoleSpy.mockClear();

    // Test array metadata
    trackUserActivity({
      ...validActivity,
      metadata: [] as any
    });
    expect(consoleSpy).toHaveBeenCalledWith(
      '[UserActivityEmitter] Invalid UserActivity rejected: metadata must be a non-array object',
      expect.any(Object)
    );

    consoleSpy.mockClear();

    // Test string metadata
    trackUserActivity({
      ...validActivity,
      metadata: 'not an object' as any
    });
    expect(consoleSpy).toHaveBeenCalledWith(
      '[UserActivityEmitter] Invalid UserActivity rejected: metadata must be a non-array object',
      expect.any(Object)
    );
  });

  it('should accept valid metadata objects', () => {
    const validMetadataExamples = [
      {},
      { key: 'value' },
      { complex: { nested: true }, count: 42 },
      { mixed: 'types', number: 123, boolean: true }
    ];

    validMetadataExamples.forEach(metadata => {
      consoleSpy.mockClear();
      trackUserActivity({
        ...validActivity,
        metadata
      });
      expect(consoleSpy).not.toHaveBeenCalled();
    });
  });

  it('should handle malformed activity objects gracefully', () => {
    // Missing properties should be caught by TypeScript, but test runtime behavior
    trackUserActivity({} as any);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[UserActivityEmitter] Invalid UserActivity rejected:'),
      expect.any(Object)
    );
  });
});