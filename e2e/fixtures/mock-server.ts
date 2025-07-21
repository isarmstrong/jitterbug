/**
 * Mock SSE Hub for E2E Testing
 * Minimal Express server that mimics the Jitterbug SSE filter protocol
 */

import express from 'express';
import { Server } from 'http';

interface FilterUpdateMessage {
  type: 'filter:update';
  tag: string;
  spec: {
    kind: 'branches-levels' | 'keyword';
    branches?: string[];
    levels?: string[];
    keywords?: string[];
  };
}

interface FilterAckMessage {
  type: 'filter:ack';
  tag: string;
}

interface FilterErrorMessage {
  type: 'filter:error';
  tag: string;
  reason: string;
}

const rateLimitState = new Map<string, { count: number; lastUpdate: number }>();
const RATE_LIMIT_WINDOW_MS = 5000;
const RATE_LIMIT_MAX = 3;

export async function startMockHub(port = 5177): Promise<() => Promise<void>> {
  const app = express();
  
  app.use(express.json());
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    next();
  });

  // SSE endpoint for clients
  app.get('/sse', (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    // Send initial connection message
    res.write('event: ready\n');
    res.write('data: {"type":"ready","clientId":"test-client","connectedAt":' + Date.now() + '}\n\n');

    // Keep connection alive with periodic heartbeat
    const heartbeat = setInterval(() => {
      res.write('event: heartbeat\n');
      res.write('data: {"type":"heartbeat","timestamp":' + Date.now() + '}\n\n');
    }, 30000);

    req.on('close', () => {
      clearInterval(heartbeat);
    });
  });

  // Reset endpoint for clearing state between tests
  app.post('/reset', (req, res) => {
    rateLimitState.clear();
    res.json({ status: 'reset' });
  });

  // Filter control endpoint
  app.post('/control', (req, res) => {
    const message = req.body as FilterUpdateMessage;
    
    if (message.type !== 'filter:update') {
      res.status(400).json({
        type: 'filter:error',
        tag: message.tag || 'unknown',
        reason: 'invalid_message'
      } as FilterErrorMessage);
      return;
    }

    // Rate limiting logic (per client/tag to avoid cross-test contamination)
    const clientKey = req.ip || 'default';
    const now = Date.now();
    const state = rateLimitState.get(clientKey) || { count: 0, lastUpdate: 0 };
    
    if (now - state.lastUpdate < RATE_LIMIT_WINDOW_MS) {
      state.count++;
    } else {
      state.count = 1;
      state.lastUpdate = now;
    }
    
    rateLimitState.set(clientKey, state);

    if (state.count > RATE_LIMIT_MAX) {
      res.status(429).json({
        type: 'filter:error',
        tag: message.tag,
        reason: 'rate_limited'
      } as FilterErrorMessage);
      return;
    }

    // Auth check (simple test for auth failure)
    if (message.spec.branches?.includes('secret')) {
      res.status(403).json({
        type: 'filter:error',
        tag: message.tag,
        reason: 'auth_failed'
      } as FilterErrorMessage);
      return;
    }

    // Success case
    res.json({
      type: 'filter:ack',
      tag: message.tag
    } as FilterAckMessage);
  });

  return new Promise<() => Promise<void>>((resolve) => {
    const server: Server = app.listen(port, () => {
      console.log(`Mock SSE hub started on port ${port}`);
      
      const closeServer = (): Promise<void> => {
        return new Promise((resolveClose) => {
          server.close(() => {
            console.log('Mock SSE hub stopped');
            resolveClose();
          });
        });
      };
      
      resolve(closeServer);
    });
  });
}