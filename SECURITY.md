# Security Model & Architecture

**Jitterbug Push Orchestration System**  
**Security Classification:** Production-Grade  
**Last Updated:** July 21, 2025  

## Overview

Jitterbug implements a comprehensive security-first architecture for real-time push notifications and server-sent events. This document outlines the security model, threat mitigation strategies, and architectural decisions that ensure production-grade security.

## Security Principles

### 1. Zero Trust Architecture
- All frames must be cryptographically signed (no unsigned frames allowed)
- Ephemeral key management with automatic rotation
- No persistent client-side key storage
- Secure key exchange via authenticated endpoints

### 2. Defense in Depth
- **Transport Security:** HTTPS/WSS mandatory for all communications
- **Frame Security:** HMAC-SHA256 signatures on all push frames
- **Key Security:** Ephemeral keys with automatic expiration
- **Replay Protection:** Nonce-based replay attack prevention
- **Rate Limiting:** Token bucket rate limiting per connection

### 3. Secure by Default
- HMAC signing enabled by default in production
- Minimal attack surface with restricted APIs
- Fail-secure error handling
- Zero-configuration security for standard deployments

## Threat Model

### Threats Mitigated

#### T1: Man-in-the-Middle Attacks
- **Risk:** Interception of push frames in transit
- **Mitigation:** Mandatory HTTPS/WSS transport + HMAC frame signing
- **Status:** ✅ PROTECTED

#### T2: Frame Tampering
- **Risk:** Modification of frame contents by attackers  
- **Mitigation:** HMAC-SHA256 signatures with replay protection
- **Status:** ✅ PROTECTED

#### T3: Replay Attacks
- **Risk:** Reuse of captured signed frames
- **Mitigation:** Nonce-based replay detection with configurable time windows
- **Status:** ✅ PROTECTED

#### T4: Key Compromise
- **Risk:** Long-term damage from leaked signing keys
- **Mitigation:** Ephemeral keys with automatic rotation (10-minute default expiry)
- **Status:** ✅ PROTECTED

#### T5: Client-Side Key Extraction
- **Risk:** Browser-based attackers extracting HMAC keys
- **Mitigation:** No client-side key persistence + secure key fetch API
- **Status:** ✅ PROTECTED

#### T6: Timing Attacks
- **Risk:** Side-channel attacks on signature verification
- **Mitigation:** Constant-time HMAC verification using WebCrypto API
- **Status:** ✅ PROTECTED

#### T7: Downgrade Attacks  
- **Risk:** Forcing fallback to unsigned communication
- **Mitigation:** No downgrade path - signed frames mandatory in production
- **Status:** ✅ PROTECTED

### Threats Not Mitigated (By Design)

#### T8: TLS/Certificate Authority Compromise
- **Scope:** Outside application layer - handled by TLS infrastructure
- **Recommendation:** Use certificate pinning, HSTS, and CAA DNS records

#### T9: Browser/Runtime Compromise
- **Scope:** Full system compromise scenario
- **Recommendation:** Standard browser security practices, CSP headers

#### T10: Server-Side RCE
- **Scope:** Complete server compromise
- **Recommendation:** Standard server hardening, privilege separation

## Cryptographic Architecture

### HMAC Frame Signing

**Algorithm:** HMAC-SHA256  
**Key Length:** 256 bits (32 bytes minimum)  
**Nonce:** 32-byte cryptographically secure random  

```typescript
interface SignedPushFrame {
  kid: string;           // Key identifier
  ts: number;            // Timestamp (Unix milliseconds)
  nonce: string;         // Base64-encoded random nonce
  sig: string;           // Base64-encoded HMAC signature
  payload: AnyPushFrame; // Original unsigned frame
}
```

### Signature Generation Process

1. **Nonce Generation:** 32 bytes of cryptographically secure randomness
2. **Canonical Serialization:** Deterministic JSON serialization of payload
3. **Message Construction:** `${kid}:${ts}:${nonce}:${canonicalPayload}`
4. **HMAC Computation:** HMAC-SHA256 using ephemeral key
5. **Encoding:** Base64 encoding of signature

### Verification Process

1. **Key Lookup:** Retrieve ephemeral key by `kid` 
2. **Timestamp Validation:** Check against clock skew tolerance (5s default)
3. **Replay Detection:** Verify nonce not seen within replay window (10s default)
4. **Signature Verification:** Constant-time HMAC verification
5. **Payload Extraction:** Return verified original frame

## Key Management Architecture

