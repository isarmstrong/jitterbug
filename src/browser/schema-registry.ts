/**
 * Event Schema Registry for typed event validation
 * 
 * @internal - DO NOT EXPORT FROM public.ts  
 * Schema details are internal validation implementation.
 */

// Import types for future use in payload validation
import type { JitterbugEvent } from './types.js';
import { notifyLogTaps } from './logs/internal/hooks.js';

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

function validateStringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value)) {
    throw new TypeError(`${field} must be an array`);
  }
  return value.map((item, index) => {
    if (typeof item !== 'string') {
      throw new TypeError(`${field}[${index}] must be a string`);
    }
    return item;
  });
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
  },

  'orchestrator.branch.unregistration.started': {
    validate: (payload: unknown): { branchName: string } => {
      if (!payload || typeof payload !== 'object') {
        throw new TypeError('payload must be an object');
      }
      const p = payload as Record<string, unknown>;
      return {
        branchName: validateString(p.branchName, 'branchName')
      };
    },
    level: 'info' as const,
    description: 'Branch unregistration begins'
  },

  'orchestrator.branch.unregistration.completed': {
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
    description: 'Branch unregistration completes successfully'
  },

  'orchestrator.branch.unregistration.failed': {
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
    description: 'Branch unregistration fails'
  },

  'orchestrator.core.shutdown.started': {
    validate: (_payload: unknown) => ({}),
    level: 'info' as const,
    description: 'Core orchestrator shutdown begins'
  },

  'orchestrator.core.shutdown.completed': {
    validate: (payload: unknown): { durationMs: number } => {
      if (!payload || typeof payload !== 'object') {
        throw new TypeError('payload must be an object');
      }
      const p = payload as Record<string, unknown>;
      return {
        durationMs: validateNumber(p.durationMs, 'durationMs')
      };
    },
    level: 'info' as const,
    description: 'Core orchestrator shutdown completes successfully'
  },

  'orchestrator.core.shutdown.failed': {
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
    description: 'Core orchestrator shutdown fails'
  },

  // Runtime-core instrumentation events
  'orchestrator.plan.build.started': {
    validate: (payload: unknown): { inputHash?: string } => {
      if (!payload || typeof payload !== 'object') {
        throw new TypeError('payload must be an object');
      }
      const p = payload as Record<string, unknown>;
      return {
        inputHash: validateOptionalString(p.inputHash, 'inputHash')
      };
    },
    level: 'info' as const,
    description: 'Execution plan build begins'
  },

  'orchestrator.plan.build.completed': {
    validate: (payload: unknown): { planHash: string; stepCount: number; elapsedMs: number } => {
      if (!payload || typeof payload !== 'object') {
        throw new TypeError('payload must be an object');
      }
      const p = payload as Record<string, unknown>;
      return {
        planHash: validateString(p.planHash, 'planHash'),
        stepCount: validateNumber(p.stepCount, 'stepCount'),
        elapsedMs: validateNumber(p.elapsedMs, 'elapsedMs')
      };
    },
    level: 'info' as const,
    description: 'Execution plan build completes successfully'
  },

  'orchestrator.plan.build.failed': {
    validate: (payload: unknown): { errorCode: string; message?: string; elapsedMs: number } => {
      if (!payload || typeof payload !== 'object') {
        throw new TypeError('payload must be an object');
      }
      const p = payload as Record<string, unknown>;
      return {
        errorCode: validateString(p.errorCode, 'errorCode'),
        message: validateOptionalString(p.message, 'message'),
        elapsedMs: validateNumber(p.elapsedMs, 'elapsedMs')
      };
    },
    level: 'error' as const,
    description: 'Execution plan build fails'
  },

  'orchestrator.plan.execution.started': {
    validate: (payload: unknown): { planHash: string } => {
      if (!payload || typeof payload !== 'object') {
        throw new TypeError('payload must be an object');
      }
      const p = payload as Record<string, unknown>;
      return {
        planHash: validateString(p.planHash, 'planHash')
      };
    },
    level: 'info' as const,
    description: 'Plan execution begins'
  },

  'orchestrator.plan.execution.completed': {
    validate: (payload: unknown): { planHash: string; totalSteps: number; succeeded: number; failed: number; elapsedMs: number } => {
      if (!payload || typeof payload !== 'object') {
        throw new TypeError('payload must be an object');
      }
      const p = payload as Record<string, unknown>;
      return {
        planHash: validateString(p.planHash, 'planHash'),
        totalSteps: validateNumber(p.totalSteps, 'totalSteps'),
        succeeded: validateNumber(p.succeeded, 'succeeded'),
        failed: validateNumber(p.failed, 'failed'),
        elapsedMs: validateNumber(p.elapsedMs, 'elapsedMs')
      };
    },
    level: 'info' as const,
    description: 'Plan execution completes'
  },

  'orchestrator.plan.execution.failed': {
    validate: (payload: unknown): { planHash: string; errorCode: string; message?: string; elapsedMs: number } => {
      if (!payload || typeof payload !== 'object') {
        throw new TypeError('payload must be an object');
      }
      const p = payload as Record<string, unknown>;
      return {
        planHash: validateString(p.planHash, 'planHash'),
        errorCode: validateString(p.errorCode, 'errorCode'),
        message: validateOptionalString(p.message, 'message'),
        elapsedMs: validateNumber(p.elapsedMs, 'elapsedMs')
      };
    },
    level: 'error' as const,
    description: 'Plan execution fails'
  },

  'orchestrator.step.dispatch.started': {
    validate: (payload: unknown): { stepId: string; adapter: string; attempt: number } => {
      if (!payload || typeof payload !== 'object') {
        throw new TypeError('payload must be an object');
      }
      const p = payload as Record<string, unknown>;
      return {
        stepId: validateString(p.stepId, 'stepId'),
        adapter: validateString(p.adapter, 'adapter'),
        attempt: validateNumber(p.attempt, 'attempt')
      };
    },
    level: 'debug' as const,
    description: 'Step dispatch begins'
  },

  'orchestrator.step.dispatch.completed': {
    validate: (payload: unknown): { stepId: string; adapter: string; attempt: number; elapsedMs: number } => {
      if (!payload || typeof payload !== 'object') {
        throw new TypeError('payload must be an object');
      }
      const p = payload as Record<string, unknown>;
      return {
        stepId: validateString(p.stepId, 'stepId'),
        adapter: validateString(p.adapter, 'adapter'),
        attempt: validateNumber(p.attempt, 'attempt'),
        elapsedMs: validateNumber(p.elapsedMs, 'elapsedMs')
      };
    },
    level: 'debug' as const,
    description: 'Step dispatch completes successfully'
  },

  'orchestrator.step.dispatch.failed': {
    validate: (payload: unknown): { stepId: string; adapter: string; attempt: number; errorCode: string; message?: string; elapsedMs: number } => {
      if (!payload || typeof payload !== 'object') {
        throw new TypeError('payload must be an object');
      }
      const p = payload as Record<string, unknown>;
      return {
        stepId: validateString(p.stepId, 'stepId'),
        adapter: validateString(p.adapter, 'adapter'),
        attempt: validateNumber(p.attempt, 'attempt'),
        errorCode: validateString(p.errorCode, 'errorCode'),
        message: validateOptionalString(p.message, 'message'),
        elapsedMs: validateNumber(p.elapsedMs, 'elapsedMs')
      };
    },
    level: 'error' as const,
    description: 'Step dispatch fails'
  },

  'orchestrator.plan.finalized': {
    validate: (payload: unknown): { planHash: string; status: string; totalSteps: number; elapsedMs: number } => {
      if (!payload || typeof payload !== 'object') {
        throw new TypeError('payload must be an object');
      }
      const p = payload as Record<string, unknown>;
      const validStatuses = ['success', 'partial', 'failed'];
      const status = validateString(p.status, 'status');
      if (!validStatuses.includes(status)) {
        throw new TypeError(`status must be one of: ${validStatuses.join(', ')}`);
      }
      return {
        planHash: validateString(p.planHash, 'planHash'),
        status,
        totalSteps: validateNumber(p.totalSteps, 'totalSteps'),
        elapsedMs: validateNumber(p.elapsedMs, 'elapsedMs')
      };
    },
    level: 'info' as const,
    description: 'Plan finalization completes'
  },

  // Branch lifecycle management events (Task 3.2)
  'orchestrator.branch.lifecycle.created': {
    validate: (payload: unknown): { branch: string; parent?: string; timestamp: string; metadata?: Record<string, unknown> } => {
      if (!payload || typeof payload !== 'object') {
        throw new TypeError('payload must be an object');
      }
      const p = payload as Record<string, unknown>;
      return {
        branch: validateString(p.branch, 'branch'),
        parent: validateOptionalString(p.parent, 'parent'),
        timestamp: validateString(p.timestamp, 'timestamp'),
        metadata: p.metadata && typeof p.metadata === 'object' ? p.metadata as Record<string, unknown> : undefined
      };
    },
    level: 'info' as const,
    description: 'New debug branch created'
  },

  'orchestrator.branch.lifecycle.activated': {
    validate: (payload: unknown): { branch: string; previous?: string; timestamp: string } => {
      if (!payload || typeof payload !== 'object') {
        throw new TypeError('payload must be an object');
      }
      const p = payload as Record<string, unknown>;
      return {
        branch: validateString(p.branch, 'branch'),
        previous: validateOptionalString(p.previous, 'previous'),
        timestamp: validateString(p.timestamp, 'timestamp')
      };
    },
    level: 'info' as const,
    description: 'Branch set as active for new events'
  },

  'orchestrator.branch.lifecycle.deactivated': {
    validate: (payload: unknown): { branch: string; timestamp: string } => {
      if (!payload || typeof payload !== 'object') {
        throw new TypeError('payload must be an object');
      }
      const p = payload as Record<string, unknown>;
      return {
        branch: validateString(p.branch, 'branch'),
        timestamp: validateString(p.timestamp, 'timestamp')
      };
    },
    level: 'info' as const,
    description: 'Branch no longer active'
  },

  'orchestrator.branch.lifecycle.enabled': {
    validate: (payload: unknown): { branch: string; timestamp: string } => {
      if (!payload || typeof payload !== 'object') {
        throw new TypeError('payload must be an object');
      }
      const p = payload as Record<string, unknown>;
      return {
        branch: validateString(p.branch, 'branch'),
        timestamp: validateString(p.timestamp, 'timestamp')
      };
    },
    level: 'info' as const,
    description: 'Branch enabled for event logging'
  },

  'orchestrator.branch.lifecycle.disabled': {
    validate: (payload: unknown): { branch: string; timestamp: string } => {
      if (!payload || typeof payload !== 'object') {
        throw new TypeError('payload must be an object');
      }
      const p = payload as Record<string, unknown>;
      return {
        branch: validateString(p.branch, 'branch'),
        timestamp: validateString(p.timestamp, 'timestamp')
      };
    },
    level: 'info' as const,
    description: 'Branch disabled for event logging'
  },

  'orchestrator.branch.lifecycle.deleted': {
    validate: (payload: unknown): { branch: string; timestamp: string } => {
      if (!payload || typeof payload !== 'object') {
        throw new TypeError('payload must be an object');
      }
      const p = payload as Record<string, unknown>;
      return {
        branch: validateString(p.branch, 'branch'),
        timestamp: validateString(p.timestamp, 'timestamp')
      };
    },
    level: 'info' as const,
    description: 'Branch deleted from registry'
  },

  // Debug control events (Task 3.3)
  'orchestrator.debug.enabled': {
    validate: (payload: unknown): { prev: boolean; by: string; timestamp: string } => {
      if (!payload || typeof payload !== 'object') {
        throw new TypeError('payload must be an object');
      }
      const p = payload as Record<string, unknown>;
      const validSources = ['system', 'api', 'config'];
      const by = validateString(p.by, 'by');
      if (!validSources.includes(by)) {
        throw new TypeError(`by must be one of: ${validSources.join(', ')}`);
      }
      return {
        prev: typeof p.prev === 'boolean' ? p.prev : false,
        by,
        timestamp: validateString(p.timestamp, 'timestamp')
      };
    },
    level: 'info' as const,
    description: 'Debug event emission enabled'
  },

  'orchestrator.debug.disabled': {
    validate: (payload: unknown): { prev: boolean; by: string; timestamp: string } => {
      if (!payload || typeof payload !== 'object') {
        throw new TypeError('payload must be an object');
      }
      const p = payload as Record<string, unknown>;
      const validSources = ['system', 'api', 'config'];
      const by = validateString(p.by, 'by');
      if (!validSources.includes(by)) {
        throw new TypeError(`by must be one of: ${validSources.join(', ')}`);
      }
      return {
        prev: typeof p.prev === 'boolean' ? p.prev : false,
        by,
        timestamp: validateString(p.timestamp, 'timestamp')
      };
    },
    level: 'info' as const,
    description: 'Debug event emission disabled'
  },

  'orchestrator.debug.level.changed': {
    validate: (payload: unknown): { prev: number; next: number; by: string; timestamp: string } => {
      if (!payload || typeof payload !== 'object') {
        throw new TypeError('payload must be an object');
      }
      const p = payload as Record<string, unknown>;
      const validSources = ['system', 'api', 'config'];
      const by = validateString(p.by, 'by');
      if (!validSources.includes(by)) {
        throw new TypeError(`by must be one of: ${validSources.join(', ')}`);
      }
      const prev = validateNumber(p.prev, 'prev');
      const next = validateNumber(p.next, 'next');
      if (prev < 0 || prev > 5 || !Number.isInteger(prev)) {
        throw new TypeError('prev must be integer 0-5');
      }
      if (next < 0 || next > 5 || !Number.isInteger(next)) {
        throw new TypeError('next must be integer 0-5');
      }
      return {
        prev,
        next,
        by,
        timestamp: validateString(p.timestamp, 'timestamp')
      };
    },
    level: 'info' as const,
    description: 'Debug level changed'
  },

  'orchestrator.debug.validation.failed': {
    validate: (payload: unknown): { reason: string; received: any; expected: string; by: string; timestamp: string } => {
      if (!payload || typeof payload !== 'object') {
        throw new TypeError('payload must be an object');
      }
      const p = payload as Record<string, unknown>;
      const validSources = ['system', 'api', 'config'];
      const by = validateString(p.by, 'by');
      if (!validSources.includes(by)) {
        throw new TypeError(`by must be one of: ${validSources.join(', ')}`);
      }
      return {
        reason: validateString(p.reason, 'reason'),
        received: p.received, // any type allowed
        expected: validateString(p.expected, 'expected'),
        by,
        timestamp: validateString(p.timestamp, 'timestamp')
      };
    },
    level: 'error' as const,
    description: 'Debug control validation failed'
  },

  // Configuration persistence events (Task 3.4) - Optional tracking
  'orchestrator.config.load.started': {
    validate: (payload: unknown): { source: string } => {
      if (!payload || typeof payload !== 'object') {
        throw new TypeError('payload must be an object');
      }
      const p = payload as Record<string, unknown>;
      return {
        source: validateString(p.source, 'source')
      };
    },
    level: 'debug' as const,
    description: 'Configuration load begins'
  },

  'orchestrator.config.load.completed': {
    validate: (payload: unknown): { source: string; migrated: boolean; durationMs: number } => {
      if (!payload || typeof payload !== 'object') {
        throw new TypeError('payload must be an object');
      }
      const p = payload as Record<string, unknown>;
      return {
        source: validateString(p.source, 'source'),
        migrated: typeof p.migrated === 'boolean' ? p.migrated : false,
        durationMs: validateNumber(p.durationMs, 'durationMs')
      };
    },
    level: 'info' as const,
    description: 'Configuration load completes successfully'
  },

  'orchestrator.config.load.failed': {
    validate: (payload: unknown): { reason: string; durationMs: number } => {
      if (!payload || typeof payload !== 'object') {
        throw new TypeError('payload must be an object');
      }
      const p = payload as Record<string, unknown>;
      return {
        reason: validateString(p.reason, 'reason'),
        durationMs: validateNumber(p.durationMs, 'durationMs')
      };
    },
    level: 'warn' as const,
    description: 'Configuration load fails'
  },

  'orchestrator.config.persist.scheduled': {
    validate: (payload: unknown): { debounceMs: number; reason: string } => {
      if (!payload || typeof payload !== 'object') {
        throw new TypeError('payload must be an object');
      }
      const p = payload as Record<string, unknown>;
      return {
        debounceMs: validateNumber(p.debounceMs, 'debounceMs'),
        reason: validateString(p.reason, 'reason')
      };
    },
    level: 'debug' as const,
    description: 'Configuration persistence scheduled'
  },

  'orchestrator.config.persist.completed': {
    validate: (payload: unknown): { bytes: number; durationMs: number } => {
      if (!payload || typeof payload !== 'object') {
        throw new TypeError('payload must be an object');
      }
      const p = payload as Record<string, unknown>;
      return {
        bytes: validateNumber(p.bytes, 'bytes'),
        durationMs: validateNumber(p.durationMs, 'durationMs')
      };
    },
    level: 'debug' as const,
    description: 'Configuration persistence completes'
  },

  'orchestrator.config.persist.failed': {
    validate: (payload: unknown): { reason: string } => {
      if (!payload || typeof payload !== 'object') {
        throw new TypeError('payload must be an object');
      }
      const p = payload as Record<string, unknown>;
      return {
        reason: validateString(p.reason, 'reason')
      };
    },
    level: 'warn' as const,
    description: 'Configuration persistence fails'
  },

  'orchestrator.config.reset': {
    validate: (payload: unknown): { previousVersion: number; newVersion: number; timestamp: string } => {
      if (!payload || typeof payload !== 'object') {
        throw new TypeError('payload must be an object');
      }
      const p = payload as Record<string, unknown>;
      return {
        previousVersion: validateNumber(p.previousVersion, 'previousVersion'),
        newVersion: validateNumber(p.newVersion, 'newVersion'),
        timestamp: validateString(p.timestamp, 'timestamp')
      };
    },
    level: 'info' as const,
    description: 'Configuration reset to defaults'
  },

  // SSE Transport Events (Task 5)
  'orchestrator.transport.sse.started': {
    validate: (payload: unknown): { path: string; cors: boolean } => {
      if (!payload || typeof payload !== 'object') {
        throw new TypeError('payload must be an object');
      }
      const p = payload as Record<string, unknown>;
      return {
        path: validateString(p.path, 'path'),
        cors: typeof p.cors === 'boolean' ? p.cors : false
      };
    },
    level: 'info' as const,
    description: 'SSE transport started'
  },

  'orchestrator.transport.sse.stopped': {
    validate: (payload: unknown): { uptime: number; clientsDisconnected: number } => {
      if (!payload || typeof payload !== 'object') {
        throw new TypeError('payload must be an object');
      }
      const p = payload as Record<string, unknown>;
      return {
        uptime: validateNumber(p.uptime, 'uptime'),
        clientsDisconnected: validateNumber(p.clientsDisconnected, 'clientsDisconnected')
      };
    },
    level: 'info' as const,
    description: 'SSE transport stopped'
  },

  'orchestrator.transport.sse.client.connected': {
    validate: (payload: unknown): { clientId: string; totalClients: number } => {
      if (!payload || typeof payload !== 'object') {
        throw new TypeError('payload must be an object');
      }
      const p = payload as Record<string, unknown>;
      return {
        clientId: validateString(p.clientId, 'clientId'),
        totalClients: validateNumber(p.totalClients, 'totalClients')
      };
    },
    level: 'debug' as const,
    description: 'SSE client connected'
  },

  'orchestrator.transport.sse.client.disconnected': {
    validate: (payload: unknown): { clientId: string; uptime: number; totalClients: number } => {
      if (!payload || typeof payload !== 'object') {
        throw new TypeError('payload must be an object');
      }
      const p = payload as Record<string, unknown>;
      return {
        clientId: validateString(p.clientId, 'clientId'),
        uptime: validateNumber(p.uptime, 'uptime'),
        totalClients: validateNumber(p.totalClients, 'totalClients')
      };
    },
    level: 'debug' as const,
    description: 'SSE client disconnected'
  },

  'orchestrator.transport.sse.broadcast': {
    validate: (payload: unknown): { eventType: string; clientCount: number; success: boolean } => {
      if (!payload || typeof payload !== 'object') {
        throw new TypeError('payload must be an object');
      }
      const p = payload as Record<string, unknown>;
      return {
        eventType: validateString(p.eventType, 'eventType'),
        clientCount: validateNumber(p.clientCount, 'clientCount'),
        success: typeof p.success === 'boolean' ? p.success : false
      };
    },
    level: 'debug' as const,
    description: 'SSE event broadcast'
  },

  // P1.5 SSE telemetry events
  'orchestrator.sse.connection.opened': {
    validate: (payload: unknown): { connectionId: string; since: number; filters: Record<string, any>; totalConnections: number } => {
      if (!payload || typeof payload !== 'object') {
        throw new TypeError('payload must be an object');
      }
      const p = payload as Record<string, unknown>;
      return {
        connectionId: validateString(p.connectionId, 'connectionId'),
        since: validateNumber(p.since, 'since'),
        filters: typeof p.filters === 'object' && p.filters !== null ? p.filters as Record<string, any> : {},
        totalConnections: validateNumber(p.totalConnections, 'totalConnections')
      };
    },
    level: 'debug' as const,
    description: 'SSE client connection opened'
  },

  'orchestrator.sse.connection.closed': {
    validate: (payload: unknown): { connectionId: string; reason: string; durationMs: number; totalConnections: number } => {
      if (!payload || typeof payload !== 'object') {
        throw new TypeError('payload must be an object');
      }
      const p = payload as Record<string, unknown>;
      return {
        connectionId: validateString(p.connectionId, 'connectionId'),
        reason: validateString(p.reason, 'reason'),
        durationMs: validateNumber(p.durationMs, 'durationMs'),
        totalConnections: validateNumber(p.totalConnections, 'totalConnections')
      };
    },
    level: 'debug' as const,
    description: 'SSE client connection closed'
  },

  'orchestrator.sse.event.sent': {
    validate: (payload: unknown): { count: number; messageType: string; activeConnections: number; filteredOut?: number } => {
      if (!payload || typeof payload !== 'object') {
        throw new TypeError('payload must be an object');
      }
      const p = payload as Record<string, unknown>;
      return {
        count: validateNumber(p.count, 'count'),
        messageType: validateString(p.messageType, 'messageType'),
        activeConnections: validateNumber(p.activeConnections, 'activeConnections'),
        filteredOut: p.filteredOut !== undefined ? validateNumber(p.filteredOut, 'filteredOut') : undefined
      };
    },
    level: 'debug' as const,
    description: 'SSE events successfully sent to clients'
  },

  'orchestrator.sse.event.dropped': {
    validate: (payload: unknown): { eventType: string; reason: string } => {
      if (!payload || typeof payload !== 'object') {
        throw new TypeError('payload must be an object');
      }
      const p = payload as Record<string, unknown>;
      return {
        eventType: validateString(p.eventType, 'eventType'),
        reason: validateString(p.reason, 'reason')
      };
    },
    level: 'debug' as const,
    description: 'SSE event dropped (no active connections)'
  },

  'orchestrator.sse.transport.started': {
    validate: (payload: unknown): { path: string; cors: boolean; capabilities: Record<string, any> } => {
      if (!payload || typeof payload !== 'object') {
        throw new TypeError('payload must be an object');
      }
      const p = payload as Record<string, unknown>;
      return {
        path: validateString(p.path, 'path'),
        cors: typeof p.cors === 'boolean' ? p.cors : false,
        capabilities: typeof p.capabilities === 'object' && p.capabilities !== null ? p.capabilities as Record<string, any> : {}
      };
    },
    level: 'info' as const,
    description: 'SSE transport started'
  },

  'orchestrator.sse.transport.stopped': {
    validate: (payload: unknown): { uptime: number; clientsDisconnected: number } => {
      if (!payload || typeof payload !== 'object') {
        throw new TypeError('payload must be an object');
      }
      const p = payload as Record<string, unknown>;
      return {
        uptime: validateNumber(p.uptime, 'uptime'),
        clientsDisconnected: validateNumber(p.clientsDisconnected, 'clientsDisconnected')
      };
    },
    level: 'info' as const,
    description: 'SSE transport stopped'
  },

  // P2 SSE ingestion telemetry events
  'orchestrator.sse.ingest.flush': {
    validate: (payload: unknown): { count: number; dropped: number; latencyMs: number } => {
      if (!payload || typeof payload !== 'object') {
        throw new TypeError('payload must be an object');
      }
      const p = payload as Record<string, unknown>;
      return {
        count: validateNumber(p.count, 'count'),
        dropped: validateNumber(p.dropped, 'dropped'),
        latencyMs: validateNumber(p.latencyMs, 'latencyMs')
      };
    },
    level: 'debug' as const,
    description: 'SSE outbound buffer flushed to server'
  },

  'orchestrator.sse.ingest.error': {
    validate: (payload: unknown): { reason: string; retryInMs: number } => {
      if (!payload || typeof payload !== 'object') {
        throw new TypeError('payload must be an object');
      }
      const p = payload as Record<string, unknown>;
      return {
        reason: validateString(p.reason, 'reason'),
        retryInMs: validateNumber(p.retryInMs, 'retryInMs')
      };
    },
    level: 'warn' as const,
    description: 'SSE ingestion request failed'
  },

  'orchestrator.sse.filters.updated': {
    validate: (payload: unknown): { filters: { branches?: string[]; levels?: string[] }; timestamp: number } => {
      if (!payload || typeof payload !== 'object') {
        throw new TypeError('payload must be an object');
      }
      const p = payload as Record<string, unknown>;
      const filters = p.filters as Record<string, unknown>;
      return {
        filters: {
          branches: filters?.branches ? validateStringArray(filters.branches, 'filters.branches') : undefined,
          levels: filters?.levels ? validateStringArray(filters.levels, 'filters.levels') : undefined
        },
        timestamp: validateNumber(p.timestamp, 'timestamp')
      };
    },
    level: 'debug' as const,
    description: 'SSE filter configuration updated on client'
  },

  'orchestrator.sse.filters.requested': {
    validate: (payload: unknown): { tag: string; spec: unknown; timestamp: number } => {
      if (!payload || typeof payload !== 'object') {
        throw new TypeError('payload must be an object');
      }
      const p = payload as Record<string, unknown>;
      return {
        tag: validateString(p.tag, 'tag'),
        spec: p.spec, // Don't validate spec structure here - server will validate
        timestamp: validateNumber(p.timestamp, 'timestamp')
      };
    },
    level: 'debug' as const,
    description: 'SSE filter update requested'
  },

  'orchestrator.sse.filters.acked': {
    validate: (payload: unknown): { tag: string; spec: unknown; appliedTs: number } => {
      if (!payload || typeof payload !== 'object') {
        throw new TypeError('payload must be an object');
      }
      const p = payload as Record<string, unknown>;
      return {
        tag: validateString(p.tag, 'tag'),
        spec: p.spec,
        appliedTs: validateNumber(p.appliedTs, 'appliedTs')
      };
    },
    level: 'debug' as const,
    description: 'SSE filter update acknowledged by server'
  },

  'orchestrator.sse.filters.rejected': {
    validate: (payload: unknown): { tag: string; code: string; message?: string } => {
      if (!payload || typeof payload !== 'object') {
        throw new TypeError('payload must be an object');
      }
      const p = payload as Record<string, unknown>;
      return {
        tag: validateString(p.tag, 'tag'),
        code: validateString(p.code, 'code'),
        message: validateOptionalString(p.message, 'message')
      };
    },
    level: 'warn' as const,
    description: 'SSE filter update rejected by server'
  },

  'orchestrator.sse.filters.timeout': {
    validate: (payload: unknown): { tag: string; spec: unknown; timeoutMs: number } => {
      if (!payload || typeof payload !== 'object') {
        throw new TypeError('payload must be an object');
      }
      const p = payload as Record<string, unknown>;
      return {
        tag: validateString(p.tag, 'tag'),
        spec: p.spec,
        timeoutMs: validateNumber(p.timeoutMs, 'timeoutMs')
      };
    },
    level: 'warn' as const,
    description: 'SSE filter update timed out'
  },

  'orchestrator.sse.filters.rate_limited': {
    validate: (payload: unknown): { clientId: string; tag: string; windowMs: number } => {
      if (!payload || typeof payload !== 'object') {
        throw new TypeError('payload must be an object');
      }
      const p = payload as Record<string, unknown>;
      return {
        clientId: validateString(p.clientId, 'clientId'),
        tag: validateString(p.tag, 'tag'),
        windowMs: validateNumber(p.windowMs, 'windowMs')
      };
    },
    level: 'warn' as const,
    description: 'SSE filter update rate limited'
  },

  'orchestrator.sse.filters.validation_error': {
    validate: (payload: unknown): { clientId: string; tag: string; error: string } => {
      if (!payload || typeof payload !== 'object') {
        throw new TypeError('payload must be an object');
      }
      const p = payload as Record<string, unknown>;
      return {
        clientId: validateString(p.clientId, 'clientId'),
        tag: validateString(p.tag, 'tag'),
        error: validateString(p.error, 'error')
      };
    },
    level: 'warn' as const,
    description: 'SSE filter spec validation failed'
  },

  'orchestrator.sse.filters.applied': {
    validate: (payload: unknown): { clientId: string; tag: string; spec: unknown; appliedTs: number } => {
      if (!payload || typeof payload !== 'object') {
        throw new TypeError('payload must be an object');
      }
      const p = payload as Record<string, unknown>;
      return {
        clientId: validateString(p.clientId, 'clientId'),
        tag: validateString(p.tag, 'tag'),
        spec: p.spec,
        appliedTs: validateNumber(p.appliedTs, 'appliedTs')
      };
    },
    level: 'debug' as const,
    description: 'SSE filter successfully applied'
  },

  // P4.4-b-1 SSE signature verification events
  'orchestrator.sse.signature.verified': {
    validate: (payload: unknown): { clientId: string; kid: string } => {
      if (!payload || typeof payload !== 'object') {
        throw new TypeError('payload must be an object');
      }
      const p = payload as Record<string, unknown>;
      return {
        clientId: validateString(p.clientId, 'clientId'),
        kid: validateString(p.kid, 'kid')
      };
    },
    level: 'debug' as const,
    description: 'SSE frame signature successfully verified'
  },

  'orchestrator.sse.signature.invalid': {
    validate: (payload: unknown): { clientId: string; kid: string; error: string } => {
      if (!payload || typeof payload !== 'object') {
        throw new TypeError('payload must be an object');
      }
      const p = payload as Record<string, unknown>;
      return {
        clientId: validateString(p.clientId, 'clientId'),
        kid: validateString(p.kid, 'kid'),
        error: validateString(p.error, 'error')
      };
    },
    level: 'warn' as const,
    description: 'SSE frame signature verification failed'
  },

  'orchestrator.sse.signature.key_missing': {
    validate: (payload: unknown): { clientId: string; kid: string; error: string } => {
      if (!payload || typeof payload !== 'object') {
        throw new TypeError('payload must be an object');
      }
      const p = payload as Record<string, unknown>;
      return {
        clientId: validateString(p.clientId, 'clientId'),
        kid: validateString(p.kid, 'kid'),
        error: validateString(p.error, 'error')
      };
    },
    level: 'error' as const,
    description: 'SSE frame signature verification failed due to missing key'
  },

  // P4.4-b-1 SSE client connection events
  'orchestrator.sse.client.connecting': {
    validate: (payload: unknown): { url: string } => {
      if (!payload || typeof payload !== 'object') {
        throw new TypeError('payload must be an object');
      }
      const p = payload as Record<string, unknown>;
      return {
        url: validateString(p.url, 'url')
      };
    },
    level: 'debug' as const,
    description: 'SSE client attempting to connect'
  },

  'orchestrator.sse.client.connected': {
    validate: (payload: unknown): { url: string } => {
      if (!payload || typeof payload !== 'object') {
        throw new TypeError('payload must be an object');
      }
      const p = payload as Record<string, unknown>;
      return {
        url: validateString(p.url, 'url')
      };
    },
    level: 'info' as const,
    description: 'SSE client successfully connected'
  },

  'orchestrator.sse.client.error': {
    validate: (payload: unknown): { error: string; readyState?: number } => {
      if (!payload || typeof payload !== 'object') {
        throw new TypeError('payload must be an object');
      }
      const p = payload as Record<string, unknown>;
      return {
        error: validateString(p.error, 'error'),
        readyState: p.readyState !== undefined ? validateNumber(p.readyState, 'readyState') : undefined
      };
    },
    level: 'warn' as const,
    description: 'SSE client connection error'
  },

  'orchestrator.sse.client.reconnecting': {
    validate: (payload: unknown): { attempt: number; delayMs: number } => {
      if (!payload || typeof payload !== 'object') {
        throw new TypeError('payload must be an object');
      }
      const p = payload as Record<string, unknown>;
      return {
        attempt: validateNumber(p.attempt, 'attempt'),
        delayMs: validateNumber(p.delayMs, 'delayMs')
      };
    },
    level: 'info' as const,
    description: 'SSE client attempting reconnection'
  },

  'orchestrator.sse.client.failed': {
    validate: (payload: unknown): { attempts: number; maxAttempts: number } => {
      if (!payload || typeof payload !== 'object') {
        throw new TypeError('payload must be an object');
      }
      const p = payload as Record<string, unknown>;
      return {
        attempts: validateNumber(p.attempts, 'attempts'),
        maxAttempts: validateNumber(p.maxAttempts, 'maxAttempts')
      };
    },
    level: 'error' as const,
    description: 'SSE client connection permanently failed'
  },

  // P4.4-b-1 Push frame events
  'orchestrator.push.frame.received': {
    validate: (payload: unknown): { type: string; timestamp: number; source: string } => {
      if (!payload || typeof payload !== 'object') {
        throw new TypeError('payload must be an object');
      }
      const p = payload as Record<string, unknown>;
      return {
        type: validateString(p.type, 'type'),
        timestamp: validateNumber(p.timestamp, 'timestamp'),
        source: validateString(p.source, 'source')
      };
    },
    level: 'debug' as const,
    description: 'Push frame successfully received and processed'
  }
} as const;

