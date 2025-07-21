/**
 * Playwright Global Teardown
 * Stops mock SSE hub after all E2E tests
 */

import { unlinkSync, existsSync } from 'fs';
import { join } from 'path';

export default async function globalTeardown(): Promise<void> {
  console.log('Stopping mock SSE hub...');
  
  const closeServer = (global as any).__E2E_CLEANUP__;
  if (closeServer) {
    await closeServer();
  }

  // Clean up teardown marker file
  const teardownPath = join(process.cwd(), 'e2e-teardown.json');
  if (existsSync(teardownPath)) {
    unlinkSync(teardownPath);
  }
}