### Ephemeral Key Lifecycle

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Key Request   │───▶│  Server Generates │───▶│   Client Stores │
│   (Auth'd API)  │    │  Ephemeral Key    │    │   (Memory Only) │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │                         │
                                ▼                         ▼
                       ┌──────────────────┐    ┌─────────────────┐
                       │ Auto-Expiry (10m)│    │ Sign Push Frames│
                       └──────────────────┘    └─────────────────┘
```

### Key Generation Endpoint

**Endpoint:** `POST /api/jitterbug/keys`  
**Authentication:** Same-origin session cookies  
**Rate Limiting:** 10 requests/minute per session  

```typescript
interface EphemeralKeyResponse {
  kid: string;      // Unique key identifier
  secret: string;   // Base64-encoded 256-bit key
  algorithm: string; // "sha256" 
  expiresAt: number; // Unix timestamp
}
```

### Security Properties

- **No Meta Tag Keys:** Eliminates HTML-based key discovery attacks
- **Memory-Only Storage:** Keys never persisted to localStorage/sessionStorage  
- **Automatic Expiration:** Keys expire after 10 minutes by default
- **Secure Fetch:** Keys retrieved via authenticated HTTPS endpoint only
- **Rotation Ready:** Supports seamless key rotation without frame loss

## Rate Limiting & DoS Protection

### Token Bucket Rate Limiting

**Default Configuration:**
- **Capacity:** 10 tokens
- **Refill Rate:** 1 token per second  
- **Burst Allowance:** Up to 10 frames in quick succession
- **Backoff Strategy:** Exponential backoff on rate limit exceeded

### Frame Processing Limits

- **Max Frames Per Tick:** 10 frames (DoS protection)
- **Buffer Capacity:** 100 frames per connection
- **Serialization Limit:** 1KiB per frame maximum

## Error Handling & Information Disclosure

### Secure Error Patterns

```typescript
// ✅ SECURE - Generic error without details
throw new SecurityError('Frame verification failed');

// ❌ INSECURE - Exposes internal state
throw new Error(`HMAC verification failed: expected ${expected}, got ${actual}`);
```

### Error Categories

1. **Authentication Errors:** Generic "unauthorized" responses
2. **Validation Errors:** No detailed field information exposed  
3. **Rate Limit Errors:** Simple "rate limited" message
4. **System Errors:** Logged server-side, generic client error

## Security Testing & Validation

### Property-Based Security Testing

The system includes comprehensive property-based tests using fast-check:

- **Fuzz Testing:** Random frame generation and signature verification
- **Mutation Testing:** Systematic tampering detection
- **Replay Attack Simulation:** Duplicate frame detection
- **Key Validation:** Unknown key ID rejection
- **Timing Attack Resistance:** Constant-time verification validation

### Security Test Coverage

- ✅ Frame signing/verification (100% coverage)
- ✅ Replay attack detection
- ✅ Tampered payload rejection  
- ✅ Unknown key ID handling
- ✅ Malformed frame rejection
- ✅ Rate limiting enforcement
- ✅ Key expiry handling

## Deployment Security

### Production Configuration

```typescript
const productionConfig: SecurityConfig = {
  frameHmac: {
    enabled: true,                    // ✅ MANDATORY
    keyId: process.env.HMAC_KEY_ID,  // From secure env
    secret: process.env.HMAC_SECRET, // 256-bit key
    algorithm: 'sha256',
    clockSkewToleranceMs: 5_000,     // 5 second tolerance
    replayWindowMs: 10_000           // 10 second replay window
  }
};
```

### Environment Variables

```bash
# Required for production
HMAC_KEY_ID=prod-key-001
HMAC_SECRET=<base64-encoded-256-bit-key>

# Optional overrides  
HMAC_CLOCK_SKEW_MS=5000
HMAC_REPLAY_WINDOW_MS=10000
```

### CSP Headers (Recommended)

```
Content-Security-Policy: 
  default-src 'self';
  connect-src 'self' wss:;
  script-src 'self' 'unsafe-inline';
  style-src 'self' 'unsafe-inline'
```

## Security Monitoring

### Metrics to Monitor

- **Authentication Failures:** Spike may indicate attack
- **Rate Limit Hits:** Potential DoS attempts
- **Replay Attacks Detected:** Security monitoring alert
- **Key Fetch Failures:** Availability impact
- **HMAC Verification Failures:** Tampering attempts

### Alerting Thresholds

- **Auth Failures:** >10/minute per IP
- **Rate Limits:** >50% of connections hitting limits
- **Replay Attacks:** Any occurrence (should be rare)
- **Key Failures:** >5% of key fetch requests failing

## Compliance & Auditing

### Security Standards Alignment

- **OWASP Top 10:** Comprehensive protection against web vulnerabilities
- **NIST Cybersecurity Framework:** Identify, Protect, Detect, Respond, Recover
- **SOC 2 Type II:** Security controls suitable for service organization audits

### Audit Trail

- All frame verification attempts (success/failure)
- Key generation and expiry events
- Rate limiting actions
- Security error conditions
- Performance metrics

## Security Contact

For security vulnerabilities or concerns:

- **Primary:** security@jitterbug.dev
- **PGP Key:** [Key ID and fingerprint]
- **Responsible Disclosure:** 90-day disclosure policy

---

*This security model ensures production-grade protection for the Jitterbug push orchestration system while maintaining high performance and developer experience.*