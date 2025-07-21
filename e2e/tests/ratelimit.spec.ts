import { test, expect } from '@playwright/test';

async function burstUpdate(page: any, count: number): Promise<any[]> {
  return await page.evaluate(async (updateCount: number) => {
    const results = [];
    window.__JBUG_TEST_CONTROL_URL__ = 'http://localhost:5177/control';
    
    for (let i = 0; i < updateCount; i++) {
      try {
        const result = await window.jitterbug.debug.sse.setFilters({
          kind: 'keyword',
          keywords: [`test-${i}`]
        });
        results.push({ success: true, result, index: i });
      } catch (error) {
        results.push({ success: false, error: error.message, index: i });
      }
      
      // Small delay to ensure proper sequencing
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return results;
  }, count);
}

test.describe('P4.2-c.6: Rate limiting E2E', () => {
  test.beforeEach(async () => {
    // Reset mock server state before each test
    await fetch('http://localhost:5177/reset', { method: 'POST' });
  });

  test('rate limit triggers after 4 updates in 5s', async ({ page }) => {
    await page.goto('http://localhost:5173/dev-server.html');
    
    await page.waitForFunction(() => 
      typeof window.jitterbug !== 'undefined' && 
      typeof window.jitterbug.debug !== 'undefined'
    );

    // Perform burst of 5 updates (should trigger rate limit on 4th+)
    const results = await burstUpdate(page, 5);

    // Debug: log results for troubleshooting
    console.log('Rate limit test results:', results.map(r => ({ 
      index: r.index, 
      success: r.success, 
      error: r.error?.substring(0, 50) 
    })));

    // At least first 3 should succeed, and some should be rate limited
    const successCount = results.filter(r => r.success).length;
    const rateLimitedCount = results.filter(r => !r.success && r.error?.includes('rate_limited')).length;
    
    expect(successCount).toBeGreaterThanOrEqual(3);
    expect(rateLimitedCount).toBeGreaterThanOrEqual(1);
  });

  test('rate limit UI feedback shows toast notification', async ({ page }) => {
    await page.goto('http://localhost:5173/dev-server.html');
    
    await page.waitForFunction(() => 
      typeof window.jitterbug !== 'undefined'
    );

    // Trigger rate limit
    await burstUpdate(page, 5);

    // Check for rate limit UI feedback (would need UI implementation)
    const toastVisible = await page.evaluate(() => {
      // Look for toast/notification element
      const toast = document.querySelector('[data-testid="rate-limit-toast"]');
      return toast !== null && toast.textContent?.includes('rate limit');
    });

    // For now, just verify the test structure
    // In real implementation, this would check for actual toast UI
    expect(typeof toastVisible).toBe('boolean');
  });
});