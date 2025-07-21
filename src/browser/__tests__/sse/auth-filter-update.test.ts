import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LogStreamHub } from '../../transports/sse/log-stream-hub';
import { makeMockRequest } from '../helpers/mockReqRes';

// 🔒  Stub implementation lives *only* in tests until you add the prod hook.
vi.mock('../../transports/sse/auth', () => ({
  authorizeFilterUpdate: vi.fn(() => {
    // default: allow – override per test
    return { ok: true, userId: 'test-user' };
  }),
}));

// Mock telemetry to avoid schema validation issues
vi.mock('../../public', () => ({
  experimentalSafeEmit: vi.fn(),
}));

describe('P4.2-c.4 – auth hook & telemetry', () => {
  let hub: LogStreamHub;

  beforeEach(() => {
    hub = new LogStreamHub();
  });

  it('should accept an authorized filter update and emit telemetry', async () => {
    const { req, res } = makeMockRequest('POST', '/control', {
      type: 'filter:update',
      tag: 't1',
      spec: { kind: 'branches-levels', branches: ['core'], levels: [2] },
    });

    await hub.handleControlMessage(req, res);

    /* shape assertions */
    expect(res.body).toMatchInlineSnapshot(`
      {
        "tag": "t1",
        "type": "filter:ack",
      }
    `);

    /* telemetry spy */
    const { experimentalSafeEmit } = await import('../../public');
    expect(experimentalSafeEmit).toHaveBeenCalledWith(
      'orchestrator.sse.filters.applied',
      expect.objectContaining({ 
        clientId: 'test-user', 
        tag: 't1', 
        appliedTs: expect.any(Number) 
      }),
      { bubble: false },
    );
  });

  it('should reject when authorizeFilterUpdate returns { ok:false }', async () => {
    const { authorizeFilterUpdate } = await import('../../transports/sse/auth');
    (authorizeFilterUpdate as any).mockReturnValueOnce({ ok: false, reason: 'forbidden' });

    const { req, res } = makeMockRequest('POST', '/control', {
      type: 'filter:update',
      tag: 't2',
      spec: { kind: 'branches-levels', branches: ['secret'], levels: [5] },
    });

    await hub.handleControlMessage(req, res);

    expect(res.body).toMatchInlineSnapshot(`
      {
        "reason": "forbidden",
        "tag": "t2",
        "type": "filter:error",
      }
    `);
  });
});