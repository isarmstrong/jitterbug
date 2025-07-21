/**
 * Emitter Registry - P4.3 Production-Grade Registry
 * Hardened registry with compile-time contracts & runtime clamps
 * 
 * Key Invariants:
 * - Registry sealed after bootstrapPush() completes
 * - All emitters are Object.freeze() singletons
 * - Validates: unique id, minIntervalMs ≤ 60,000, serialize() returns string ≤1KiB
 */

// Core frame contract
export interface PushFrame {
  readonly t: string; // Frame type discriminator
  readonly ts: number; // Timestamp
}

// Heartbeat frame
export interface HeartbeatFrame extends PushFrame {
  readonly t: 'hb';
}

// Telemetry frame 
export interface TelemetryFrame extends PushFrame {
  readonly t: 'tm';
  readonly cpu: number;
  readonly mem: number;
}

// User activity frame
export interface UserActivityFrame extends PushFrame {
  readonly t: 'ua';
  readonly meta: Record<string, any>;
}

// Union of all frame types
export type AnyPushFrame = HeartbeatFrame | TelemetryFrame | UserActivityFrame;

// Emitter contract
export interface PushEmitter<T extends PushFrame = AnyPushFrame> {
  readonly id: string;
  readonly minIntervalMs: number;
  shouldEmit(): boolean;
  serialize(): string;
  createFrame(): T;
}

// Registry state
interface EmitterEntry<T extends PushFrame = AnyPushFrame> {
  readonly emitter: PushEmitter<T>;
  readonly frozen: boolean;
}

class EmitterRegistryImpl {
  private readonly emitters = new Map<string, EmitterEntry>();
  private sealed = false;

  // Register emitter with validation
  register<T extends PushFrame>(emitter: PushEmitter<T>): void {
    if (this.sealed) {
      throw new Error('[Registry] Registry is sealed - cannot register new emitters');
    }

    // Validate unique ID
    if (this.emitters.has(emitter.id)) {
      throw new Error(`[Registry] Duplicate emitter ID: ${emitter.id}`);
    }

    // Validate interval clamp (≤60s)
    if (emitter.minIntervalMs > 60_000) {
      throw new Error(`[Registry] minIntervalMs ${emitter.minIntervalMs} exceeds 60,000ms limit for emitter: ${emitter.id}`);
    }

    if (emitter.minIntervalMs < 100) {
      throw new Error(`[Registry] minIntervalMs ${emitter.minIntervalMs} below 100ms minimum for emitter: ${emitter.id}`);
    }

    // Validate serialize output size (≤1KiB)
    try {
      const serialized = emitter.serialize();
      if (serialized.length > 1024) {
        throw new Error(`[Registry] Serialized frame ${serialized.length} bytes exceeds 1KiB limit for emitter: ${emitter.id}`);
      }
    } catch (error) {
      throw new Error(`[Registry] Serialization validation failed for emitter ${emitter.id}: ${error}`);
    }

    // Freeze the emitter singleton
    const frozenEmitter = Object.freeze(emitter);
    
    this.emitters.set(emitter.id, {
      emitter: frozenEmitter as any,
      frozen: true
    });
  }

  // Get emitter by ID
  get<T extends PushFrame>(id: string): PushEmitter<T> | undefined {
    const entry = this.emitters.get(id);
    return entry?.emitter as PushEmitter<T> | undefined;
  }

  // Get all emitters
  getAll(): ReadonlyArray<PushEmitter<AnyPushFrame>> {
    return Array.from(this.emitters.values()).map(entry => entry.emitter as PushEmitter<AnyPushFrame>);
  }

  // Seal registry (called after bootstrap)
  seal(): void {
    this.sealed = true;
    Object.freeze(this.emitters);
    Object.freeze(this);
  }

  // Check if sealed
  isSealed(): boolean {
    return this.sealed;
  }

  // Get registry stats
  getStats(): { count: number; sealed: boolean } {
    return {
      count: this.emitters.size,
      sealed: this.sealed
    };
  }
}

// Global registry singleton
const globalRegistry = new EmitterRegistryImpl();

/**
 * Register a push emitter with compile-time type safety
 * Validates unique ID, interval bounds, and frame size
 */
export function registerEmitter<T extends PushFrame>(emitter: PushEmitter<T>): void {
  globalRegistry.register(emitter);
}

/**
 * Get the global registry instance (internal use)
 * @internal
 */
export function getRegistry(): EmitterRegistryImpl {
  return globalRegistry;
}

/**
 * Seal the registry after bootstrap completes
 * @internal
 */
export function sealRegistry(): void {
  globalRegistry.seal();
}