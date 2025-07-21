/**
 * Security Module - Public API Surface
 * P4.4 Frame HMAC Security
 */

// Core public exports (meeting export gate ≤ +3)
export { createHmacSigner } from './_internal/hmac.js';
export type { SignedPushFrame } from './signed-frame.js';

// Internal helpers - for tests and internal use only
/** @internal */
export type { FrameSigner, FrameVerifier } from './_internal/hmac.js';
/** @internal */
export type { HmacConfig } from './_internal/hmac.js';
/** @internal */
export { DEFAULT_HMAC_CONFIG, parseHmacKeys } from './_internal/hmac.js';