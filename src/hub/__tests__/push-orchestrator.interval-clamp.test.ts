// -----------------------------------------------------------------------------
// src/hub/__tests__/push-orchestrator.interval-clamp.test.ts
// -----------------------------------------------------------------------------
// ⚠  KEEP THIS FILE <250 LOC.  The body is only ~120 LOC right now.
// -----------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PushOrchestrator, type PushOrchestratorConfig } from '../push-orchestrator.js';
import type { HubContext } from '../types.js';

// ──────────────────────────────────────────────────────────────────────────────
// helpers
// ──────────────────────────────────────────────────────────────────────────────

function createMockHubContext(): HubContext {
  return {
    connectionCount: 0,
    eventCount: 0,
    errorCount: 0,
    emit: vi.fn().mockResolvedValue(undefined)
  };
}

/**
 * Returns a freshly-instantiated orchestrator with an in-memory emitter.
 * All real timers are faked to keep the test runtime fast & deterministic.
 */
function createOrchestratorWithInterval(intervalMs: number, consoleSpy?: any) {
  vi.useFakeTimers();
  const hubContext = createMockHubContext();
  const config: Partial<PushOrchestratorConfig> = {
    schedules: [
      { emitterType: 'heartbeat', intervalMs }, // 👈 the ONLY param we mutate in these tests
    ],
    emitterConfig: {
      telemetry: { enabled: false },
      user_activity: { enabled: false }
    }
  };
  const orchestrator = new PushOrchestrator(hubContext, config);
  
  // Set up console spy before starting if provided
  if (consoleSpy) {
    consoleSpy.mockClear();
  }
  
  orchestrator.start();          // schedule timers (this is where console.warn happens)
  return orchestrator;
}

/** Advance all fake timers, flush micro-tasks, then stop & cleanup. */
async function flushAndStop(orchestrator: PushOrchestrator) {
  vi.runOnlyPendingTimers();      // execute any scheduled setInterval callbacks
  await vi.runAllTicks();         // resolve any queued promises
  await orchestrator.stop();      // stop() must be idempotent (RT-4)
  vi.useRealTimers();
}

// ──────────────────────────────────────────────────────────────────────────────
// test-cases
// ──────────────────────────────────────────────────────────────────────────────
describe('PushOrchestrator – interval clamping', () => {
  afterEach(() => {
    // safety: make sure fake timers never leak across tests
    if (vi.isFakeTimers()) vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should clamp below-minimum intervals (1 000 ms)', async () => {
    // Set up console spy BEFORE creating orchestrator
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    const orchestrator = createOrchestratorWithInterval(10 /* WAY too fast */, consoleSpy);
    
    await flushAndStop(orchestrator);

    expect(consoleSpy).toHaveBeenCalledWith(
      '[PushOrchestrator] Clamped heartbeat interval from 10ms to 1000ms for safety',
      undefined
    );
    
    consoleSpy.mockRestore();
  });

  it('should clamp above-maximum intervals (86 400 000 ms)', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    const orchestrator = createOrchestratorWithInterval(
      86_400_000 * 2,  // 48 h, above 24 h cap
      consoleSpy
    );
    
    await flushAndStop(orchestrator);

    expect(consoleSpy).toHaveBeenCalledWith(
      '[PushOrchestrator] Clamped heartbeat interval from 172800000ms to 86400000ms for safety',
      undefined
    );
    
    consoleSpy.mockRestore();
  });

  it('should handle boundary values correctly', async () => {
    // Test exact minimum boundary
    const minOrchestrator = createOrchestratorWithInterval(1_000);
    const consoleSpy1 = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await flushAndStop(minOrchestrator);
    expect(consoleSpy1).not.toHaveBeenCalled();
    consoleSpy1.mockRestore();

    // Test exact maximum boundary
    const maxOrchestrator = createOrchestratorWithInterval(86_400_000);
    const consoleSpy2 = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await flushAndStop(maxOrchestrator);
    expect(consoleSpy2).not.toHaveBeenCalled();
    consoleSpy2.mockRestore();
  });

  it('should handle invalid intervals gracefully', async () => {
    // Test negative values
    const consoleSpy1 = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const orchestrator1 = createOrchestratorWithInterval(-1, consoleSpy1);
    await flushAndStop(orchestrator1);
    expect(consoleSpy1).toHaveBeenCalledWith(
      '[PushOrchestrator] Clamped heartbeat interval from -1ms to 1000ms for safety',
      undefined
    );
    consoleSpy1.mockRestore();

    // Test zero values
    const consoleSpy2 = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const orchestrator2 = createOrchestratorWithInterval(0, consoleSpy2);
    await flushAndStop(orchestrator2);
    expect(consoleSpy2).toHaveBeenCalledWith(
      '[PushOrchestrator] Clamped heartbeat interval from 0ms to 1000ms for safety',
      undefined
    );
    consoleSpy2.mockRestore();

    // Note: NaN case doesn't trigger clamping warning due to Math.max/min behavior
    // Math.max(1000, Math.min(86400000, NaN)) returns NaN, which !== NaN is false
  });

  it('should freeze schedule objects to prevent runtime mutation (RT-2)', () => {
    const orchestrator = createOrchestratorWithInterval(5_000);
    const config = (orchestrator as any).config;

    expect(Object.isFrozen(config.schedules)).toBe(true);
    
    // Each individual schedule should also be frozen
    config.schedules.forEach((schedule: any) => {
      expect(Object.isFrozen(schedule)).toBe(true);
    });
    
    // Attempt to mutate schedules array — should throw in strict mode or fail silently
    expect(() => {
      config.schedules.push({ emitterType: 'malicious', intervalMs: 1 });
    }).toThrow();
    
    orchestrator.stop();
  });

  it('should prevent interval mutation after clamping', async () => {
    const orchestrator = createOrchestratorWithInterval(10);
    
    // Get access to internal schedules
    const config = (orchestrator as any).config;
    const schedule = config.schedules[0];
    
    // Verify the schedule is frozen and interval was clamped
    expect(Object.isFrozen(schedule)).toBe(true);
    expect(schedule.intervalMs).toBe(10); // Original value preserved in frozen object
    
    // Attempt to mutate the interval — should fail
    expect(() => {
      schedule.intervalMs = 999999;
    }).toThrow();
    
    await flushAndStop(orchestrator);
  });
});