/**
 * Playwright Global Setup
 * Starts mock SSE hub before all E2E tests
 */

import { writeFileSync } from 'fs';
import { join } from 'path';
import { startMockHub } from './mock-server.js';

export default async function globalSetup(): Promise<void> {
  console.log('Starting mock SSE hub for E2E tests...');
  
  const closeServer = await startMockHub(5177);
  
  // Store teardown function reference for global teardown
  const teardownPath = join(process.cwd(), 'e2e-teardown.json');
  writeFileSync(teardownPath, JSON.stringify({ 
    hubStarted: true,
    timestamp: Date.now()
  }));

  // Store cleanup function globally for teardown
  (global as any).__E2E_CLEANUP__ = closeServer;
}