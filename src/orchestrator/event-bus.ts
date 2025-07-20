/**
 * Event Bus - Lightweight pub/sub system for inter-branch communication
 */

import type {
  EventType,
  BranchEvent,
  EventSubscription,
  EventHandler,
  EventBusConfig,
  BranchName,
} from './types.js';

export class EventBusError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'EventBusError';
  }
}

export interface EventHistory {
  readonly event: BranchEvent;
  readonly dispatchedAt: number;
  readonly listenerCount: number;
  readonly errors: readonly Error[];
}

export class EventBus {
  private readonly subscriptions = new Map<string, EventSubscription>();
  private readonly listenersByType = new Map<EventType, Set<string>>();
  private readonly history: EventHistory[] = [];
  private readonly config: Required<EventBusConfig>;
  private subscriptionIdCounter = 0;

  constructor(config: EventBusConfig = {}) {
    this.config = {
      maxListeners: config.maxListeners ?? 100,
      enableHistory: config.enableHistory ?? true,
      historySize: config.historySize ?? 1000,
    };
  }

  /**
   * Subscribe to an event type
   */
  subscribe(
    eventType: EventType,
    handler: EventHandler,
    namespace?: string
  ): EventSubscription {
    const id = this.generateSubscriptionId();
    const subscription: EventSubscription = {
      id,
      eventType,
      namespace,
      handler,
    };

    // Check max listeners limit
    const currentListeners = this.listenersByType.get(eventType)?.size ?? 0;
    if (currentListeners >= this.config.maxListeners) {
      throw new EventBusError(
        `Maximum listeners (${this.config.maxListeners}) exceeded for event type ${eventType}`,
        'MAX_LISTENERS_EXCEEDED'
      );
    }

    // Store subscription
    this.subscriptions.set(id, subscription);
    
    // Update listeners by type
    if (!this.listenersByType.has(eventType)) {
      this.listenersByType.set(eventType, new Set());
    }
    this.listenersByType.get(eventType)!.add(id);

    return subscription;
  }

  /**
   * Unsubscribe from an event
   */
  unsubscribe(subscriptionId: string): boolean {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      return false;
    }

    // Remove from subscriptions
    this.subscriptions.delete(subscriptionId);

    // Remove from listeners by type
    const listeners = this.listenersByType.get(subscription.eventType);
    if (listeners) {
      listeners.delete(subscriptionId);
      if (listeners.size === 0) {
        this.listenersByType.delete(subscription.eventType);
      }
    }

