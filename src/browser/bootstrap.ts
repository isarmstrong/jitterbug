/**
 * Jitterbug Bootstrap - Early Browser Console API
 * 
 * Lightweight initialization that captures early errors and provides
 * the window.jitterbug interface before orchestrator modules load.
 * 
 * This module should be loaded first to ensure early error capture.
 */

import type { 
  JitterbugEvent, 
  JitterbugGlobal, 
  JitterbugDiagnostics, 
  EmitOptions, 
  EventFilter,
  HelpEntry
} from './types.js';

import { INTERNAL } from './types.js';
import type { EventType } from './schema-registry.js';
import { validateEventPayload, eventSchemas } from './schema-registry.js';

// Simple ULID-like ID generator (simplified for bootstrap)
function generateId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${timestamp}${random}`;
}

type Listener = (e: JitterbugEvent) => void;

interface JitterbugState {
  enabled: boolean;
  seq: number;
  buffer: JitterbugEvent[];
  bootstrapQueue: JitterbugEvent[];
  maxBuffer: number;
  subscribers: Set<Listener>;
  ready: boolean;
  branches: Set<string>;
}

const HELP_REGISTRY: HelpEntry[] = [
  { 
    name: 'enable', 
    summary: 'Enable jitterbug debugging', 
    signature: 'enable(): void', 
    since: '0.1', 
    category: 'core',
    example: 'jitterbug.enable()'
  },
  { 
    name: 'disable', 
    summary: 'Disable jitterbug debugging', 
    signature: 'disable(): void', 
    since: '0.1', 
    category: 'core',
    example: 'jitterbug.disable()'
  },
  { 
    name: 'emit', 
    summary: 'Emit a structured debugging event', 
    signature: 'emit<T, P>(type: T, payload?: P, opts?: EmitOptions): string', 
    since: '0.1', 
    category: 'events',
    example: 'jitterbug.emit("orchestrator.step.started", { step: "createExecutionPlan" })'
  },
  { 
    name: 'getEvents', 
    summary: 'Retrieve recent events from ring buffer', 
    signature: 'getEvents(opts?: EventFilter): readonly JitterbugEvent[]', 
    since: '0.1', 
    category: 'events',
    example: 'jitterbug.getEvents({ limit: 10, level: "error" })'
  },
  { 
    name: 'subscribe', 
    summary: 'Subscribe to live event stream', 
    signature: 'subscribe(listener: Function): () => void', 
    since: '0.1', 
    category: 'events',
    example: 'const unsub = jitterbug.subscribe(event => console.log(event))'
  },
  { 
    name: 'diagnostics', 
    summary: 'Get internal diagnostics snapshot', 
    signature: 'diagnostics(): JitterbugDiagnostics', 
    since: '0.1', 
    category: 'core'
  },
  { 
    name: 'ready', 
    summary: 'Mark system ready (internal use)', 
    signature: 'ready(): void', 
    since: '0.1', 
    category: 'core'
  }
];

export function initializeJitterbug(global: Window = window): void {
  // Idempotent initialization
  if (global.jitterbug) {
    return;
  }

  const state: JitterbugState = {
    enabled: true,
    seq: 0,
    buffer: [],
    bootstrapQueue: [],
    maxBuffer: 2000,
    subscribers: new Set(),
    ready: false,
    branches: new Set(['main'])
  };

  function ringPush<T>(arr: T[], item: T, max: number): void {
    arr.push(item);
    if (arr.length > max) {
      arr.splice(0, arr.length - max);
    }
  }

  function assertValidType(type: string): void {
    if (!/^orchestrator\.[a-z]+(\.[a-z]+)+$/.test(type)) {
      throw new TypeError(`Invalid event type '${type}'. Use orchestrator.<entity>.<verb> pattern.`);
    }
  }

  function emit<T extends string>(
    type: T, 
    payload: unknown = {}, 
    opts: EmitOptions = {}
  ): string {
    assertValidType(type as string);
    
    // Validate payload if schema exists
    let validatedPayload = payload;
    if (type in eventSchemas) {
      try {
        validatedPayload = validateEventPayload(type as EventType, payload);
      } catch (validationError) {
        // In development, throw validation errors
        if (process.env.NODE_ENV === 'development') {
          throw new TypeError(`Event validation failed for '${type}': ${validationError instanceof Error ? validationError.message : String(validationError)}`);
        }
        // In production, log warning and continue with original payload
        console.warn(`Jitterbug validation failed for '${type}':`, validationError);
      }
    }
    
    const id = generateId();
    const schema = eventSchemas[type as EventType];
    const evt: JitterbugEvent = {
      id,
      t: Date.now(),
      type,
      level: opts.level || schema?.level,
      planHash: opts.planHash,
      branch: opts.branch || 'main',
      stepId: opts.stepId,
      payload: validatedPayload as Record<string, unknown>,
      meta: { 
        source: 'console', 
        seq: ++state.seq, 
        ...opts.meta 
      }
    };

    const target = state.ready ? state.buffer : state.bootstrapQueue;
    ringPush(target, evt, state.maxBuffer);
    
    if (state.enabled) {
      state.subscribers.forEach(subscriber => {
        try {
          subscriber(evt);
        } catch (error) {
          // Swallow subscriber errors to prevent cascade failures
          console.warn('Jitterbug subscriber error:', error);
        }
      });
    }
    
    return id;
  }

  function subscribe(listener: Listener): () => void {
    state.subscribers.add(listener);
    return () => state.subscribers.delete(listener);
  }

  function getEvents(opts: EventFilter = {}): readonly JitterbugEvent[] {
    const all = state.ready 
      ? state.buffer 
      : state.bootstrapQueue.concat(state.buffer);
    
    let filtered = all;
    
    if (opts.level) {
      filtered = filtered.filter(e => e.level === opts.level);
    }
    if (opts.typePrefix) {
      filtered = filtered.filter(e => e.type.startsWith(opts.typePrefix!));
    }
    if (opts.branch) {
      filtered = filtered.filter(e => e.branch === opts.branch);
    }
    
    const slice = opts.limit ? filtered.slice(-opts.limit) : filtered;
    return Object.freeze(slice);
  }

  function ready(): void {
    if (state.ready) {
      return; // Idempotent
    }
    
    // Flush bootstrap queue into main buffer
    const flushed = state.bootstrapQueue.splice(0, state.bootstrapQueue.length);
    state.buffer.push(...flushed);
    state.ready = true;
    
    // Emit ready event
    emit('orchestrator.debugger.ready', { 
      flushed: flushed.length 
    }, { 
      level: 'info', 
      meta: { source: 'bootstrap' } 
    });
  }

  function diagnostics(): JitterbugDiagnostics {
    return {
      enabled: state.enabled,
      ready: state.ready,
      eventCount: state.buffer.length + state.bootstrapQueue.length,
      bootstrapCount: state.bootstrapQueue.length,
      subscribers: state.subscribers.size,
      bufferSize: state.buffer.length,
      branches: Array.from(state.branches)
    };
  }

  function help(topic?: string): string {
    if (!topic) {
      return [
        'Jitterbug v0.1 core API:',
        '  enable(), disable(), isEnabled(), emit(type, payload, opts), getEvents(opts)',
        '  subscribe(fn), ready(), diagnostics(), help(topic)',
        'Future: createBranch(), saveConfig(), exportLogs()',
        'Use help("emit") for details.'
      ].join('\n');
    }

    const entry = HELP_REGISTRY.find(h => h.name === topic);
    if (entry) {
      return [
        `${entry.name}`,
        `  ${entry.signature}`,
        `  ${entry.summary}`,
        entry.example ? `  Example: ${entry.example}` : ''
      ].filter(Boolean).join('\n');
    }

    return `No detailed help for "${topic}".`;
  }

  function enable(): void {
    state.enabled = true;
  }

  function disable(): void {
    state.enabled = false;
  }

  function isEnabled(): boolean {
    return state.enabled;
  }

  // Early error capture setup
  const origOnError = global.onerror;
  global.onerror = function(msg: any, url?: any, line?: any, col?: any, err?: any) {
    try {
      emit('orchestrator.error.unhandled', { 
        msg, 
        url, 
        line, 
        col, 
        name: err?.name, 
        stack: err?.stack 
      }, { 
        level: 'error', 
        meta: { source: 'bootstrap' } 
      });
    } catch (captureError) {
      // Prevent recursive errors
      console.warn('Failed to capture error:', captureError);
    }
    
    return origOnError ? origOnError.apply(this, arguments as any) : false;
  };

  const origOnRejection = global.onunhandledrejection;
  global.onunhandledrejection = function(ev: PromiseRejectionEvent) {
    try {
      emit('orchestrator.error.unhandledRejection', { 
        reason: ev.reason?.message ?? String(ev.reason) 
      }, { 
        level: 'error', 
        meta: { source: 'bootstrap' } 
      });
    } catch (captureError) {
      console.warn('Failed to capture rejection:', captureError);
    }
    
    return origOnRejection ? origOnRejection.call(this, ev) : false;
  };

  // Create the API object
  const api: JitterbugGlobal = {
    version: '0.1.0',
    isEnabled,
    enable,
    disable,
    emit,
    getEvents,
    subscribe,
    help,
    ready,
    diagnostics
  };

  // Add internal state access (non-enumerable)
  Object.defineProperty(api, INTERNAL as any, { 
    value: { state }, 
    enumerable: false 
  });

  // Attach to global object (read-only)
  Object.defineProperty(global, 'jitterbug', { 
    value: api, 
    configurable: false, 
    writable: false 
  });
}

// Auto-initialize if in browser environment
if (typeof window !== 'undefined') {
  initializeJitterbug(window);
}