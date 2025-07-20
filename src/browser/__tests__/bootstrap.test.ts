/**
 * Bootstrap API Tests
 * 
 * Tests for the window.jitterbug browser console API bootstrap
 */

/// <reference types="vitest/globals" />

import { initializeJitterbug } from '../bootstrap.js';
import type { JitterbugGlobal } from '../types.js';
import { readFileSync } from 'fs';
import { join } from 'path';

// Dynamically read package version for tests
const packageJsonPath = join(process.cwd(), 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
const EXPECTED_VERSION = packageJson.version;

describe('Jitterbug Bootstrap', () => {
  let mockWindow: any;
  let originalWindow: any;

  beforeEach(() => {
    // Create a mock window object
    mockWindow = {
      onerror: null,
      onunhandledrejection: null
    };
    originalWindow = global.window;
    (global as any).window = mockWindow;
  });

  afterEach(() => {
    (global as any).window = originalWindow;
  });

  it('should initialize window.jitterbug API', () => {
    initializeJitterbug(mockWindow);
    
    expect(mockWindow.jitterbug).toBeDefined();
    expect(mockWindow.jitterbug.version).toBe(EXPECTED_VERSION);
    expect(typeof mockWindow.jitterbug.emit).toBe('function');
    expect(typeof mockWindow.jitterbug.getEvents).toBe('function');
    expect(typeof mockWindow.jitterbug.subscribe).toBe('function');
    expect(typeof mockWindow.jitterbug.help).toBe('function');
  });

  it('should be idempotent', () => {
    initializeJitterbug(mockWindow);
    const firstApi = mockWindow.jitterbug;
    
    initializeJitterbug(mockWindow);
    const secondApi = mockWindow.jitterbug;
    
    expect(firstApi).toBe(secondApi);
  });

  it('should validate event type format', () => {
    initializeJitterbug(mockWindow);
    const api: JitterbugGlobal = mockWindow.jitterbug;
    
    expect(() => {
      api.emit('invalid-format', {});
    }).toThrow(TypeError);
    
    expect(() => {
      api.emit('orchestrator.step.started', {});
    }).not.toThrow();
  });

  it('should emit and retrieve events', () => {
    initializeJitterbug(mockWindow);
    const api: JitterbugGlobal = mockWindow.jitterbug;
    
    const eventId = api.emit('orchestrator.step.started', { step: 'test' });
    expect(typeof eventId).toBe('string');
    
    const events = api.getEvents();
    const testEvents = events.filter(e => e.type === 'orchestrator.step.started');
    expect(testEvents.length).toBe(1);
    expect(testEvents[0].type).toBe('orchestrator.step.started');
    expect(testEvents[0].payload).toEqual({ step: 'test' });
  });

  it('should support event subscriptions', () => {
    initializeJitterbug(mockWindow);
    const api: JitterbugGlobal = mockWindow.jitterbug;
    
    const events: any[] = [];
    const unsubscribe = api.subscribe((event) => {
      events.push(event);
    });
    
    api.emit('orchestrator.step.started', { step: 'test' });
    
    expect(events.length).toBe(1);
    expect(events[0].type).toBe('orchestrator.step.started');
    
    unsubscribe();
    api.emit('orchestrator.step.completed', { step: 'test' });
    
    expect(events.length).toBe(1); // No new events after unsubscribe
  });

  it('should handle ready state transition', () => {
    initializeJitterbug(mockWindow);
    const api: JitterbugGlobal = mockWindow.jitterbug;
    
    expect(api.diagnostics().ready).toBe(false);
    
    // Emit events during bootstrap phase
    api.emit('orchestrator.step.started', { step: 'bootstrap' });
    
    const diagnostics = api.diagnostics();
    expect(diagnostics.bootstrapCount).toBeGreaterThanOrEqual(1); // May include config load events
    expect(diagnostics.bufferSize).toBe(0);
    
    // Transition to ready
    api.ready();
    
    const readyDiagnostics = api.diagnostics();
    expect(readyDiagnostics.ready).toBe(true);
    expect(readyDiagnostics.bootstrapCount).toBe(0);
    expect(readyDiagnostics.bufferSize).toBeGreaterThanOrEqual(2); // bootstrap event + ready event + possible config events
  });

  it('should provide help system', () => {
    initializeJitterbug(mockWindow);
    const api: JitterbugGlobal = mockWindow.jitterbug;
    
    const generalHelp = api.help();
    const expectedVersionText = `Jitterbug v${EXPECTED_VERSION.split('.').slice(0,2).join('.')} core API`;
    expect(generalHelp).toContain(expectedVersionText);
    
    const emitHelp = api.help('emit');
    expect(emitHelp).toContain('Emit a structured debugging event');
    expect(emitHelp).toContain('emit<T, P>');
    
    const unknownHelp = api.help('unknown');
    expect(unknownHelp).toContain('No detailed help');
  });

  it('should capture early errors', () => {
    const mockError = new Error('Test error');
    
    initializeJitterbug(mockWindow);
    const api: JitterbugGlobal = mockWindow.jitterbug;
    
    // Simulate window error
    mockWindow.onerror('Test error', 'test.js', 10, 5, mockError);
    
    const events = api.getEvents({ typePrefix: 'orchestrator.error.' });
    expect(events.length).toBe(1);
    expect(events[0].type).toBe('orchestrator.error.unhandled');
    expect(events[0].level).toBe('error');
  });

  it('should filter events by options', () => {
    initializeJitterbug(mockWindow);
    const api: JitterbugGlobal = mockWindow.jitterbug;
    
    // Set debug level to TRACE to ensure all test events are captured
    api.debug.setLevel(api.debug.levels.TRACE);
    
    api.emit('orchestrator.step.started', {}, { level: 'info' });
    api.emit('orchestrator.step.failed', {}, { level: 'error' });
    api.emit('orchestrator.plan.created', {}, { level: 'debug' });
    
    const allEvents = api.getEvents();
    expect(allEvents.length).toBeGreaterThanOrEqual(5); // 3 test events + debug/config events (variable count)
    
    const errorEvents = api.getEvents({ level: 'error' });
    expect(errorEvents.length).toBe(1);
    expect(errorEvents[0].type).toBe('orchestrator.step.failed');
    
    const stepEvents = api.getEvents({ typePrefix: 'orchestrator.step.' });
    expect(stepEvents.length).toBe(2); // step.started + step.failed
    
    const limitedEvents = api.getEvents({ limit: 2 });
    expect(limitedEvents.length).toBe(2);
  });
});