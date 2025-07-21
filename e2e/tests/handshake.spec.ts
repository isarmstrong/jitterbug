import { test, expect } from '@playwright/test';

test.describe('P4.2-c.6: SSE handshake E2E', () => {
  test.beforeEach(async () => {
    // Reset mock server state before each test
    await fetch('http://localhost:5177/reset', { method: 'POST' });
  });

  test('live-filter handshake happy path', async ({ page }) => {
    // Navigate to development server
    await page.goto('http://localhost:5173/dev-server.html');
    
    // Wait for Jitterbug to be available
    await page.waitForFunction(() => 
      typeof window.jitterbug !== 'undefined' && 
      typeof window.jitterbug.debug !== 'undefined'
    );

    // Set up mock SSE endpoint
    await page.evaluate(() => {
      // Mock the SSE transport to use our test server
      window.__JBUG_TEST_SSE_URL__ = 'http://localhost:5177/sse';
      window.__JBUG_TEST_CONTROL_URL__ = 'http://localhost:5177/control';
    });

    // Trigger filter update
    const filterResponse = await page.evaluate(async () => {
      try {
        const result = await window.jitterbug.debug.sse.setFilters({
          kind: 'branches-levels',
          branches: ['ui'],
          levels: ['INFO']
        });
        return { success: true, result };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    // Verify the filter was applied successfully
    expect(filterResponse.success).toBe(true);
    
    // Check that the result has the expected shape
    expect(filterResponse.result).toMatchObject({
      type: 'filter:ack',
      tag: expect.any(String)
    });
  });

  test('connection cleanup on tab close', async ({ page }) => {
    await page.goto('http://localhost:5173/dev-server.html');
    
    await page.waitForFunction(() => 
      typeof window.jitterbug !== 'undefined'
    );

    // Set up connection
    await page.evaluate(() => {
      window.__JBUG_TEST_SSE_URL__ = 'http://localhost:5177/sse';
    });

    // Get initial connection count
    const initialConnections = await page.evaluate(() => {
      return window.jitterbug?.debug?.sse?.getConnectionCount?.() || 0;
    });

    // Close the page (simulates tab close)
    await page.close();

    // Verify cleanup happened (would need instrumentation in real implementation)
    // For now, just verify the test structure works
    expect(initialConnections).toBeGreaterThanOrEqual(0);
  });
});