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
    getKey: async (kid: string) => {
      const secret = (testKeys as any)[kid];
      return secret ? { kid, secret, algorithm: 'sha256', expiresAt: Date.now() + 600_000 } : null;
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

  it('always verifies frames signed with valid keys', async () => {
    await fc.assert(fc.asyncProperty(
      genPayload(), fc.constantFrom('key1', 'key2'),
      async (payload, kid) => {
        const keySigner = createHmacSigner({
          keyId: kid, secret: testKeys[kid as keyof typeof testKeys],
          algorithm: 'sha256', clockSkewToleranceMs: 5_000, replayWindowMs: 10_000
        });
        const signed = keySigner.sign(payload);
        const result = await processFrame(signed);
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

  it('rejects tampered signatures', async () => {
    await fc.assert(fc.asyncProperty(genPayload(), async (payload) => {
      const signed = signer.sign(payload);
      const mutated = mutateSig(signed.sig);
      await expect(processFrame({...signed, sig: mutated})).rejects.toThrow();
    }), { numRuns: 20 });
  });

  it('rejects tampered payloads', async () => {
    await fc.assert(fc.asyncProperty(genPayload(), fc.string({maxLength: 20}), async (payload, tamper) => {
      const signed = signer.sign(payload);
      const tampered = {...signed, payload: {...payload, x: tamper}};
      await expect(processFrame(tampered)).rejects.toThrow(/signature verification failed/);
    }), { numRuns: 15 });
  });

  it('rejects unknown key IDs', async () => {
    await fc.assert(fc.asyncProperty(genPayload(), fc.string({maxLength: 10}).filter(s => 
      !testKeys.hasOwnProperty(s) && !['__proto__', 'constructor', 'toString'].includes(s)
    ), async (payload, unknownKid) => {
      const signed = signer.sign(payload);
      await expect(processFrame({...signed, kid: unknownKid})).rejects.toThrow(/Unknown key ID/);
    }), { numRuns: 10 });
  });

  it('detects replay attacks', async () => {
    await fc.assert(fc.asyncProperty(genPayload(), async (payload) => {
      const signed = signer.sign(payload);
      // First verification should succeed
      await expect(processFrame(signed)).resolves.not.toThrow();
      // Second verification of same frame should fail (replay)
      await expect(processFrame(signed)).rejects.toThrow(/Replay attack detected/);
    }), { numRuns: 10 });
  });

  it('rejects malformed fields', async () => {
    await fc.assert(fc.asyncProperty(genPayload(), fc.oneof(
      fc.constant({type: 'alg', val: 'SHA256'}), fc.constant({type: 'kid', val: ''})
    ), async (payload, mutation) => {
      const signed = signer.sign(payload);
      const mutated = mutation.type === 'alg' ? {...signed, alg: mutation.val} : {...signed, kid: mutation.val};
      await expect(processFrame(mutated as any)).rejects.toThrow();
    }), { numRuns: 10 });
  });

  it('rejects unsigned frames with security error', async () => {
    const unsignedFrame = { type: 'test', data: 'payload' };
    await expect(processFrame(unsignedFrame)).rejects.toThrow('Invalid frame: all frames must be signed (no unsigned frames allowed)');
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