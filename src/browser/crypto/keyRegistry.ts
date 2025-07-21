/**
 * Browser Key Registry - P4.4-b-1 Client-Side HMAC Keys
 * Parses HMAC keys from HTML meta tag for frame verification
 */

import { parseHmacKeys } from '../../hub/security/_internal/hmac.js';

/** @internal */
export interface KeyRegistryEntry {
  readonly kid: string;
  readonly secret: Uint8Array;
  readonly algorithm: 'sha256' | 'sha512';
}

class BrowserKeyRegistry {
  private keys = new Map<string, KeyRegistryEntry>();
  private initialized = false;

  private initialize(): void {
    if (this.initialized) return;
    
    try {
      // Parse keys from HTML meta tag: <meta name="jitterbug-hmac-keys" content="k1:base64,k2:base64">
      const metaElement = document.querySelector('meta[name="jitterbug-hmac-keys"]');
      const keysContent = metaElement?.getAttribute('content') || '';
      
      if (!keysContent.trim()) {
        console.debug('[KeyRegistry] No HMAC keys found in meta tag');
        this.initialized = true;
        return;
      }

      const parsedKeys = parseHmacKeys(keysContent);
      
      for (const [kid, secret] of parsedKeys.entries()) {
        this.keys.set(kid, {
          kid,
          secret,
          algorithm: 'sha256' // Default to SHA-256
        });
      }
      
      console.debug(`[KeyRegistry] Loaded ${this.keys.size} HMAC keys`);
      
    } catch (error) {
      console.error('[KeyRegistry] Failed to parse HMAC keys:', error);
    }
    
    this.initialized = true;
  }

  getKey(kid: string): KeyRegistryEntry | null {
    this.initialize();
    return this.keys.get(kid) || null;
  }

  getAllKeys(): ReadonlyMap<string, KeyRegistryEntry> {
    this.initialize();
    return new Map(this.keys);
  }

  hasKey(kid: string): boolean {
    this.initialize();
    return this.keys.has(kid);
  }
}

// Singleton instance
const registry = new BrowserKeyRegistry();

/** @internal */
export function getKeyRegistry(): BrowserKeyRegistry {
  return registry;
}