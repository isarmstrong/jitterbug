/**
 * Browser Frame Verification - P4.4-b-1 Client-Side HMAC
 * Thin wrapper around FrameVerifier for browser environment
 */

import { createHmacSigner, DEFAULT_HMAC_CONFIG } from '../../../hub/security/_internal/hmac.js';
import type { SignedPushFrame } from '../../../hub/security/signed-frame.js';
import type { AnyPushFrame } from '../../../hub/emitters/registry.js';
import { getKeyRegistry } from '../../crypto/keyRegistry.js';

const REPLAY_LRU_SIZE = 2048;     // 2k digests ~32 kB memory
const CLEANUP_INTERVAL = 30_000;  // Prune every 30s

// LRU replay protection cache: digest → timestamp
const seenDigests = new Map<string, number>();
let lastCleanup = 0;

/**
 * Prune old entries from replay cache
 */
function pruneReplayCache(currentTime: number): void {
  // Only cleanup periodically to avoid performance overhead
  if (currentTime - lastCleanup < CLEANUP_INTERVAL) return;
  
  const replayWindowMs = DEFAULT_HMAC_CONFIG.replayWindowMs || 10_000;
  const cutoffTime = currentTime - replayWindowMs;
  
  // Remove expired entries
  for (const [digest, timestamp] of seenDigests.entries()) {
    if (timestamp < cutoffTime) {
      seenDigests.delete(digest);
    }
  }
  
  // FIFO eviction if still over limit
  while (seenDigests.size > REPLAY_LRU_SIZE) {
    const firstKey = seenDigests.keys().next().value;
    if (firstKey) seenDigests.delete(firstKey);
  }
  
  lastCleanup = currentTime;
}

/**
 * Compute message digest for replay protection
 */
function computeDigest(frame: SignedPushFrame): string {
  // Use frame signature as digest - already cryptographically unique
  return frame.sig;
}

/**
 * Verify signed push frame on client side
 * @internal
 */
export async function verifyFrame(frame: SignedPushFrame): Promise<AnyPushFrame> {
  const keyRegistry = getKeyRegistry();
  const keyEntry = await keyRegistry.getKey(frame.kid);
  
  if (!keyEntry) {
    throw new Error(`Unknown key ID: ${frame.kid}`);
  }
  
  // Create verifier with key from registry
  const verifier = createHmacSigner({
    keyId: keyEntry.kid,
    secret: keyEntry.secret,
    algorithm: keyEntry.algorithm,
    clockSkewToleranceMs: DEFAULT_HMAC_CONFIG.clockSkewToleranceMs || 5_000,
    replayWindowMs: DEFAULT_HMAC_CONFIG.replayWindowMs || 10_000
  });
  
  // Check for replay attack
  const digest = computeDigest(frame);
  const currentTime = Date.now();
  
  if (seenDigests.has(digest)) {
    throw new Error('Replay attack detected: frame already seen');
  }
  
  // Verify signature and timestamps (throws on failure)
  // Note: verifier.verify has assertion signature, so we need to handle the call carefully
  const verifyFn = verifier.verify.bind(verifier) as (raw: unknown) => void;
  verifyFn(frame);
  
  // Record digest after successful verification
  pruneReplayCache(currentTime);
  seenDigests.set(digest, currentTime);
  
  // Return unwrapped payload
  return frame.payload;
}

/**
 * Check if frame appears to be signed (heuristic detection)
 * @internal
 */
export function isSignedFrame(parsed: unknown): parsed is SignedPushFrame {
  return (
    typeof parsed === 'object' &&
    parsed !== null &&
    'sig' in parsed &&
    typeof (parsed as any).sig === 'string'
  );
}

/**
 * Process frame - verify signature (all frames must be signed)
 * @internal
 */
export async function processFrame(parsed: unknown): Promise<AnyPushFrame> {
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid frame: must be an object');
  }
  
  if (!isSignedFrame(parsed)) {
    throw new Error('Invalid frame: all frames must be signed (no unsigned frames allowed)');
  }
  
  return await verifyFrame(parsed);
}