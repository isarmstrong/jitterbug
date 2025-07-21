/**
 * Live Filter Specification Types
 * P4.2-b: Client-server filter update protocol
 */

export type LiveFilterSpec = 
  | { kind: 'branches-levels'; branches?: string[]; levels?: string[] }
  | { kind: 'keyword'; keywords: string[] };

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