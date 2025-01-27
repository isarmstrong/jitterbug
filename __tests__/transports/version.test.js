import { describe, test, expect, beforeEach, vi } from 'vitest';
import { VersionTransport } from '../../src/transports/version';
import { Runtime } from '../../src/types';

describe('VersionTransport', () => {
    let transport;

    beforeEach(() => {
        // Reset mocks and transport
        vi.resetModules();
        transport = new VersionTransport({
            requiredVersions: {
                next: '13.0.0',
                react: '18.2.0',
                node: '16.0.0'
            }
        });
    });

    test('detects framework versions', async () => {
        await transport.write({
            data: {
                type: 'version',
                eventType: 'framework',
                framework: {
                    name: 'react',
                    version: '18.2.0'
                }
            }
        });

        const metrics = transport.getMetrics();
        expect(metrics.reactVersion).toBe('18.2.0');
        expect(metrics.isReactCompatible).toBe(true);
    });

    test('identifies incompatible patterns', async () => {
        await transport.write({
            data: {
                type: 'version',
                eventType: 'pattern',
                pattern: {
                    name: 'useLayoutEffect',
                    implementation: 'useLayoutEffect in SSR',
                    context: {
                        runtime: Runtime.EDGE,
                        isSSR: true
                    }
                }
            }
        });

        const metrics = transport.getMetrics();
        const pattern = metrics.incompatiblePatterns.get('useLayoutEffect');
        expect(pattern).toBeDefined();
        expect(pattern.severity).toBe('error');
        expect(pattern.details).toContain('may cause hydration mismatches');
    });

    test('validates SSE implementations', async () => {
        await transport.write({
            data: {
                type: 'version',
                eventType: 'sse',
                sse: {
                    endpoint: '/api/logs',
                    implementation: 'EventSource onmessage onerror reconnection error handling',
                    reconnectStrategy: 'exponential-backoff'
                }
            }
        });

        const metrics = transport.getMetrics();
        const sse = metrics.sseImplementations.get('/api/logs');
        expect(sse).toBeDefined();
        expect(sse.isValid).toBe(true);
        expect(sse.issues).toHaveLength(0);
    });

    test('identifies React pattern issues', async () => {
        await transport.write({
            data: {
                type: 'version',
                eventType: 'react',
                react: {
                    component: 'AsyncComponent',
                    patterns: ['useLayoutEffect'],
                    async: true,
                    suspense: false,
                    serverComponent: true
                }
            }
        });

        const metrics = transport.getMetrics();
        const pattern = metrics.reactPatterns.get('AsyncComponent');
        expect(pattern).toBeDefined();
        expect(pattern.issues).toContain('Async component without Suspense boundary');
        expect(pattern.issues).toContain('useLayoutEffect in Server Component');
    });

    test('handles multiple events in sequence', async () => {
        // Framework version
        await transport.write({
            data: {
                type: 'version',
                eventType: 'framework',
                framework: {
                    name: 'next',
                    version: '13.0.0'
                }
            }
        });

        // Pattern usage
        await transport.write({
            data: {
                type: 'version',
                eventType: 'pattern',
                pattern: {
                    name: 'fetch',
                    implementation: 'sync fetch in Edge',
                    context: { runtime: Runtime.EDGE }
                }
            }
        });

        const metrics = transport.getMetrics();
        expect(metrics.nextVersion).toBe('13.0.0');
        expect(metrics.isNextCompatible).toBe(true);
        expect(metrics.incompatiblePatterns.get('fetch')).toBeDefined();
    });
}); 