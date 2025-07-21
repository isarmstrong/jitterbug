/**
 * HMAC Signer Tests - P4.4-a Frame HMAC
 * Tests for cryptographic frame signing and verification
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createHmacSigner, parseHmacKeys } from '../_internal/hmac.js';
import type { AnyPushFrame } from '../../emitters/registry.js';

describe('HMAC Signer - P4.4-a', () => {
  const testSecret = new Uint8Array(32).fill(0x42); // 32-byte test key
  const testKeyId = 'test-key-001';
  
  let signer: ReturnType<typeof createHmacSigner>;
  
  beforeEach(() => {
    signer = createHmacSigner({
      keyId: testKeyId,
      secret: testSecret,
      algorithm: 'sha256',
      clockSkewToleranceMs: 10_000
    });
  });

  describe('Frame Signing', () => {
    it('should sign heartbeat frames', () => {
      const frame: AnyPushFrame = { t: 'hb', ts: Date.now() };
      
      const signed = signer.sign(frame);
      
      expect(signed.kid).toBe(testKeyId);
      expect(signed.ts).toBeGreaterThan(Date.now() - 1000);
      expect(signed.nonce).toHaveLength(16); // base64url of 12 bytes
      expect(signed.payload).toEqual(frame);
      expect(signed.sig).toMatch(/^[A-Za-z0-9_-]+$/); // base64url pattern
    });

    it('should sign telemetry frames', () => {
      const frame: AnyPushFrame = { t: 'tm', ts: Date.now(), cpu: 45.2, mem: 512 };
      
      const signed = signer.sign(frame);
      
      expect(signed.payload).toEqual(frame);
      expect(signed.sig).toBeTruthy();
    });

    it('should sign user activity frames', () => {
      const frame: AnyPushFrame = { 
        t: 'ua', 
        ts: Date.now(), 
        meta: { total: 5, unique_users: 3 } 
      };
      
      const signed = signer.sign(frame);
      
      expect(signed.payload).toEqual(frame);
      expect(signed.sig).toBeTruthy();
    });

    it('should generate unique nonces', () => {
      const frame: AnyPushFrame = { t: 'hb', ts: Date.now() };
      
      const signed1 = signer.sign(frame);
      const signed2 = signer.sign(frame);
      
      expect(signed1.nonce).not.toBe(signed2.nonce);
      expect(signed1.sig).not.toBe(signed2.sig);
    });
  });

  describe('Frame Verification', () => {
    it('should verify valid signed frames', () => {
      const frame: AnyPushFrame = { t: 'hb', ts: Date.now() };
      const signed = signer.sign(frame);
      
      expect(() => signer.verify(signed)).not.toThrow();
    });

    it('should reject frames with invalid signatures', () => {
      const frame: AnyPushFrame = { t: 'hb', ts: Date.now() };
      const signed = signer.sign(frame);
      
      // Tamper with signature
      const tampered = { ...signed, sig: signed.sig.slice(0, -1) + 'X' };
      
      expect(() => signer.verify(tampered)).toThrow('signature verification failed');
    });

    it('should reject frames with wrong key ID', () => {
      const frame: AnyPushFrame = { t: 'hb', ts: Date.now() };
      const signed = signer.sign(frame);
      
      // Wrong key ID
      const wrongKey = { ...signed, kid: 'wrong-key' };
      
      expect(() => signer.verify(wrongKey)).toThrow('unknown key ID');
    });

    it('should reject frames with clock skew (future)', () => {
      const now = Date.now();
      const frame: AnyPushFrame = { t: 'hb', ts: now };
      
      // Create frame in the "future" relative to verification time
      vi.setSystemTime(now + 15_000);
      const signed = signer.sign(frame);
      
      // Verify from "past" perspective (15s difference = skew)
      vi.setSystemTime(now);
      
      expect(() => signer.verify(signed)).toThrow('timestamp skew');
      
      vi.useRealTimers();
    });

    it('should reject old frames (replay protection)', () => {
      const now = Date.now();
      const frame: AnyPushFrame = { t: 'hb', ts: now };
      
      // Create frame at specific time
      vi.setSystemTime(now);
      const signed = signer.sign(frame);
      
      // Move far into future to trigger replay protection
      vi.setSystemTime(now + 25_000); // Well beyond 10s tolerance
      
      expect(() => signer.verify(signed)).toThrow('too old (replay protection)');
      
      vi.useRealTimers();
    });

    it('should reject malformed frames', () => {
      expect(() => signer.verify(null)).toThrow('not an object');
      expect(() => signer.verify({})).toThrow('missing or invalid kid');
      expect(() => signer.verify({ kid: 'test' })).toThrow('missing or invalid ts');
    });

    it('should reject frames with tampered payload', () => {
      const frame: AnyPushFrame = { t: 'hb', ts: Date.now() };
      const signed = signer.sign(frame);
      
      // Tamper with payload
      const tampered = { 
        ...signed, 
        payload: { ...signed.payload, t: 'tm' as const }
      };
      
      expect(() => signer.verify(tampered)).toThrow('signature verification failed');
    });
  });

  describe('Round-trip Verification', () => {
    it('should successfully round-trip all frame types', () => {
      const frames: AnyPushFrame[] = [
        { t: 'hb', ts: Date.now() },
        { t: 'tm', ts: Date.now(), cpu: 25.0, mem: 256 },
        { t: 'ua', ts: Date.now(), meta: { total: 10, unique_users: 5 } }
      ];
      
      for (const frame of frames) {
        const signed = signer.sign(frame);
        expect(() => signer.verify(signed)).not.toThrow();
        expect(signed.payload).toEqual(frame);
      }
    });
  });

  describe('Key Parsing', () => {
    it('should parse single HMAC key', () => {
      const envValue = 'key1:' + Buffer.from(testSecret).toString('base64');
      const keys = parseHmacKeys(envValue);
      
      expect(keys.size).toBe(1);
      expect(keys.has('key1')).toBe(true);
      expect(keys.get('key1')).toEqual(testSecret);
    });

    it('should parse multiple HMAC keys', () => {
      const secret1 = new Uint8Array(32).fill(0x11);
      const secret2 = new Uint8Array(32).fill(0x22);
      const envValue = `key1:${Buffer.from(secret1).toString('base64')},key2:${Buffer.from(secret2).toString('base64')}`;
      
      const keys = parseHmacKeys(envValue);
      
      expect(keys.size).toBe(2);
      expect(keys.get('key1')).toEqual(secret1);
      expect(keys.get('key2')).toEqual(secret2);
    });

    it('should reject short keys', () => {
      const shortSecret = new Uint8Array(16).fill(0x42); // Too short
      const envValue = 'key1:' + Buffer.from(shortSecret).toString('base64');
      
      expect(() => parseHmacKeys(envValue)).toThrow('too short');
    });

    it('should reject malformed key pairs', () => {
      expect(() => parseHmacKeys('invalid')).toThrow('Invalid HMAC key format');
      expect(() => parseHmacKeys('key1:')).toThrow('Invalid HMAC key format');
    });

    it('should handle empty key string', () => {
      const keys = parseHmacKeys('');
      expect(keys.size).toBe(0);
    });
  });
});