/**
 * Security Module - Public API Surface
 * P4.4 Frame HMAC Security
 */

// Core public exports (meeting export gate ≤ +3)
export { createHmacSigner } from './_internal/hmac.js';
export type { SignedPushFrame } from './signed-frame.js';

// Internal helpers remain unexported - use via createHmacSigner()
// FrameSigner, FrameVerifier, HmacConfig, parseHmacKeys, etc.