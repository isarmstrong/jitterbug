/**
 * SSE Push Adapter - P4.3 Production-Grade
 * Writes push frames to existing SSE transport with back-pressure handling
 * 
 * @internal
 */

import type { AnyPushFrame } from '../emitters/registry.js';
import type { SignedPushFrame } from '../security/signed-frame.js';

export enum PushResult {
  SUCCESS = 'success',
  SLOW = 'slow',       // Client is slow - back off
  ERROR = 'error'      // Connection error
}

export interface PushAdapter {
  send(frame: AnyPushFrame | SignedPushFrame): Promise<PushResult>;
  isConnected(): boolean;
  getConnectionId(): string;
}

/**
 * Safe JSON stringify to prevent prototype pollution
 * @internal
 */
function safeJsonStringify(obj: unknown): string {
  try {
    return JSON.stringify(obj, (key, value) => {
      // Prevent prototype pollution by rejecting __proto__ and constructor
      if (key === '__proto__' || key === 'constructor') {
        return undefined;
      }
      return value;
    });
  } catch (error) {
    throw new Error(`Failed to serialize push frame: ${error}`);
  }
}

/**
 * SSE Push Adapter implementation
 * Integrates with existing SSE transport system
 */
export class SSEPushAdapter implements PushAdapter {
  private lastSendTime = 0;
  private sendCount = 0;
  
  constructor(
    private readonly connectionId: string,
    private readonly sseTransport: any // Type from existing SSE system
  ) {}

  async send(frame: AnyPushFrame): Promise<PushResult> {
    if (!this.isConnected()) {
      return PushResult.ERROR;
    }

    try {
      const serialized = safeJsonStringify(frame);
      
      // Hard cap: reject frames > 1KB (DoS protection)
      if (serialized.length > 1024) {
        console.warn(`[SSEPushAdapter] Frame size ${serialized.length} bytes exceeds 1KB limit, dropping`);
        return PushResult.ERROR;
      }
      
      const startTime = Date.now();
      
      // Use existing SSE transport to send frame
      await this.sseTransport.send({
        type: 'push.frame',
        data: serialized,
        timestamp: startTime
      });
      
      const sendDuration = Date.now() - startTime;
      this.lastSendTime = startTime;
      this.sendCount++;
      
      // Consider slow if send takes >100ms
      return sendDuration > 100 ? PushResult.SLOW : PushResult.SUCCESS;
      
    } catch (error) {
      console.error('[SSEPushAdapter] Send failed:', error);
      return PushResult.ERROR;
    }
  }

  isConnected(): boolean {
    // Check if SSE transport is connected
    return this.sseTransport?.isConnected?.() ?? false;
  }

  getConnectionId(): string {
    return this.connectionId;
  }

  /**
   * Get adapter statistics for monitoring
   */
  getStats(): { sendCount: number; lastSendTime: number } {
    return {
      sendCount: this.sendCount,
      lastSendTime: this.lastSendTime
    };
  }
}