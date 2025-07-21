/**
 * Ring Buffer - P4.3 Back-pressure Management
 * Fixed-size circular buffer for push frames with overflow handling
 * 
 * @internal
 */

export interface RingBufferStats {
  readonly capacity: number;
  readonly size: number;
  readonly dropped: number;
}

export class RingBuffer<T> {
  private readonly buffer: (T | undefined)[];
  private head = 0;
  private tail = 0;
  private count = 0;
  private droppedCount = 0;

  constructor(private readonly capacity: number) {
    if (capacity <= 0) {
      throw new Error('RingBuffer capacity must be positive');
    }
    this.buffer = new Array(capacity);
  }

  /**
   * Add item to buffer. If full, drops oldest item and increments dropped counter
   */
  enqueue(item: T): void {
    if (this.count === this.capacity) {
      // Buffer full - drop oldest item
      this.dequeue();
      this.droppedCount++;
    }

    this.buffer[this.tail] = item;
    this.tail = (this.tail + 1) % this.capacity;
    this.count++;
  }

  /**
   * Remove and return oldest item, or undefined if empty
   */
  dequeue(): T | undefined {
    if (this.count === 0) {
      return undefined;
    }

    const item = this.buffer[this.head];
    this.buffer[this.head] = undefined; // Help GC
    this.head = (this.head + 1) % this.capacity;
    this.count--;
    
    return item;
  }

  /**
   * Peek at oldest item without removing it
   */
  peek(): T | undefined {
    return this.count > 0 ? this.buffer[this.head] : undefined;
  }

  /**
   * Check if buffer is empty
   */
  isEmpty(): boolean {
    return this.count === 0;
  }

  /**
   * Check if buffer is full
   */
  isFull(): boolean {
    return this.count === this.capacity;
  }

  /**
   * Get all items in order (oldest first) without modifying buffer
   */
  toArray(): T[] {
    const result: T[] = [];
    for (let i = 0; i < this.count; i++) {
      const index = (this.head + i) % this.capacity;
      const item = this.buffer[index];
      if (item !== undefined) {
        result.push(item);
      }
    }
    return result;
  }

  /**
   * Clear all items from buffer
   */
  clear(): void {
    for (let i = 0; i < this.capacity; i++) {
      this.buffer[i] = undefined;
    }
    this.head = 0;
    this.tail = 0;
    this.count = 0;
  }

  /**
   * Get buffer statistics
   */
  getStats(): RingBufferStats {
    return {
      capacity: this.capacity,
      size: this.count,
      dropped: this.droppedCount
    };
  }
}