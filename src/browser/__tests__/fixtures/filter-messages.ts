/**
 * Test-only filter message types
 * P4.2-c.4: Protocol types for testing SSE filter updates
 */

import type { LiveFilterSpec } from '../../transports/sse/filter-spec';

export interface FilterUpdateMessage {
  type: 'filter:update';
  tag: string;
  spec: LiveFilterSpec;
}

export interface FilterAckMessage {
  type: 'filter:ack';
  tag: string;
}

export interface FilterErrorMessage {
  type: 'filter:error';
  tag: string;
  reason: string;
}