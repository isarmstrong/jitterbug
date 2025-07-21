/**
 * Token Bucket Rate Limiter - P4.3 Runtime Safety
 * Prevents connection flooding with configurable burst and sustained rates
 */

export interface TokenBucketConfig {
  readonly maxTokens: number;    // Bucket capacity (burst limit)
  readonly refillRate: number;   // Tokens per second (sustained rate)
  readonly refillInterval: number; // Refill check interval in ms
}

export const DEFAULT_TOKEN_BUCKET_CONFIG: TokenBucketConfig = {
  maxTokens: 10,      // Allow 10 frame burst
  refillRate: 2,      // Sustain 2 frames/sec
  refillInterval: 500 // Check every 500ms
};

export class TokenBucket {
  private tokens: number;
  private lastRefill: number;

  constructor(private readonly config: TokenBucketConfig) {
    this.tokens = config.maxTokens;
    this.lastRefill = Date.now();
  }

  /**
   * Try to consume a token. Returns true if successful, false if rate limited
   */
  consume(): boolean {
    this.refill();
    
    if (this.tokens >= 1) {
      this.tokens--;
      return true;
    }
    
    return false;
  }

  /**
   * Refill tokens based on elapsed time
   */
  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    
    if (elapsed >= this.config.refillInterval) {
      const tokensToAdd = Math.floor((elapsed / 1000) * this.config.refillRate);
      this.tokens = Math.min(this.tokens + tokensToAdd, this.config.maxTokens);
      this.lastRefill = now;
    }
  }

  /**
   * Get current token count (for monitoring)
   */
  getTokens(): number {
    this.refill();
    return this.tokens;
  }

  /**
   * Reset bucket to full capacity
   */
  reset(): void {
    this.tokens = this.config.maxTokens;
    this.lastRefill = Date.now();
  }
}