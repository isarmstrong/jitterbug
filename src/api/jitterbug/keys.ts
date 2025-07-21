/**
 * Jitterbug Ephemeral Key Provisioning API
 * P4.4-c Secure Key Distribution Endpoint
 * 
 * Provides session-authenticated ephemeral HMAC verification keys.
 * Keys are short-lived (5-15 minutes) and single-purpose.
 */

import { randomBytes, createHmac } from 'node:crypto';
import type { NextApiRequest, NextApiResponse } from 'next';

/** Response format for ephemeral key provisioning */
export interface EphemeralKeyResponse {
  kid: string;
  secret: string; // base64 encoded
  algorithm: 'sha256' | 'sha512';
  expiresAt: number; // Unix timestamp
}

/** Error response format */
export interface KeyErrorResponse {
  error: string;
  code: string;
}

/** Key generation configuration */
const KEY_CONFIG = {
  ALGORITHM: 'sha256' as const,
  KEY_LENGTH_BYTES: 32, // 256-bit keys
  TTL_MS: 10 * 60 * 1000, // 10 minutes
  KEY_PREFIX: 'eph', // Prefix for ephemeral key IDs
  MAX_KEYS_PER_SESSION: 5 // Prevent key exhaustion attacks
};

/** In-memory key tracking (production would use Redis/database) */
const activeKeys = new Map<string, {
  kid: string;
  secret: Uint8Array;
  expiresAt: number;
  sessionId?: string;
  createdAt: number;
}>();

/** Session-based key limits */
const sessionKeyCount = new Map<string, number>();

/**
 * Generate cryptographically secure ephemeral key
 */
function generateEphemeralKey(): { kid: string; secret: Uint8Array } {
  const keyId = `${KEY_CONFIG.KEY_PREFIX}_${Date.now()}_${randomBytes(4).toString('hex')}`;
  const secret = randomBytes(KEY_CONFIG.KEY_LENGTH_BYTES);
  
  return { kid: keyId, secret };
}

/**
 * Clean up expired keys
 */
function cleanupExpiredKeys(): void {
  const now = Date.now();
  
  for (const [kid, keyData] of activeKeys.entries()) {
    if (now >= keyData.expiresAt) {
      activeKeys.delete(kid);
      
      // Decrement session count if session tracked
      if (keyData.sessionId && sessionKeyCount.has(keyData.sessionId)) {
        const currentCount = sessionKeyCount.get(keyData.sessionId)!;
        if (currentCount <= 1) {
          sessionKeyCount.delete(keyData.sessionId);
        } else {
          sessionKeyCount.set(keyData.sessionId, currentCount - 1);
        }
      }
    }
  }
}

/**
 * Validate session and enforce rate limits
 */
function validateSession(req: NextApiRequest): { valid: boolean; sessionId?: string; error?: string } {
  // Basic session validation - in production this would integrate with your auth system
  const sessionId = req.headers['x-session-id'] as string || 
                   req.cookies?.['session'] || 
                   req.headers['authorization']?.replace('Bearer ', '');
  
  if (!sessionId) {
    return { valid: false, error: 'Authentication required' };
  }
  
  // Check rate limits
  const currentCount = sessionKeyCount.get(sessionId) || 0;
  if (currentCount >= KEY_CONFIG.MAX_KEYS_PER_SESSION) {
    return { valid: false, error: 'Key limit exceeded for session' };
  }
  
  return { valid: true, sessionId };
}

/**
 * Main API handler for ephemeral key provisioning
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<EphemeralKeyResponse | KeyErrorResponse>
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' });
  }
  
  // CSRF protection
  const xRequestedWith = req.headers['x-requested-with'];
  if (xRequestedWith !== 'XMLHttpRequest') {
    return res.status(403).json({ error: 'CSRF protection: X-Requested-With header required', code: 'CSRF_PROTECTION' });
  }
  
  try {
    // Clean up expired keys first
    cleanupExpiredKeys();
    
    // Validate session
    const sessionValidation = validateSession(req);
    if (!sessionValidation.valid) {
      return res.status(401).json({ error: sessionValidation.error!, code: 'AUTHENTICATION_FAILED' });
    }
    
    const sessionId = sessionValidation.sessionId!;
    
    // Generate new ephemeral key
    const { kid, secret } = generateEphemeralKey();
    const expiresAt = Date.now() + KEY_CONFIG.TTL_MS;
    
    // Store key with metadata
    activeKeys.set(kid, {
      kid,
      secret,
      expiresAt,
      sessionId,
      createdAt: Date.now()
    });
    
    // Update session key count
    sessionKeyCount.set(sessionId, (sessionKeyCount.get(sessionId) || 0) + 1);
    
    // Return ephemeral key response
    const response: EphemeralKeyResponse = {
      kid,
      secret: Buffer.from(secret).toString('base64'),
      algorithm: KEY_CONFIG.ALGORITHM,
      expiresAt
    };
    
    // Security headers
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    console.log(`[KeyAPI] Provisioned ephemeral key ${kid} for session ${sessionId.slice(0, 8)}...`);
    
    return res.status(200).json(response);
    
  } catch (error) {
    console.error('[KeyAPI] Failed to provision ephemeral key:', error);
    return res.status(500).json({ 
      error: 'Internal server error during key provisioning', 
      code: 'INTERNAL_ERROR' 
    });
  }
}

/**
 * Get active key by ID (for server-side verification)
 * @internal
 */
export function getActiveKey(kid: string): { secret: Uint8Array; algorithm: string } | null {
  cleanupExpiredKeys(); // Clean up expired keys
  
  const keyData = activeKeys.get(kid);
  if (!keyData || Date.now() >= keyData.expiresAt) {
    return null;
  }
  
  return {
    secret: keyData.secret,
    algorithm: KEY_CONFIG.ALGORITHM
  };
}

/**
 * Cleanup utility for testing
 * @internal
 */
export function clearAllKeys(): void {
  activeKeys.clear();
  sessionKeyCount.clear();
}