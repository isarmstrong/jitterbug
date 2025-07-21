/**
 * Live Filter Specification Types
 * P4.2-b: Client-server filter update protocol
 */

export type LiveFilterSpec = 
  | { kind: 'branches-levels'; branches?: string[]; levels?: string[] }
  | { kind: 'keyword'; keywords: string[] };