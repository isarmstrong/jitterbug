/**
 * P4.4-c Security Tests: Ephemeral Key Registry
 * 
 * Tests to ensure:
 * 1. Meta tag key parsing is completely eliminated
 * 2. Keys are never persisted to browser storage 
 * 3. Secure key fetch lifecycle works correctly
 * 4. Key expiry and refresh mechanisms function properly
 * 5. Error handling fails securely
 */

import { describe, it, expect, beforeEach, afterEach, vi, type MockedFunction } from 'vitest';
import { getKeyRegistry } from '../keyRegistry.js';
import type { KeyRegistryEntry, EphemeralKeyResponse } from '../keyRegistry.js';

// Mock fetch for testing
const mockFetch = vi.fn() as MockedFunction<typeof fetch>;
global.fetch = mockFetch;

// Mock localStorage and sessionStorage to verify no persistence
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};

const mockSessionStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(), 
  removeItem: vi.fn(),
  clear: vi.fn()
};

Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });
Object.defineProperty(window, 'sessionStorage', { value: mockSessionStorage });

// Mock DOM for meta tag testing
const mockQuerySelector = vi.fn();
Object.defineProperty(document, 'querySelector', { value: mockQuerySelector });

describe('P4.4-c Security: Ephemeral Key Registry', () => {
  let registry: ReturnType<typeof getKeyRegistry>;

  beforeEach(() => {
    registry = getKeyRegistry();
    registry.clearKeys(); // Reset registry state
    
    // Clear all mocks
    mockFetch.mockClear();
    mockFetch.mockReset();
    mockLocalStorage.getItem.mockClear();
    mockLocalStorage.setItem.mockClear();
    mockSessionStorage.getItem.mockClear();
    mockSessionStorage.setItem.mockClear();
    mockQuerySelector.mockClear();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Meta Tag Elimination Tests', () => {
    it('SECURITY: never attempts to read meta tags for keys', async () => {
      // Mock successful API response
      const mockKeyResponse: EphemeralKeyResponse = {
        kid: 'test-key-001',
        secret: Buffer.from('a'.repeat(32)).toString('base64'),
        algorithm: 'sha256',
        expiresAt: Date.now() + 600_000 // 10 minutes
      };

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockKeyResponse), { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      );

      // Initialize registry - should use fetch, never querySelector
      await registry.initialize();

      // Verify NO meta tag queries were made
      expect(mockQuerySelector).not.toHaveBeenCalled();
      
      // Verify fetch WAS called with correct endpoint
      expect(mockFetch).toHaveBeenCalledWith('/api/jitterbug/keys', expect.objectContaining({
        method: 'GET',
        credentials: 'same-origin',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        })
      }));
    });

    it('SECURITY: rejects any attempt to parse HTML meta tag keys', async () => {
      // Even if meta tag exists, it should be ignored
      const mockMetaElement = {
        getAttribute: vi.fn().mockReturnValue('test-key:' + Buffer.from('a'.repeat(32)).toString('base64'))
      };
      mockQuerySelector.mockReturnValue(mockMetaElement);

      // Mock failed API to ensure no fallback to meta tags
      mockFetch.mockRejectedValueOnce(new Error('API unavailable'));

      try {
        await registry.initialize();
      } catch (error) {
        // Should fail without trying meta tags
        expect(mockQuerySelector).not.toHaveBeenCalled();
        expect(mockMetaElement.getAttribute).not.toHaveBeenCalled();
      }
    });
  });

  describe('Storage Persistence Prevention', () => {
    it('SECURITY: never persists keys to localStorage', async () => {
      const mockKeyResponse: EphemeralKeyResponse = {
        kid: 'test-key-002',
        secret: Buffer.from('b'.repeat(32)).toString('base64'),
        algorithm: 'sha256',
        expiresAt: Date.now() + 600_000
      };

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockKeyResponse), { status: 200 })
      );

      await registry.initialize();
      await registry.getKey('test-key-002');

      // Verify NO localStorage operations
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
      expect(mockLocalStorage.getItem).not.toHaveBeenCalled();
    });

    it('SECURITY: never persists keys to sessionStorage', async () => {
      const mockKeyResponse: EphemeralKeyResponse = {
        kid: 'test-key-003',
        secret: Buffer.from('c'.repeat(32)).toString('base64'),
        algorithm: 'sha256', 
        expiresAt: Date.now() + 600_000
      };

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockKeyResponse), { status: 200 })
      );

      await registry.initialize();
      await registry.getKey('test-key-003');

      // Verify NO sessionStorage operations
      expect(mockSessionStorage.setItem).not.toHaveBeenCalled();
      expect(mockSessionStorage.getItem).not.toHaveBeenCalled();
    });
  });

  describe('Secure Key Fetch Lifecycle', () => {
    it('should fetch ephemeral keys with correct authentication headers', async () => {
      const mockKeyResponse: EphemeralKeyResponse = {
        kid: 'eph-key-001',
        secret: Buffer.from('d'.repeat(32)).toString('base64'),
        algorithm: 'sha256',
        expiresAt: Date.now() + 600_000
      };

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockKeyResponse), { status: 200 })
      );

      await registry.initialize();
      
      expect(mockFetch).toHaveBeenCalledWith('/api/jitterbug/keys', expect.objectContaining({
        method: 'GET',
        credentials: 'same-origin',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        })
      }));
    });

    it('should validate minimum key length (32 bytes)', async () => {
      const shortKeyResponse: EphemeralKeyResponse = {
        kid: 'short-key',
        secret: Buffer.from('short').toString('base64'), // Only 5 bytes
        algorithm: 'sha256',
        expiresAt: Date.now() + 600_000
      };

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(shortKeyResponse), { status: 200 })
      );

      await expect(registry.initialize()).rejects.toThrow('Key short-key too short: 5 bytes (minimum 32)');
    });

    it('should handle API failure securely by clearing all keys', async () => {
      // Test that API failure clears keys securely
      // Mock network failure
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      // Registry should fail to initialize and clear keys on failure
      try {
        await registry.initialize();
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error.message).toBe('Network error');
      }

      // Registry should be empty after failed initialization
      const keys = await registry.getAllKeys().catch(() => new Map());
      expect(keys.size).toBe(0);
      
      // Getting any key should return null after failed initialization
      const key = await registry.getKey('any-key').catch(() => null);
      expect(key).toBeNull();
    });
  });

  describe('Key Expiry and Auto-Refresh', () => {
    it('should automatically refresh expired keys', async () => {
      vi.useFakeTimers();
      const now = Date.now();
      
      // Mock initial key that expires soon
      const initialKeyResponse: EphemeralKeyResponse = {
        kid: 'expiring-key',
        secret: Buffer.from('f'.repeat(32)).toString('base64'),
        algorithm: 'sha256',
        expiresAt: now + 1000 // Expires in 1 second
      };

      // Mock refreshed key - note the API returns a single key response
      const refreshedKeyResponse: EphemeralKeyResponse = {
        kid: 'refreshed-key', // Different key ID (API generates new keys)
        secret: Buffer.from('g'.repeat(32)).toString('base64'),
        algorithm: 'sha256', 
        expiresAt: now + 600_000 // 10 minutes from now
      };

      mockFetch
        .mockResolvedValueOnce(new Response(JSON.stringify(initialKeyResponse), { status: 200 }))
        .mockResolvedValueOnce(new Response(JSON.stringify(refreshedKeyResponse), { status: 200 }));

      await registry.initialize();
      const initialKey = await registry.getKey('expiring-key');
      expect(initialKey?.secret).toEqual(new Uint8Array(32).fill(0x66)); // 'f' character

      // Fast-forward past expiry
      vi.advanceTimersByTime(2000);

      // Getting expired key should trigger refresh - the old key will be gone, new key available
      const refreshedKey = await registry.getKey('expiring-key');
      expect(refreshedKey).toBeNull(); // Old key ID is gone
      
      // But the new key should be available
      const newKey = await registry.getKey('refreshed-key');
      expect(newKey?.secret).toEqual(new Uint8Array(32).fill(0x67)); // 'g' character

      expect(mockFetch).toHaveBeenCalledTimes(2);
      vi.useRealTimers();
    });

    it('should return null for non-existent keys without crashing', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({
          kid: 'existing-key',
          secret: Buffer.from('h'.repeat(32)).toString('base64'),
          algorithm: 'sha256',
          expiresAt: Date.now() + 600_000
        }), { status: 200 })
      );

      await registry.initialize();
      
      const nonExistentKey = await registry.getKey('non-existent-key');
      expect(nonExistentKey).toBeNull();
    });
  });

  describe('Error Handling Security', () => {
    it('should fail securely on malformed API response', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response('invalid json', { status: 200 })
      );

      try {
        await registry.initialize();
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        // Should get JSON parse error containing the problem text
        expect(error.message).toContain('invalid json');
      }
      
      // Registry should be empty after failed initialization
      const keys = await registry.getAllKeys().catch(() => new Map());
      expect(keys.size).toBe(0);
    });

    it('should fail securely on API error status codes', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
      );

      try {
        await registry.initialize();
        // If no error thrown, test should fail
        expect(true).toBe(false);
      } catch (error) {
        expect(error.message).toContain('Key fetch failed: 401');
      }
    });

    it('should prevent excessive API requests with cooldown', async () => {
      const validResponse = new Response(JSON.stringify({
        kid: 'cooldown-key',
        secret: Buffer.from('i'.repeat(32)).toString('base64'),
        algorithm: 'sha256',
        expiresAt: Date.now() + 600_000
      }), { status: 200 });

      mockFetch.mockResolvedValue(validResponse);

      // Multiple rapid calls should result in only one fetch due to promise caching
      await Promise.all([
        registry.initialize(),
        registry.initialize(),
        registry.initialize()
      ]);

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Integration Security Tests', () => {
    it('should work end-to-end: fetch, store in-memory, verify, expire', async () => {
      vi.useFakeTimers();
      const now = Date.now();
      
      const keyResponse: EphemeralKeyResponse = {
        kid: 'integration-key',
        secret: Buffer.from('j'.repeat(32)).toString('base64'),
        algorithm: 'sha256',
        expiresAt: now + 5000 // 5 seconds
      };

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(keyResponse), { status: 200 })
      );

      // 1. Initialize and verify key fetch
      await registry.initialize();
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // 2. Verify key is available and has correct properties
      const key = await registry.getKey('integration-key');
      expect(key).toBeTruthy();
      expect(key!.kid).toBe('integration-key');
      expect(key!.secret.length).toBe(32);
      expect(key!.algorithm).toBe('sha256');

      // 3. Verify key is in getAllKeys()
      const allKeys = await registry.getAllKeys();
      expect(allKeys.size).toBe(1);
      expect(allKeys.has('integration-key')).toBe(true);

      // 4. Fast-forward past expiry
      vi.advanceTimersByTime(6000);

      // 5. Expired key should be removed from getAllKeys() 
      const expiredKeys = await registry.getAllKeys();
      expect(expiredKeys.size).toBe(0);

      // 6. Verify no persistence to storage occurred
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
      expect(mockSessionStorage.setItem).not.toHaveBeenCalled();
      expect(mockQuerySelector).not.toHaveBeenCalled();

      vi.useRealTimers();
    });
  });
});