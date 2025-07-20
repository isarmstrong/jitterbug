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
import { validateEventPayload, eventSchemas, setGlobalEmitFn } from './schema-registry.js';
import { experimentalBranches } from './branch-manager.js';
import { experimentalDebug } from './debug-control.js';
import { configPersistence } from './config-persistence.js';
import { attachLogCapture } from './logs/internal/attach.js';

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
  },
  {
    name: 'createBranch',
    summary: 'Create a new debug branch',
    signature: 'createBranch(name: string, options?: BranchOptions): BranchRecord',
    since: '0.2',
    category: 'branch',
    example: 'jitterbug.createBranch("feature-test", { autoActivate: true })'
  },
  {
    name: 'getBranches',
    summary: 'Get all registered branches',
    signature: 'getBranches(): BranchSummary[]',
    since: '0.2',
    category: 'branch',
    example: 'jitterbug.getBranches()'
  },
  {
    name: 'listActiveBranches',
    summary: 'Get only active branches',
    signature: 'listActiveBranches(): BranchSummary[]',
    since: '0.2',
    category: 'branch',
    example: 'jitterbug.listActiveBranches()'
  },
  {
    name: 'setActiveBranch',
    summary: 'Set the active branch for new events',
    signature: 'setActiveBranch(name: string): void',
    since: '0.2',
    category: 'branch',
    example: 'jitterbug.setActiveBranch("debug-session")'
  },
  {
    name: 'getActiveBranch',
    summary: 'Get the currently active branch name',
    signature: 'getActiveBranch(): string',
    since: '0.2',
    category: 'branch',
    example: 'jitterbug.getActiveBranch()'
  },
  {
    name: 'deleteBranch',
    summary: 'Delete a branch (with validation)',
    signature: 'deleteBranch(name: string): boolean',
    since: '0.2',
    category: 'branch',
    example: 'jitterbug.deleteBranch("old-session")'
  },
  // Debug control help entries (Task 3.3)
  {
    name: 'debug.enable',
    summary: 'Enable debug event emission',
    signature: 'debug.enable(by?: "api" | "config"): DebugState',
    since: '0.2',
    category: 'debug',
    example: 'jitterbug.debug.enable()'
  },
  {
    name: 'debug.disable',
    summary: 'Disable debug event emission',
    signature: 'debug.disable(by?: "api" | "config"): DebugState',
    since: '0.2',
    category: 'debug',
    example: 'jitterbug.debug.disable()'
  },
  {
    name: 'debug.isEnabled',
    summary: 'Check if debug emission is enabled',
    signature: 'debug.isEnabled(): boolean',
    since: '0.2',
    category: 'debug',
    example: 'jitterbug.debug.isEnabled()'
  },
  {
    name: 'debug.setLevel',
    summary: 'Set debug level (0-5: OFF, ERROR, WARN, INFO, DEBUG, TRACE)',
    signature: 'debug.setLevel(level: 0|1|2|3|4|5, by?: "api" | "config"): DebugState',
    since: '0.2',
    category: 'debug',
    example: 'jitterbug.debug.setLevel(3) // INFO level'
  },
  {
    name: 'debug.getLevel',
    summary: 'Get current debug level',
    signature: 'debug.getLevel(): number',
    since: '0.2',
    category: 'debug',
    example: 'jitterbug.debug.getLevel()'
  },
  {
    name: 'debug.levels',
    summary: 'Debug level constants',
    signature: 'debug.levels: { OFF: 0, ERROR: 1, WARN: 2, INFO: 3, DEBUG: 4, TRACE: 5 }',
    since: '0.2',
    category: 'debug',
    example: 'jitterbug.debug.setLevel(jitterbug.debug.levels.DEBUG)'
  },
  // Log Inspector help entries (Task 3.5 Phase 1)
  {
    name: 'logInspector',
    summary: 'Experimental log inspection query interface',
    signature: 'logInspector.query({ sinceSeq?, limit? }) → { entries, stats, nextSeq }',
    since: '0.2',
    category: 'logs',
    example: 'logInspector.query({ limit: 100 }) // Get last 100 entries'
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
    ready: false
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
    const targetBranch = opts.branch || experimentalBranches._manager.getActiveBranch();
    
    // Only emit if the target branch is enabled
    if (!experimentalBranches._manager.isBranchEnabled(targetBranch)) {
      return id; // Return ID but don't emit
    }
    
    const evt: JitterbugEvent = {
      id,
      t: Date.now(),
      type,
      level: opts.level || schema?.level,
      planHash: opts.planHash,
      branch: targetBranch,
      stepId: opts.stepId,
      payload: validatedPayload as Record<string, unknown>,
      meta: { 
        source: 'console', 
        seq: ++state.seq, 
        ...opts.meta 
      }
    };

    // Apply debug gating - check if event should be emitted based on debug level/enabled state
    // Map string levels to numeric levels for gating
    const levelMap = { debug: 4, info: 3, warn: 2, error: 1 };
    const numericLevel = levelMap[evt.level as keyof typeof levelMap] ?? 3; // Default to INFO
    
    // Use debug gating to determine if event should be stored/emitted
    const { enabled, level } = experimentalDebug.getState();
    const shouldEmit = enabled && numericLevel <= level;
    
    // Special case: always emit debug control events and validation failures
    const isDebugControl = type.startsWith('orchestrator.debug.');
    const isValidationError = type === 'orchestrator.debug.validation.failed';
    
    if (shouldEmit || isDebugControl || isValidationError) {
      const target = state.ready ? state.buffer : state.bootstrapQueue;
      ringPush(target, evt, state.maxBuffer);
    }
    
    // Record event statistics in branch manager
    const isError = evt.level === 'error';
    experimentalBranches._manager.recordEventForBranch(targetBranch, isError);
    
    if (state.enabled && (shouldEmit || isDebugControl || isValidationError)) {
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
      branches: experimentalBranches._manager.getBranches().map(b => b.name)
    };
  }

  function help(topic?: string): string {
    if (!topic) {
      return [
        'Jitterbug v0.2 core API:',
        '  Core: enable(), disable(), isEnabled(), emit(), getEvents(), subscribe()',
        '  Branch: createBranch(), getBranches(), setActiveBranch(), getActiveBranch()',
        '  Debug: debug.enable(), debug.disable(), debug.isEnabled(), debug.setLevel(n), debug.getLevel(), debug.levels',
        '  Logs: logInspector.query() - experimental log inspection',
        '  System: ready(), diagnostics(), help(topic)',
        'Future: saveConfig(), exportLogs()',
        'Use help("logInspector") for details.'
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

  // Branch management methods (Task 3.2) @experimental
  function createBranch(name: string, options = {}) {
    return experimentalBranches.create(name, options);
  }

  function getBranches() {
    return experimentalBranches.list();
  }

  function listActiveBranches() {
    return experimentalBranches.listActive();
  }

  function getBranch(name: string) {
    return experimentalBranches.get(name);
  }

  function setActiveBranch(name: string): void {
    experimentalBranches.setActive(name);
  }

  function getActiveBranch(): string {
    return experimentalBranches.getActive();
  }

  function enableBranch(name: string): void {
    experimentalBranches.enable(name);
  }

  function disableBranch(name: string): void {
    experimentalBranches.disable(name);
  }

  function deleteBranch(name: string): boolean {
    return experimentalBranches.delete(name);
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
    version: '0.2.0',
    isEnabled,
    enable,
    disable,
    emit,
    getEvents,
    subscribe,
    help,
    ready,
    diagnostics,
    // Branch management methods (Task 3.2) @experimental
    createBranch,
    getBranches,
    listActiveBranches,
    getBranch,
    setActiveBranch,
    getActiveBranch,
    enableBranch,
    disableBranch,
    deleteBranch,
    // Debug control methods (Task 3.3) @experimental
    debug: {
      ...experimentalDebug
    }
  };

  // Set up global emit function for schema registry
  setGlobalEmitFn(emit);

  // Attach configuration persistence (Task 3.4) - after API creation
  api.debug.config = configPersistence;

  // Attach log capture for Task 3.5 log inspection
  const bufferSize = configPersistence.snapshot().logs?.bufferSize ?? 1000;
  attachLogCapture(bufferSize);

  // Load and apply configuration before ready
  const configResult = configPersistence._loadConfig();
  if (configResult.status === 'loaded') {
    // Apply loaded configuration to debug state
    try {
      if (configResult.config.debug.enabled !== undefined) {
        if (configResult.config.debug.enabled) {
          experimentalDebug.enable('config');
        } else {
          experimentalDebug.disable('config');
        }
      }
      
      if (configResult.config.debug.level !== undefined) {
        experimentalDebug.setLevel(configResult.config.debug.level, 'config');
      }
      
      // Branch application can be added here when needed
      if (configResult.config.branches?.active) {
        // Apply active branch if it exists
        // This prevents race conditions with branch creation timing
      }
    } catch (error) {
      console.warn('Failed to apply loaded config:', error);
    }
  }

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