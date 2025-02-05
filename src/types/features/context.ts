/**
 * Extended context types for Jitterbug
 * Edge-first logging with progressive enhancement
 */

import type { BaseContext } from '../core';

export interface RequestContext {
    url?: string;
    method?: string;
    headers?: Record<string, string>;
    params?: Record<string, string>;
    query?: Record<string, string>;
    body?: unknown;
    requestId?: string;
    duration?: number;
    status?: number;
}

export interface CacheContext {
    operation: "get" | "set" | "delete" | "has" | "clear";
    key: string;
    ttl?: number;
    size?: number;
    hit?: boolean;
    duration?: number;
}

export interface ExtendedContext extends BaseContext {
    request?: RequestContext;
    cache?: CacheContext;
} 