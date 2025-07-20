/**
 * Event Schema Registry for typed event validation
 * 
 * @internal - DO NOT EXPORT FROM public.ts  
 * Schema details are internal validation implementation.
 */

// Import types for future use in payload validation
import type { JitterbugEvent } from './types.js';

// Schema validation interface
export interface EventSchema<P = unknown> {
  validate(payload: unknown): P;
  level?: JitterbugEvent['level'];
  description?: string;
}

// Simple validation functions
function validateString(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throw new TypeError(`${field} must be a string, got ${typeof value}`);
  }
  return value;
}

function validateNumber(value: unknown, field: string): number {
  if (typeof value !== 'number' || isNaN(value)) {
    throw new TypeError(`${field} must be a number, got ${typeof value}`);
  }
  return value;
}

function validateOptionalString(value: unknown, field: string): string | undefined {
  if (value === undefined) return undefined;
  return validateString(value, field);
}

// Payload type definitions
export interface StepStartedPayload {
  stepId: string;
  planHash?: string;
}

export interface StepCompletedPayload {
  stepId: string;
  durationMs: number;
  planHash?: string;
}

export interface ErrorPayload {
  msg: string;
  url?: string;
  line?: number;
  col?: number;
  name?: string;
  stack?: string;
}

export interface DebuggerReadyPayload {
  flushed: number;
}