    return true;
  }

  /**
   * Unsubscribe all listeners for a namespace
   */
  unsubscribeNamespace(namespace: string): number {
    let count = 0;
    const toRemove: string[] = [];

    for (const [id, subscription] of this.subscriptions) {
      if (subscription.namespace === namespace) {
        toRemove.push(id);
      }
    }

    for (const id of toRemove) {
      if (this.unsubscribe(id)) {
        count++;
      }
    }

    return count;
  }

  /**
   * Publish an event synchronously
   */
  publish(event: BranchEvent): void {
    const listeners = this.getListenersForEvent(event.type);
    const errors: Error[] = [];

    for (const subscription of listeners) {
      try {
        const result = subscription.handler(event);
        // Handle promises from async handlers
        if (result instanceof Promise) {
          result.catch(error => {
            console.error(`Async event handler error for ${event.type}:`, error);
          });
        }
      } catch (error) {
        const handlerError = error instanceof Error ? error : new Error(String(error));
        errors.push(handlerError);
        console.error(`Event handler error for ${event.type}:`, handlerError);
      }
    }

    // Record in history
    if (this.config.enableHistory) {
      this.addToHistory({
        event,
        dispatchedAt: Date.now(),
        listenerCount: listeners.length,
        errors,
      });
    }
  }

  /**
   * Publish an event asynchronously
   */
  async publishAsync(event: BranchEvent): Promise<void> {
    const listeners = this.getListenersForEvent(event.type);
    const errors: Error[] = [];

    const promises = listeners.map(async (subscription) => {
      try {
        await subscription.handler(event);
      } catch (error) {
        const handlerError = error instanceof Error ? error : new Error(String(error));
        errors.push(handlerError);
        console.error(`Async event handler error for ${event.type}:`, handlerError);
      }
    });

    await Promise.allSettled(promises);

    // Record in history
    if (this.config.enableHistory) {
      this.addToHistory({
        event,
        dispatchedAt: Date.now(),
        listenerCount: listeners.length,
        errors,
      });
    }
  }

  /**
   * Get all subscriptions for an event type
   */
  getSubscriptions(eventType: EventType): readonly EventSubscription[] {
    const listeners = this.listenersByType.get(eventType);
    if (!listeners) {
      return [];
    }

    return Array.from(listeners)
      .map(id => this.subscriptions.get(id))
      .filter((sub): sub is EventSubscription => sub !== undefined);
  }

  /**
   * Get all active subscriptions
   */
  getAllSubscriptions(): readonly EventSubscription[] {
    return Array.from(this.subscriptions.values());
  }

  /**
   * Get subscriptions for a namespace
   */
  getNamespaceSubscriptions(namespace: string): readonly EventSubscription[] {
    return Array.from(this.subscriptions.values())
      .filter(sub => sub.namespace === namespace);
  }

  /**
   * Get event history
   */
  getHistory(limit?: number): readonly EventHistory[] {
    const history = this.history.slice();
    history.reverse(); // Most recent first
    return limit ? history.slice(0, limit) : history;
  }

  /**
   * Clear event history
   */
  clearHistory(): void {
    this.history.length = 0;
  }

  /**
   * Get event bus statistics
   */
  getStats(): {
    totalSubscriptions: number;
    subscriptionsByType: Record<string, number>;
    subscriptionsByNamespace: Record<string, number>;
    historySize: number;
    recentEventTypes: readonly string[];
  } {
    const subscriptionsByType: Record<string, number> = {};
    const subscriptionsByNamespace: Record<string, number> = {};

    for (const subscription of this.subscriptions.values()) {
      // Count by type
      const typeKey = subscription.eventType;
      subscriptionsByType[typeKey] = (subscriptionsByType[typeKey] ?? 0) + 1;

      // Count by namespace
      const nsKey = subscription.namespace ?? '<none>';
      subscriptionsByNamespace[nsKey] = (subscriptionsByNamespace[nsKey] ?? 0) + 1;
    }

    // Get recent event types from history
    const recentEventTypes = this.history
      .slice(-10)
      .map(h => h.event.type)
      .filter((type, index, arr) => arr.indexOf(type) === index); // Unique

    return {
      totalSubscriptions: this.subscriptions.size,
      subscriptionsByType,
      subscriptionsByNamespace,
      historySize: this.history.length,
      recentEventTypes,
    };
  }

  /**
   * Create a namespaced event bus
   */
  createNamespacedBus(namespace: string, source: BranchName): NamespacedEventBus {
    return new NamespacedEventBus(this, namespace, source);
  }

  /**
   * Clear all subscriptions
   */
  clear(): void {
    this.subscriptions.clear();
    this.listenersByType.clear();
    this.clearHistory();
  }

  private getListenersForEvent(eventType: EventType): EventSubscription[] {
    const listenerIds = this.listenersByType.get(eventType);
    if (!listenerIds) {
      return [];
    }

    return Array.from(listenerIds)
      .map(id => this.subscriptions.get(id))
      .filter((sub): sub is EventSubscription => sub !== undefined);
  }

  private generateSubscriptionId(): string {
    return `sub_${++this.subscriptionIdCounter}_${Date.now()}`;
  }

  private addToHistory(historyEntry: EventHistory): void {
    this.history.push(historyEntry);
    
    // Trim history if it exceeds max size
    if (this.history.length > this.config.historySize) {
      this.history.splice(0, this.history.length - this.config.historySize);
    }
  }
}

/**
 * Namespaced event bus for branches
 */
export class NamespacedEventBus {
  constructor(
    private readonly parentBus: EventBus,
    private readonly namespace: string,
    private readonly source: BranchName
  ) {}

  /**
   * Subscribe to an event within this namespace
   */
  subscribe(eventType: EventType, handler: EventHandler): EventSubscription {
    return this.parentBus.subscribe(eventType, handler, this.namespace);
  }

  /**
   * Publish an event from this branch
   */
  publish(eventType: EventType, data?: Record<string, unknown>): void {
    const event: BranchEvent = {
      type: eventType,
      source: this.source,
      timestamp: Date.now(),
      data,
    };
    this.parentBus.publish(event);
  }

  /**
   * Publish an event asynchronously from this branch
   */
  async publishAsync(eventType: EventType, data?: Record<string, unknown>): Promise<void> {
    const event: BranchEvent = {
      type: eventType,
      source: this.source,
      timestamp: Date.now(),
      data,
    };
    await this.parentBus.publishAsync(event);
  }

  /**
   * Unsubscribe a specific subscription
   */
  unsubscribe(subscriptionId: string): boolean {
    return this.parentBus.unsubscribe(subscriptionId);
  }

  /**
   * Unsubscribe all listeners in this namespace
   */
  unsubscribeAll(): number {
    return this.parentBus.unsubscribeNamespace(this.namespace);
  }

  /**
   * Get subscriptions for this namespace
   */
  getSubscriptions(): readonly EventSubscription[] {
    return this.parentBus.getNamespaceSubscriptions(this.namespace);
  }
}