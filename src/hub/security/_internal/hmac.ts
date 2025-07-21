/**
 * HMAC Internal Helpers - P4.4-a Security Internals
 * @internal - Not for external usage
 */

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
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
  replayWindowMs: number;
}

/** @internal - Distinct security boundaries */
const REPLAY_WINDOW_MS = 2_000;      // 2 seconds - reject very old frames (replay protection)
const CLOCK_SKEW_TOLERANCE_MS = 5_000; // 5 seconds - allow for clock differences

/** @internal - Example only, do not use in production */
export const DEFAULT_HMAC_CONFIG: Partial<HmacConfig> = {
  algorithm: 'sha256', // Secure default - SHA-256 minimum
  clockSkewToleranceMs: CLOCK_SKEW_TOLERANCE_MS,
  replayWindowMs: REPLAY_WINDOW_MS
};

/**
 * Constant-time string comparison to prevent timing attacks
 * @internal
 */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  // Convert strings to buffers for timing-safe comparison
  const bufferA = Buffer.from(a, 'utf8');
  const bufferB = Buffer.from(b, 'utf8');
  
  // Use Node.js crypto.timingSafeEqual for constant-time comparison
  return timingSafeEqual(bufferA, bufferB);
}

export function createHmacSigner(config: HmacConfig): FrameSigner & FrameVerifier {
  const { keyId, secret, algorithm, clockSkewToleranceMs, replayWindowMs } = {
    ...DEFAULT_HMAC_CONFIG,
    ...config
  };

  function sign(frame: AnyPushFrame): SignedPushFrame {
    const ts = Date.now();
    const nonce = randomBytes(12).toString('base64url');
    
    // Map algorithm to standard identifier
    const algId = algorithm === 'sha256' ? 'HS256' : 'HS512';
    
    // Create canonical message for signing: kid|ts|nonce|alg|payload
    const payloadJson = JSON.stringify(frame);
    const message = `${keyId}|${ts}|${nonce}|${algId}|${payloadJson}`;
    
    // Generate HMAC signature
    const hmac = createHmac(algorithm, secret);
    hmac.update(message, 'utf8');
    const sig = hmac.digest('base64url');
    
    return {
      kid: keyId,
      ts,
      nonce,
      alg: algId,
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
    if (typeof frame.alg !== 'string') {
      throw new Error('Invalid frame: missing or invalid alg');
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
    
    // Algorithm validation
    const expectedAlg = algorithm === 'sha256' ? 'HS256' : 'HS512';
    if (frame.alg !== expectedAlg) {
      throw new Error(`Invalid frame: unsupported algorithm ${frame.alg}, expected ${expectedAlg}`);
    }

    // Timestamp validation with distinct security boundaries
    const now = Date.now();
    
    // 1. Replay protection - reject very old frames
    if (frame.ts < (now - replayWindowMs)) {
      throw new Error(`Invalid frame: timestamp ${frame.ts} too old (replay/clock skew protection)`);
    }
    
    // 2. Clock skew protection - reject frames too far in future or past beyond tolerance
    if (frame.ts > (now + clockSkewToleranceMs)) {
      throw new Error(`Invalid frame: timestamp ${frame.ts} too far in future (clock skew protection)`);
    }
    
    if (frame.ts < (now - clockSkewToleranceMs)) {
      throw new Error(`Invalid frame: timestamp ${frame.ts} too old (replay/clock skew protection)`);
    }

    // Signature verification
    const payloadJson = JSON.stringify(frame.payload);
    const message = `${frame.kid}|${frame.ts}|${frame.nonce}|${frame.alg}|${payloadJson}`;
    
    const hmac = createHmac(algorithm, secret);
    hmac.update(message, 'utf8');
    const expectedSig = hmac.digest('base64url');
    
    // Use constant-time comparison to prevent timing attacks
    if (!constantTimeEqual(frame.sig, expectedSig)) {
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
  const seenKeyIds = new Set<string>();
  
  if (!envValue.trim()) {
    return keys;
  }
  
  for (const keyPair of envValue.split(',')) {
    const [keyId, secretB64] = keyPair.trim().split(':');
    if (!keyId || !secretB64) {
      throw new Error(`Invalid HMAC key format: ${keyPair}`);
    }
    
    // Validate key ID format: alphanumeric, underscore, dash, 4-32 chars
    if (!/^[A-Za-z0-9_-]{4,32}$/.test(keyId)) {
      throw new Error(`Invalid key ID "${keyId}": must be 4-32 alphanumeric/underscore/dash characters`);
    }
    
    // Check for duplicate key IDs
    if (seenKeyIds.has(keyId)) {
      throw new Error(`Duplicate key ID: ${keyId}`);
    }
    seenKeyIds.add(keyId);
    
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