// Schema registry
export const eventSchemas = {
  'orchestrator.step.started': {
    validate: (payload: unknown): StepStartedPayload => {
      if (!payload || typeof payload !== 'object') {
        throw new TypeError('payload must be an object');
      }
      const p = payload as Record<string, unknown>;
      return {
        stepId: validateString(p.stepId, 'stepId'),
        planHash: validateOptionalString(p.planHash, 'planHash')
      };
    },
    level: 'info' as const,
    description: 'Emitted when an orchestrator step begins execution'
  },
  
  'orchestrator.step.completed': {
    validate: (payload: unknown): StepCompletedPayload => {
      if (!payload || typeof payload !== 'object') {
        throw new TypeError('payload must be an object');
      }
      const p = payload as Record<string, unknown>;
      return {
        stepId: validateString(p.stepId, 'stepId'),
        durationMs: validateNumber(p.durationMs, 'durationMs'),
        planHash: validateOptionalString(p.planHash, 'planHash')
      };
    },
    level: 'info' as const,
    description: 'Emitted when an orchestrator step completes successfully'
  },
  
  'orchestrator.step.failed': {
    validate: (payload: unknown): StepStartedPayload & { error: string } => {
      if (!payload || typeof payload !== 'object') {
        throw new TypeError('payload must be an object');
      }
      const p = payload as Record<string, unknown>;
      return {
        stepId: validateString(p.stepId, 'stepId'),
        planHash: validateOptionalString(p.planHash, 'planHash'),
        error: validateString(p.error, 'error')
      };
    },
    level: 'error' as const,
    description: 'Emitted when an orchestrator step fails'
  },

  'orchestrator.error.unhandled': {
    validate: (payload: unknown): ErrorPayload => {
      if (!payload || typeof payload !== 'object') {
        throw new TypeError('payload must be an object');
      }
      const p = payload as Record<string, unknown>;
      return {
        msg: validateString(p.msg, 'msg'),
        url: validateOptionalString(p.url, 'url'),
        line: p.line !== undefined ? validateNumber(p.line, 'line') : undefined,
        col: p.col !== undefined ? validateNumber(p.col, 'col') : undefined,
        name: validateOptionalString(p.name, 'name'),
        stack: validateOptionalString(p.stack, 'stack')
      };
    },
    level: 'error' as const,
    description: 'Emitted when an unhandled error is captured'
  },

  'orchestrator.error.unhandledRejection': {
    validate: (payload: unknown): { reason: string } => {
      if (!payload || typeof payload !== 'object') {
        throw new TypeError('payload must be an object');
      }
      const p = payload as Record<string, unknown>;
      return {
        reason: validateString(p.reason, 'reason')
      };
    },
    level: 'error' as const,
    description: 'Emitted when an unhandled promise rejection occurs'
  },

  'orchestrator.debugger.ready': {
    validate: (payload: unknown): DebuggerReadyPayload => {
      if (!payload || typeof payload !== 'object') {
        throw new TypeError('payload must be an object');
      }
      const p = payload as Record<string, unknown>;
      return {
        flushed: validateNumber(p.flushed, 'flushed')
      };
    },
    level: 'info' as const,
    description: 'Emitted when debugger transitions from bootstrap to ready'
  },

  // Core orchestrator instrumentation events
  'orchestrator.core.initialization.started': {
    validate: (_payload: unknown) => ({}),
    level: 'info' as const,
    description: 'Core orchestrator initialization begins'
  },

  'orchestrator.core.initialization.completed': {
    validate: (payload: unknown): { durationMs: number; rulesCount: number } => {
      if (!payload || typeof payload !== 'object') {
        throw new TypeError('payload must be an object');
      }
      const p = payload as Record<string, unknown>;
      return {
        durationMs: validateNumber(p.durationMs, 'durationMs'),
        rulesCount: validateNumber(p.rulesCount, 'rulesCount')
      };
    },
    level: 'info' as const,
    description: 'Core orchestrator initialization completes successfully'
  },

  'orchestrator.core.initialization.failed': {
    validate: (payload: unknown): { error: string; durationMs: number } => {
      if (!payload || typeof payload !== 'object') {
        throw new TypeError('payload must be an object');
      }
      const p = payload as Record<string, unknown>;
      return {
        error: validateString(p.error, 'error'),
        durationMs: validateNumber(p.durationMs, 'durationMs')
      };
    },
    level: 'error' as const,
    description: 'Core orchestrator initialization fails'
  },

  'orchestrator.log.processing.started': {
    validate: (payload: unknown): { logLevel: string; logSource: string } => {
      if (!payload || typeof payload !== 'object') {
        throw new TypeError('payload must be an object');
      }
      const p = payload as Record<string, unknown>;
      return {
        logLevel: validateString(p.logLevel, 'logLevel'),
        logSource: validateString(p.logSource, 'logSource')
      };
    },
    level: 'debug' as const,
    description: 'Log processing begins'
  },

  'orchestrator.log.processing.completed': {
    validate: (payload: unknown): { durationMs: number; targetBranch: string; logLevel: string } => {
      if (!payload || typeof payload !== 'object') {
        throw new TypeError('payload must be an object');
      }
      const p = payload as Record<string, unknown>;
      return {
        durationMs: validateNumber(p.durationMs, 'durationMs'),
        targetBranch: validateString(p.targetBranch, 'targetBranch'),
        logLevel: validateString(p.logLevel, 'logLevel')
      };
    },
    level: 'debug' as const,
    description: 'Log processing completes successfully'
  },

  'orchestrator.log.processing.failed': {
    validate: (payload: unknown): { durationMs: number; error: string; logLevel: string } => {
      if (!payload || typeof payload !== 'object') {
        throw new TypeError('payload must be an object');
      }
      const p = payload as Record<string, unknown>;
      return {
        durationMs: validateNumber(p.durationMs, 'durationMs'),
        error: validateString(p.error, 'error'),
        logLevel: validateString(p.logLevel, 'logLevel')
      };
    },
    level: 'error' as const,
    description: 'Log processing fails'
  },

  'orchestrator.branch.registration.started': {
    validate: (payload: unknown): { branchName: string; hasConfig: boolean } => {
      if (!payload || typeof payload !== 'object') {
        throw new TypeError('payload must be an object');
      }
      const p = payload as Record<string, unknown>;
      return {
        branchName: validateString(p.branchName, 'branchName'),
        hasConfig: typeof p.hasConfig === 'boolean' ? p.hasConfig : false
      };
    },
    level: 'info' as const,
    description: 'Branch registration begins'
  },

  'orchestrator.branch.registration.completed': {
    validate: (payload: unknown): { branchName: string; durationMs: number } => {
      if (!payload || typeof payload !== 'object') {
        throw new TypeError('payload must be an object');
      }
      const p = payload as Record<string, unknown>;
      return {
        branchName: validateString(p.branchName, 'branchName'),
        durationMs: validateNumber(p.durationMs, 'durationMs')
      };
    },
    level: 'info' as const,
    description: 'Branch registration completes successfully'
  },

  'orchestrator.branch.registration.failed': {
    validate: (payload: unknown): { branchName: string; error: string; durationMs: number } => {
      if (!payload || typeof payload !== 'object') {
        throw new TypeError('payload must be an object');
      }
      const p = payload as Record<string, unknown>;
      return {
        branchName: validateString(p.branchName, 'branchName'),
        error: validateString(p.error, 'error'),
        durationMs: validateNumber(p.durationMs, 'durationMs')
      };
    },
    level: 'error' as const,
    description: 'Branch registration fails'
  }
} as const;

export type EventType = keyof typeof eventSchemas;
export type PayloadOf<T extends EventType> = ReturnType<(typeof eventSchemas)[T]['validate']>;

// Validation function
export function validateEventPayload<T extends EventType>(
  type: T,
  payload: unknown
): PayloadOf<T> {
  const schema = eventSchemas[type];
  if (!schema) {
    throw new TypeError(`Unknown event type: ${type}`);
  }
  return schema.validate(payload) as PayloadOf<T>;
}

// Count quarantined payloads (for digest reporting)
let quarantinedCount = 0;

export function incrementQuarantinedCount(): void {
  quarantinedCount++;
}

export function getQuarantinedCount(): number {
  return quarantinedCount;
}

export function resetQuarantinedCount(): void {
  quarantinedCount = 0;
}