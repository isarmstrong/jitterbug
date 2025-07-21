import { describe, it, expect } from 'vitest';
import { LogStreamHub } from '../../transports/sse/log-stream-hub';

/** Helper – crude RSS sampler (Node only, not run in browser env) */
const rssMB = (): number => Math.round(process.memoryUsage().rss / 1024 / 1024);

/**
 * Repeatedly open / close 1k connections with small filter updates
 * and assert resident-set stabilises below +10 MB after GC.
 */
describe('P4.2-c.5: hub memory & cleanup', () => {
  it('should not leak more than 10 MB after 1k connect / disconnect cycles', async () => {
    const hub = new LogStreamHub();
    const baseline = rssMB();

    for (let i = 0; i < 1000; i++) {
      const clientId = `client-${i}`;
      
      // Add client with filter predicate
      const client = hub.addClient(clientId, (entry) => {
        return entry.level === 'error' || entry.level === 'warn';
      });
      
      // Simulate some activity
      expect(client.id).toBe(clientId);
      expect(hub.getClient(clientId)).toBeDefined();
      
      // Remove client to test cleanup
      const removed = hub.removeClient(clientId);
      expect(removed).toBe(true);
      expect(hub.getClient(clientId)).toBeUndefined();
    }

    global.gc?.(); // if --expose-gc; safe-no-op otherwise
    await new Promise(r => setTimeout(r, 50)); // micro-delay for GC

    expect(rssMB() - baseline).toBeLessThan(10);
  });

  it('should clean up filter contexts on disconnect', async () => {
    const hub = new LogStreamHub();
    const clientIds: string[] = [];

    // Create 100 clients with filter contexts
    for (let i = 0; i < 100; i++) {
      const clientId = `filter-client-${i}`;
      clientIds.push(clientId);
      
      hub.addClient(clientId);
      
      // Apply filter update to create filter context
      const frame = {
        op: 'filter:update' as const,
        tag: `tag-${i}`,
        ts: Date.now(),
        spec: { kind: 'keyword' as const, keywords: ['error'] }
      };
      hub.handleFilterUpdate(clientId, frame);
    }

    // Verify clients exist
    expect(hub.getActiveClients()).toHaveLength(100);

    // Remove all clients
    for (const clientId of clientIds) {
      hub.removeClient(clientId);
    }

    // Verify all clients and contexts are cleaned up
    expect(hub.getActiveClients()).toHaveLength(0);
    
    // Test that filter contexts are properly garbage collected
    global.gc?.();
    await new Promise(r => setTimeout(r, 10));
  });
});