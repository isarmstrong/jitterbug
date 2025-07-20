/**
 * Beautiful Emoji Console Transport - Task 4
 * 
 * Provides elegant console output with 🐛 emoji branding,
 * expandable groups, and smart formatting for development.
 * 
 * @experimental Subject to change without SemVer guarantees.
 */

import { registerLogTap } from '../logs/internal/hooks.js';

type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'trace';

interface EmojiConsoleOptions {
  /** Enable/disable the transport (default: auto-detect development) */
  enabled?: boolean;
  /** Minimum log level to display (default: 'info') */
  minLevel?: LogLevel;
  /** Show expandable groups for complex payloads (default: true) */
  useGroups?: boolean;
  /** Show timestamps in output (default: true) */
  showTimestamps?: boolean;
  /** Prefix all output with 🐛 (default: true) */
  useBugEmoji?: boolean;
}

interface FormattedEvent {
  emoji: string;
  title: string;
  style: string;
  payload?: unknown;
  metadata?: Record<string, unknown>;
}

// Level priority mapping for filtering
const LEVEL_PRIORITY: Record<LogLevel, number> = {
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
  trace: 5
};

// Emoji mapping for different event categories
const EVENT_EMOJIS: Record<string, string> = {
  // Core lifecycle
  'orchestrator.core.initialization': '🚀',
  'orchestrator.core.shutdown': '🛑',
  'orchestrator.debugger.ready': '✅',
  
  // Step execution
  'orchestrator.step.started': '▶️',
  'orchestrator.step.completed': '✅',
  'orchestrator.step.failed': '❌',
  'orchestrator.step.dispatch': '🔄',
  
  // Plan management
  'orchestrator.plan.build': '📋',
  'orchestrator.plan.execution': '⚡',
  'orchestrator.plan.finalized': '🏁',
  
  // Branch management
  'orchestrator.branch.registration': '🌿',
  'orchestrator.branch.unregistration': '🗑️',
  'orchestrator.branch.lifecycle': '🌱',
  
  // Debug control
  'orchestrator.debug.enabled': '🔍',
  'orchestrator.debug.disabled': '🔇',
  'orchestrator.debug.level': '📊',
  'orchestrator.debug.validation': '⚠️',
  
  // Configuration
  'orchestrator.config.load': '📂',
  'orchestrator.config.persist': '💾',
  'orchestrator.config.reset': '🔄',
  
  // Log processing
  'orchestrator.log.processing': '📝',
  
  // Errors
  'orchestrator.error.unhandled': '💥',
  'orchestrator.error.unhandledRejection': '🚨'
};

// Console styling
const STYLES = {
  title: 'font-weight: bold; color: #2563eb;',
  timestamp: 'color: #6b7280; font-size: 0.9em;',
  level: {
    error: 'color: #dc2626; font-weight: bold;',
    warn: 'color: #d97706; font-weight: bold;',
    info: 'color: #2563eb;',
    debug: 'color: #6b7280;',
    trace: 'color: #9ca3af;'
  },
  payload: 'color: #374151; margin-left: 1em;',
  branch: 'color: #059669; font-weight: 500;'
};

interface EmojiConsoleInstance {
  start(): void;
  stop(): void;
  updateOptions(options: Partial<EmojiConsoleOptions>): void;
  getOptions(): Readonly<Required<EmojiConsoleOptions>>;
}

class EmojiConsoleTransport implements EmojiConsoleInstance {
  private options: Required<EmojiConsoleOptions>;
  private unregister?: () => void;

  constructor(options: EmojiConsoleOptions = {}) {
    this.options = {
      enabled: options.enabled ?? this.isDevMode(),
      minLevel: options.minLevel ?? 'info',
      useGroups: options.useGroups ?? true,
      showTimestamps: options.showTimestamps ?? true,
      useBugEmoji: options.useBugEmoji ?? true
    };
  }

  start(): void {
    if (!this.options.enabled) {
      return;
    }

    this.unregister = registerLogTap(this.handleLogEvent.bind(this));
  }

  stop(): void {
    if (this.unregister) {
      this.unregister();
      this.unregister = undefined;
    }
  }

  private isDevMode(): boolean {
    // Auto-detect development environment
    return process.env.NODE_ENV === 'development' || 
           process.env.NODE_ENV === 'test' ||
           (typeof window !== 'undefined' && window.location.hostname === 'localhost');
  }

  private shouldLog(level?: string): boolean {
    if (!level) return true;
    
    const eventLevel = level as LogLevel;
    const minPriority = LEVEL_PRIORITY[this.options.minLevel];
    const eventPriority = LEVEL_PRIORITY[eventLevel];
    
    return eventPriority <= minPriority;
  }

  private formatEvent(type: string, payload: unknown, metadata?: Record<string, unknown>): FormattedEvent {
    // Get emoji for event category
    const categoryKey = Object.keys(EVENT_EMOJIS).find(key => type.startsWith(key));
    const emoji = categoryKey ? EVENT_EMOJIS[categoryKey] : '🔍';
    
    // Format title with bug emoji prefix
    const bugPrefix = this.options.useBugEmoji ? '🐛 ' : '';
    const title = `${bugPrefix}${emoji} ${type}`;
    
    // Determine styling based on level
    const level = (metadata?.level as LogLevel) || 'info';
    const style = STYLES.level[level] || STYLES.level.info;

    return {
      emoji,
      title,
      style,
      payload,
      metadata
    };
  }