export type EventType = keyof typeof eventSchemas;
export type PayloadOf<T extends EventType> = ReturnType<(typeof eventSchemas)[T]['validate']>;

// Global emit function reference (set by bootstrap)
let globalEmitFn: ((type: string, payload: any, opts?: any) => string) | undefined;

/** @internal - For bootstrap integration only */
export function setGlobalEmitFn(emitFn: (type: string, payload: any, opts?: any) => string): void {
  globalEmitFn = emitFn;
}

// Emit guard for development/test
/** @experimental Subject to change without SemVer guarantees. */
export function safeEmit<T extends EventType>(type: T, payload: PayloadOf<T>, opts?: any): string | undefined {
  if (process.env.NODE_ENV !== 'production') {
    if (!eventSchemas[type]) {
      throw new Error(`[schema-missing] Event '${type}' emitted without registered schema`);
    }
    try {
      const validated = eventSchemas[type].validate(payload);
      // Actually emit if global emit function is available
      if (globalEmitFn) {
        const eventId = globalEmitFn(type, validated, opts);
        // Notify internal log taps for log inspection
        notifyLogTaps(type, validated, opts);
        return eventId;
      }
      return undefined;
    } catch (error) {
      throw new Error(`[schema-invalid] Event '${type}' payload validation failed: ${error}`);
    }
  }
  // Actually emit if global emit function is available
  if (globalEmitFn) {
    const eventId = globalEmitFn(type, payload, opts);
    // Notify internal log taps for log inspection
    notifyLogTaps(type, payload, opts);
    return eventId;
  }
  return undefined;
}

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