/**
 * Signed Frame Types - P4.4-a Frame HMAC
 * Type definitions for cryptographically signed push frames
 */

import type { AnyPushFrame } from '../emitters/registry.js';

export interface SignedPushFrame {
  readonly kid: string;          // Key ID for signature verification
  readonly ts: number;           // Unix timestamp (ms) - replay protection
  readonly nonce: string;        // Base64url-encoded 96-bit random nonce
  readonly alg: string;          // Algorithm identifier (e.g., "HS256", "HS512")
  readonly payload: AnyPushFrame; // Original push frame
  readonly sig: string;          // Base64url-encoded HMAC signature
}

/** @internal - Orchestrator security configuration */
export interface SecurityConfig {
  frameHmac: {
    enabled: boolean;
    keyId?: string;
    secret?: Uint8Array;
    algorithm?: 'sha256' | 'sha512';
    clockSkewToleranceMs?: number;
    replayWindowMs?: number;
  };
}

/** @internal - Default security config (HMAC disabled) */
export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  frameHmac: {
    enabled: false,
    algorithm: 'sha256',
    clockSkewToleranceMs: 5_000,
    replayWindowMs: 10_000
  }
};

/**
 * Type guard to check if a frame is signed
 */
export function isSignedFrame(frame: unknown): frame is SignedPushFrame {
  return (
    typeof frame === 'object' &&
    frame !== null &&
    'kid' in frame &&
    'ts' in frame &&
    'nonce' in frame &&
    'payload' in frame &&
    'sig' in frame &&
    typeof (frame as any).kid === 'string' &&
    typeof (frame as any).ts === 'number' &&
    typeof (frame as any).nonce === 'string' &&
    typeof (frame as any).sig === 'string' &&
    typeof (frame as any).payload === 'object'
  );
}