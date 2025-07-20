/**
 * Runtime-core orchestrator functions with comprehensive instrumentation
 * @internal
 */

import { withTiming } from './instrumentation.js';

// Branded types for type safety
export type PlanHash = string & { readonly __brand: 'PlanHash' };
export type StepId = string & { readonly __brand: 'StepId' };

export interface ExecutionPlan {
  hash: PlanHash;
  steps: ExecutionStep[];
  metadata: {
    createdAt: number;
    inputHash?: string;
    totalSteps: number;
  };
}

export interface ExecutionStep {
  id: StepId;
  adapter: string;
  dependencies: StepId[];
  retryCount: number;
  metadata: Record<string, unknown>;
}

export interface PlanExecutionResult {
  planHash: PlanHash;
  totalSteps: number;
  succeeded: number;
  failed: number;
  results: Record<string, unknown>;
}

export interface StepExecutionResult {
  stepId: StepId;
  adapter: string;
  attempt: number;
  success: boolean;
  result?: unknown;
  error?: Error;
}

/**
 * Creates an execution plan with full instrumentation
 */
export async function createExecutionPlan(
  input: Record<string, unknown>,
  options: { inputHash?: string } = {}
): Promise<ExecutionPlan> {
  return withTiming(
    'orchestrator.plan.build',
    { inputHash: options.inputHash },
    async () => {
      // Simulate plan creation logic
      await new Promise(resolve => setTimeout(resolve, 10)); // Simulate async work
      
      const planHash = generatePlanHash(input) as PlanHash;
      const steps: ExecutionStep[] = [
        {
          id: 'step-1' as StepId,
          adapter: 'console-adapter',
          dependencies: [],
          retryCount: 0,
          metadata: { type: 'log-processing' }
        },
        {
          id: 'step-2' as StepId,
          adapter: 'error-adapter',
          dependencies: ['step-1' as StepId],
          retryCount: 0,
          metadata: { type: 'error-handling' }
        }
      ];
      
      const plan: ExecutionPlan = {
        hash: planHash,
        steps,
        metadata: {
          createdAt: Date.now(),
          inputHash: options.inputHash,
          totalSteps: steps.length
        }
      };
      
      return plan;
    }
  );
}

/**
 * Executes a plan with comprehensive instrumentation
 */
export async function executePlan(plan: ExecutionPlan): Promise<PlanExecutionResult> {
  return withTiming(
    'orchestrator.plan.execution',
    { planHash: plan.hash },
    async () => {
      let succeeded = 0;
      let failed = 0;
      const results: Record<string, unknown> = {};
      
      // Execute steps in dependency order
      for (const step of plan.steps) {
        try {
          const stepResult = await dispatchStep(step, 1);
          if (stepResult.success) {
            succeeded++;
            results[step.id] = stepResult.result;
          } else {
            failed++;
            results[step.id] = { error: stepResult.error?.message };
          }
        } catch (error) {
          failed++;
          results[step.id] = { error: error instanceof Error ? error.message : String(error) };
        }
      }
      
      return {
        planHash: plan.hash,
        totalSteps: plan.steps.length,
        succeeded,
        failed,
        results
      };
    }
  );
}

/**
 * Dispatches a single step with instrumentation
 */
export async function dispatchStep(step: ExecutionStep, attempt: number): Promise<StepExecutionResult> {
  return withTiming(
    'orchestrator.step.dispatch',
    { stepId: step.id, adapter: step.adapter, attempt },
    async () => {
      // Simulate step execution
      await new Promise(resolve => setTimeout(resolve, 5));
      
      // Simulate occasional failures for realistic testing
      const shouldFail = Math.random() < 0.1; // 10% failure rate
      
      if (shouldFail) {
        throw new Error(`Step ${step.id} failed during execution`);
      }
      
      return {
        stepId: step.id,
        adapter: step.adapter,
        attempt,
        success: true,
        result: { processed: true, timestamp: Date.now() }
      };
    }
  );
}

/**
 * Finalizes a plan execution with instrumentation
 */
export async function finalizePlan(
  planHash: PlanHash,
  executionResult: PlanExecutionResult
): Promise<{ status: 'success' | 'partial' | 'failed'; totalSteps: number }> {
  return withTiming(
    'orchestrator.plan.finalized',
    { 
      planHash,
      status: executionResult.failed === 0 ? 'success' : 
              executionResult.succeeded > 0 ? 'partial' : 'failed',
      totalSteps: executionResult.totalSteps
    },
    async () => {
      // Simulate finalization work
      await new Promise(resolve => setTimeout(resolve, 5));
      
      const status = executionResult.failed === 0 ? 'success' as const :
                    executionResult.succeeded > 0 ? 'partial' as const : 'failed' as const;
      
      return {
        status,
        totalSteps: executionResult.totalSteps
      };
    }
  );
}

/**
 * Generates a hash for a plan based on input
 */
function generatePlanHash(input: Record<string, unknown>): string {
  // Simple hash generation for demo purposes
  const inputStr = JSON.stringify(input);
  let hash = 0;
  for (let i = 0; i < inputStr.length; i++) {
    const char = inputStr.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `plan-${Math.abs(hash).toString(16)}`;
}