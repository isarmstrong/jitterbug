/**
 * Branded types for type-safe event payloads
 */

// Branded primitive types
export type ISODateString = string & { readonly __isoDate: unique symbol };
export type PlanHash = string & { readonly __planHash: unique symbol };
export type StepId = string & { readonly __stepId: unique symbol };
export type BranchName = string & { readonly __branchName: unique symbol };
export type EventId = string & { readonly __eventId: unique symbol };

// Quarantined payload for intentionally deferred validation
export type QuarantinedPayload = unknown & { readonly __quarantined: unique symbol };

// Branded constructors
export const StepId = (v: string): StepId => v as StepId;
export const PlanHash = (v: string): PlanHash => v as PlanHash;
export const BranchName = (v: string): BranchName => v as BranchName;
export const EventId = (v: string): EventId => v as EventId;

export function quarantine(payload: unknown): QuarantinedPayload {
  return payload as QuarantinedPayload;
}

// Validation helpers
export function isValidStepId(v: string): v is StepId {
  return /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(v);
}

export function isValidPlanHash(v: string): v is PlanHash {
  return /^[a-f0-9]{8,64}$/.test(v);
}

export function isValidBranchName(v: string): v is BranchName {
  return /^[a-zA-Z0-9][a-zA-Z0-9_/-]*[a-zA-Z0-9]$/.test(v);
}