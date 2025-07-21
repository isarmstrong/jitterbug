/**
 * HMAC Internal Helpers - P4.4-a Security Internals
 * @internal - Not for external usage
 */

import { createHmac, randomBytes } from 'node:crypto';
import type { AnyPushFrame } from '../../emitters/registry.js';
import type { SignedPushFrame } from '../signed-frame.js';

/** @internal */
export interface FrameSigner {
  sign(frame: AnyPushFrame): SignedPushFrame;
}

/** @internal */
export interface FrameVerifier {
  verify(raw: unknown): asserts raw is SignedPushFrame;
}

/** @internal */
export interface HmacConfig {
  keyId: string;
  secret: Uint8Array;
  algorithm: 'sha256' | 'sha512';
  clockSkewToleranceMs: number;
}

/** @internal - Example only, do not use in production */
export const DEFAULT_HMAC_CONFIG: Partial<HmacConfig> = {
  algorithm: 'sha256',
  clockSkewToleranceMs: 10_000 // ±10 seconds
};

export function createHmacSigner(config: HmacConfig): FrameSigner & FrameVerifier {
  const { keyId, secret, algorithm, clockSkewToleranceMs } = {
    ...DEFAULT_HMAC_CONFIG,
    ...config
  };

  function sign(frame: AnyPushFrame): SignedPushFrame {
    const ts = Date.now();
    const nonce = randomBytes(12).toString('base64url');
    
    // Create canonical message for signing: kid|ts|nonce|payload
    const payloadJson = JSON.stringify(frame);
    const message = `${keyId}|${ts}|${nonce}|${payloadJson}`;
    
    // Generate HMAC signature
    const hmac = createHmac(algorithm, secret);
    hmac.update(message, 'utf8');
    const sig = hmac.digest('base64url');
    
    return {
      kid: keyId,
      ts,
      nonce,
      payload: frame,
      sig
    };
  }

  function verify(raw: unknown): asserts raw is SignedPushFrame {
    // Type guard validation
    if (typeof raw !== 'object' || raw === null) {
      throw new Error('Invalid frame: not an object');
    }
    
    const frame = raw as Record<string, unknown>;
    
    // Required fields validation
    if (typeof frame.kid !== 'string') {
      throw new Error('Invalid frame: missing or invalid kid');
    }
    if (typeof frame.ts !== 'number') {
      throw new Error('Invalid frame: missing or invalid ts');
    }
    if (typeof frame.nonce !== 'string') {
      throw new Error('Invalid frame: missing or invalid nonce');
    }
    if (typeof frame.sig !== 'string') {
      throw new Error('Invalid frame: missing or invalid sig');
    }
    if (typeof frame.payload !== 'object' || frame.payload === null) {
      throw new Error('Invalid frame: missing or invalid payload');
    }

    // Key ID validation
    if (frame.kid !== keyId) {
      throw new Error(`Invalid frame: unknown key ID ${frame.kid}`);
    }

    // Enhanced timestamp validation with replay protection
    const now = Date.now();
    
    // Replay window enforcement - reject frames older than tolerance
    if (frame.ts < (now - clockSkewToleranceMs)) {
      throw new Error(`Invalid frame: timestamp ${frame.ts} too old (replay protection)`);
    }
    
    // Clock skew validation - reject frames too far in future/past
    const timeDiff = Math.abs(now - frame.ts);
    if (timeDiff > clockSkewToleranceMs) {
      throw new Error(`Invalid frame: timestamp skew ${timeDiff}ms exceeds tolerance ${clockSkewToleranceMs}ms`);
    }

    // Signature verification
    const payloadJson = JSON.stringify(frame.payload);
    const message = `${frame.kid}|${frame.ts}|${frame.nonce}|${payloadJson}`;
    
    const hmac = createHmac(algorithm, secret);
    hmac.update(message, 'utf8');
    const expectedSig = hmac.digest('base64url');
    
    if (frame.sig !== expectedSig) {
      throw new Error('Invalid frame: signature verification failed');
    }
  }

  return { sign, verify };
}

/**
 * @internal - Utility to parse HMAC keys from environment variable
 * Format: "keyId1:base64Secret1,keyId2:base64Secret2"
 */
export function parseHmacKeys(envValue: string): Map<string, Uint8Array> {
  const keys = new Map<string, Uint8Array>();
  
  if (!envValue.trim()) {
    return keys;
  }
  
  for (const keyPair of envValue.split(',')) {
    const [keyId, secretB64] = keyPair.trim().split(':');
    if (!keyId || !secretB64) {
      throw new Error(`Invalid HMAC key format: ${keyPair}`);
    }
    
    try {
      const secret = Buffer.from(secretB64, 'base64');
      if (secret.length < 32) {
        throw new Error(`HMAC key ${keyId} too short: ${secret.length} bytes (minimum 32)`);
      }
      keys.set(keyId, new Uint8Array(secret));
    } catch (error) {
      throw new Error(`Invalid HMAC key ${keyId}: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  }
  
  return keys;
}