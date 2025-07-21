/**
 * P4.4-b-2: Fuzz & Mutation Testing of HMAC Verification
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';
import { createHmacSigner } from '../../../../hub/security/_internal/hmac.js';
import type { AnyPushFrame } from '../../../../hub/emitters/registry.js';

const testKeys = {
  key1: new Uint8Array(32).fill(0x11),
  key2: new Uint8Array(32).fill(0x22),
};

// -- 2) Mock the real keyRegistry **before** importing processFrame
vi.mock('../../../crypto/keyRegistry.js', () => ({
  getKeyRegistry: () => ({
    getKey: (kid: string) => {
      const secret = (testKeys as any)[kid];
      return secret ? { kid, secret, algorithm: 'sha256' } : null;
    },
  }),
}));

// -- 3) Now import the thing under test
import { processFrame } from '../verify.js';

describe('P4.4-b-2: HMAC Verification Fuzzing', () => {
  let signer: ReturnType<typeof createHmacSigner>;

  beforeEach(() => {
    signer = createHmacSigner({
      keyId: 'key1',
      secret: testKeys.key1,
      algorithm: 'sha256',
      clockSkewToleranceMs: 5_000,
      replayWindowMs: 10_000,
    });
  });

  it('always verifies frames signed with valid keys', () => {
    fc.assert(fc.property(
      genPayload(), fc.constantFrom('key1', 'key2'),
      (payload, kid) => {
        const keySigner = createHmacSigner({
          keyId: kid, secret: testKeys[kid as keyof typeof testKeys],
          algorithm: 'sha256', clockSkewToleranceMs: 5_000, replayWindowMs: 10_000
        });
        const signed = keySigner.sign(payload);
        const result = processFrame(signed);
        expect(result).toEqual(payload);
      }
    ), { numRuns: 20 });
  });

  it('generates unique signatures for identical payloads', () => {
    fc.assert(fc.property(genPayload(), (payload) => {
      const s1 = signer.sign(payload), s2 = signer.sign(payload);
      expect(s1.nonce).not.toBe(s2.nonce);
      expect(s1.sig).not.toBe(s2.sig);
    }), { numRuns: 15 });
  });

  it('rejects tampered signatures', () => {
    fc.assert(fc.property(genPayload(), (payload) => {
      const signed = signer.sign(payload);
      const mutated = mutateSig(signed.sig);
      expect(() => processFrame({...signed, sig: mutated})).toThrow();
    }), { numRuns: 20 });
  });

  it('rejects tampered payloads', () => {
    fc.assert(fc.property(genPayload(), fc.string({maxLength: 20}), (payload, tamper) => {
      const signed = signer.sign(payload);
      const tampered = {...signed, payload: {...payload, x: tamper}};
      expect(() => processFrame(tampered)).toThrow(/signature verification failed/);
    }), { numRuns: 15 });
  });

  it('rejects unknown key IDs', () => {
    fc.assert(fc.property(genPayload(), fc.string({maxLength: 10}).filter(s => 
      !testKeys.hasOwnProperty(s) && !['__proto__', 'constructor', 'toString'].includes(s)
    ), (payload, unknownKid) => {
      const signed = signer.sign(payload);
      expect(() => processFrame({...signed, kid: unknownKid})).toThrow(/Unknown key ID/);
    }), { numRuns: 10 });
  });

  it('detects replay attacks', () => {
    fc.assert(fc.property(genPayload(), (payload) => {
      const signed = signer.sign(payload);
      // First verification should succeed
      expect(() => processFrame(signed)).not.toThrow();
      // Second verification of same frame should fail (replay)
      expect(() => processFrame(signed)).toThrow(/Replay attack detected/);
    }), { numRuns: 10 });
  });

  it('rejects malformed fields', () => {
    fc.assert(fc.property(genPayload(), fc.oneof(
      fc.constant({type: 'alg', val: 'SHA256'}), fc.constant({type: 'kid', val: ''})
    ), (payload, mutation) => {
      const signed = signer.sign(payload);
      const mutated = mutation.type === 'alg' ? {...signed, alg: mutation.val} : {...signed, kid: mutation.val};
      expect(() => processFrame(mutated as any)).toThrow();
    }), { numRuns: 10 });
  });

  it('rejects unsigned frames with security error', () => {
    const unsignedFrame = { type: 'test', data: 'payload' };
    expect(() => processFrame(unsignedFrame)).toThrow('Invalid frame: all frames must be signed (no unsigned frames allowed)');
  });
});

function genPayload(): fc.Arbitrary<AnyPushFrame> {
  const ts = fc.integer({min: Date.now()-1000, max: Date.now()+1000});
  return fc.oneof(
    fc.record({t: fc.constant('hb'), ts}),
    fc.record({t: fc.constant('tm'), ts, cpu: fc.float({max: 100}), mem: fc.integer({max: 8192})})
  );
}

function mutateSig(sig: string): string {
  const chars = sig.split(''), i = Math.floor(Math.random() * chars.length);
  chars[i] = chars[i] === 'A' ? 'B' : 'A';
  return chars.join('');
}