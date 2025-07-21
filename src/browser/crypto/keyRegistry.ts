/**
 * Browser Key Registry - P4.4-c Secure Ephemeral Key Management
 * Fetches HMAC keys securely from authenticated endpoints, never from static HTML
 */

/** @internal */
export interface KeyRegistryEntry {
  readonly kid: string;
  readonly secret: Uint8Array;
  readonly algorithm: 'sha256' | 'sha512';
  readonly expiresAt: number; // Unix timestamp
}

/** @internal */
export interface EphemeralKeyResponse {
  kid: string;
  secret: string; // base64 encoded
  algorithm: 'sha256' | 'sha512';
  expiresAt: number;
}

class BrowserKeyRegistry {
  private keys = new Map<string, KeyRegistryEntry>();
  private keyFetchPromise: Promise<void> | null = null;
  private lastFetchTime = 0;
  private readonly FETCH_COOLDOWN_MS = 1000; // Prevent excessive requests

  /**
   * Securely fetch keys from authenticated endpoint
   * @internal
   */
  private async fetchKeys(): Promise<void> {
    const now = Date.now();
    
    // Prevent rapid successive fetches
    if (now - this.lastFetchTime < this.FETCH_COOLDOWN_MS) {
      return;
    }
    
    this.lastFetchTime = now;
    
    try {
      const response = await fetch('/api/jitterbug/keys', {
        method: 'GET',
        credentials: 'same-origin', // Include session cookies
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest' // CSRF protection
        }
      });
      
      if (!response.ok) {
        throw new Error(`Key fetch failed: ${response.status} ${response.statusText}`);
      }
      
      const keyData: EphemeralKeyResponse = await response.json();
      
      // Validate response structure
      if (!keyData.kid || !keyData.secret || !keyData.algorithm || !keyData.expiresAt) {
        throw new Error('Invalid key response structure');
      }
      
      // Decode and store key
      const secret = new Uint8Array(Buffer.from(keyData.secret, 'base64'));
      
      // Validate minimum key length (256 bits)
      if (secret.length < 32) {
        throw new Error(`Key ${keyData.kid} too short: ${secret.length} bytes (minimum 32)`);
      }
      
      this.keys.set(keyData.kid, {
        kid: keyData.kid,
        secret,
        algorithm: keyData.algorithm,
        expiresAt: keyData.expiresAt
      });
      
      console.debug(`[KeyRegistry] Loaded ephemeral key ${keyData.kid}, expires at ${new Date(keyData.expiresAt).toISOString()}`);
      
    } catch (error) {
      console.error('[KeyRegistry] Failed to fetch ephemeral keys:', error);
      // Clear keys on fetch failure for security
      this.keys.clear();
      throw error;
    }
  }

  /**
   * Initialize key registry with secure key fetch
   * @internal
   */
  async initialize(): Promise<void> {
    // Return existing promise if already fetching
    if (this.keyFetchPromise) {
      return this.keyFetchPromise;
    }
    
    this.keyFetchPromise = this.fetchKeys();
    return this.keyFetchPromise;
  }

  /**
   * Get key by ID, automatically refreshing if expired
   */
  async getKey(kid: string): Promise<KeyRegistryEntry | null> {
    await this.initialize();
    
    const key = this.keys.get(kid);
    
    // Check if key exists and is not expired
    if (key && Date.now() < key.expiresAt) {
      return key;
    }
    
    // Key expired or missing, refresh and try again
    if (key && Date.now() >= key.expiresAt) {
      console.debug(`[KeyRegistry] Key ${kid} expired, refreshing...`);
      this.keys.delete(kid);
    }
    
    // Reset fetch promise to allow refresh
    this.keyFetchPromise = null;
    await this.initialize();
    
    return this.keys.get(kid) || null;
  }

  /**
   * Get all valid (non-expired) keys
   */
  async getAllKeys(): Promise<ReadonlyMap<string, KeyRegistryEntry>> {
    await this.initialize();
    
    const now = Date.now();
    const validKeys = new Map<string, KeyRegistryEntry>();
    
    for (const [kid, key] of this.keys.entries()) {
      if (now < key.expiresAt) {
        validKeys.set(kid, key);
      } else {
        // Remove expired keys
        this.keys.delete(kid);
      }
    }
    
    return validKeys;
  }

  /**
   * Check if registry has a valid key for the given ID
   */
  async hasKey(kid: string): Promise<boolean> {
    const key = await this.getKey(kid);
    return key !== null;
  }

  /**
   * Force refresh of keys (for testing or manual refresh)
   * @internal
   */
  async refresh(): Promise<void> {
    this.keyFetchPromise = null;
    this.keys.clear();
    await this.initialize();
  }

  /**
   * Clear all keys (for testing or security cleanup)
   * @internal
   */
  clearKeys(): void {
    this.keys.clear();
    this.keyFetchPromise = null;
    this.lastFetchTime = 0; // Reset cooldown timer
  }
}

// Singleton instance
const registry = new BrowserKeyRegistry();

/** @internal */
export function getKeyRegistry(): BrowserKeyRegistry {
  return registry;
}