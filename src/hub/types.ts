/**
 * Hub Context Types - P4.3 Server Push Infrastructure
 * Interfaces for server push event handling and hub communication
 */

import type { ServerPushEvent } from '../orchestrator/types.js';

export interface HubContext {
  readonly connectionCount?: number;
  readonly eventCount?: number;
  readonly errorCount?: number;
  
  // Core emit method for pushing events to clients
  emit(event: ServerPushEvent): Promise<void>;
  
  // Optional event listener support for reactive events
  on?(eventType: string, handler: (...args: any[]) => void): void;
  off?(eventType: string, handler: (...args: any[]) => void): void;
}