  private formatTimestamp(): string {
    const now = new Date();
    return now.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      fractionalSecondDigits: 3
    });
  }

  private logSimple(formatted: FormattedEvent): void {
    const parts: string[] = [];
    const styles: string[] = [];

    // Timestamp
    if (this.options.showTimestamps) {
      parts.push(`%c[${this.formatTimestamp()}]`);
      styles.push(STYLES.timestamp);
    }

    // Main title
    parts.push(`%c${formatted.title}`);
    styles.push(formatted.style);

    // Branch info if available
    if (formatted.metadata?.branch) {
      parts.push(`%c@${formatted.metadata.branch}`);
      styles.push(STYLES.branch);
    }

    console.log(parts.join(' '), ...styles);

    // Log payload separately if present
    if (formatted.payload && Object.keys(formatted.payload as object).length > 0) {
      console.log('%cPayload:', STYLES.payload, formatted.payload);
    }
  }

  private logGrouped(formatted: FormattedEvent): void {
    const parts: string[] = [];
    const styles: string[] = [];

    // Timestamp
    if (this.options.showTimestamps) {
      parts.push(`%c[${this.formatTimestamp()}]`);
      styles.push(STYLES.timestamp);
    }

    // Main title
    parts.push(`%c${formatted.title}`);
    styles.push(formatted.style);

    // Branch info if available
    if (formatted.metadata?.branch) {
      parts.push(`%c@${formatted.metadata.branch}`);
      styles.push(STYLES.branch);
    }

    // Create collapsible group
    console.groupCollapsed(parts.join(' '), ...styles);

    // Show payload if present
    if (formatted.payload && Object.keys(formatted.payload as object).length > 0) {
      console.log('Payload:', formatted.payload);
    }

    // Show metadata if present
    if (formatted.metadata && Object.keys(formatted.metadata).length > 0) {
      console.log('Metadata:', formatted.metadata);
    }

    console.groupEnd();
  }

  private handleLogEvent(type: string, payload: unknown, metadata?: Record<string, unknown>): void {
    // Check if we should log this level
    if (!this.shouldLog(metadata?.level as string)) {
      return;
    }

    try {
      const formatted = this.formatEvent(type, payload, metadata);
      
      // Use groups for complex events, simple logging for basic ones
      const isComplexEvent = formatted.payload && 
        typeof formatted.payload === 'object' && 
        Object.keys(formatted.payload as object).length > 2;

      if (this.options.useGroups && isComplexEvent) {
        this.logGrouped(formatted);
      } else {
        this.logSimple(formatted);
      }
    } catch (error) {
      // Fallback to basic console.log if formatting fails
      console.log(`🐛 ${type}`, payload);
    }
  }

  // Configuration methods
  updateOptions(options: Partial<EmojiConsoleOptions>): void {
    Object.assign(this.options, options);
  }

  getOptions(): Readonly<Required<EmojiConsoleOptions>> {
    return { ...this.options };
  }
}

// Global instance
let activeTransport: EmojiConsoleInstance | null = null;

// Default options
const DEFAULT_OPTIONS: EmojiConsoleOptions = {
  enabled: true, // Will be overridden by isDevMode() in constructor
  minLevel: 'info',
  useGroups: true,
  showTimestamps: true,
  useBugEmoji: true
};

/**
 * Controller interface for emoji console transport
 * @experimental Subject to change without SemVer guarantees.
 */
export interface EmojiConsoleController {
  stop(): void;
  update(opts: Partial<EmojiConsoleOptions>): void;
  options(): Readonly<Required<EmojiConsoleOptions>>;
}

/**
 * Enable (or reconfigure) the emoji console transport
 * 
 * Idempotent: calling again updates existing instance.
 * 
 * @experimental Subject to change without SemVer guarantees.
 */
export function experimentalEmojiConsole(
  opts: Partial<EmojiConsoleOptions> = {}
): EmojiConsoleController {
  // If transport exists, update it and return controller
  if (activeTransport) {
    activeTransport.updateOptions(opts);
    return createController();
  }
  
  // Create new transport with merged options
  const mergedOptions = { ...DEFAULT_OPTIONS, ...opts };
  activeTransport = new EmojiConsoleTransport(mergedOptions);
  activeTransport.start();
  
  return createController();
}

function createController(): EmojiConsoleController {
  return {
    stop(): void {
      if (activeTransport) {
        activeTransport.stop();
        activeTransport = null;
      }
    },
    
    update(opts: Partial<EmojiConsoleOptions>): void {
      if (activeTransport) {
        activeTransport.updateOptions(opts);
      }
    },
    
    options(): Readonly<Required<EmojiConsoleOptions>> {
      if (activeTransport) {
        return activeTransport.getOptions();
      }
      // Return defaults if no active transport
      const transport = new EmojiConsoleTransport();
      return transport.getOptions();
    }
  };
}

// Internal factory for backward compatibility within this file
function createEmojiConsole(options?: EmojiConsoleOptions): EmojiConsoleInstance {
  return new EmojiConsoleTransport(options);
}

// Export types for external use
export type { EmojiConsoleOptions, LogLevel };