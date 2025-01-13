import { describe, it, beforeEach, expect } from 'vitest';
import { createJitterbug } from '../../src/core';
import { LogLevels } from '../../src/types/enums';
import { MockProcessor, MockTransport } from './mocks';

describe('Component Debug Diagnostics', () => {
    let processor;
    let transport;
    let logger;

    beforeEach(() => {
        processor = new MockProcessor();
        transport = new MockTransport();
        logger = createJitterbug({
            namespace: 'component-debug',
            processors: [processor],
            transports: [transport]
        });
    });

    describe('NextUI Component Debugging', () => {
        it('should track render lifecycle', async () => {
            await logger.debug('Component render cycle', {
                component: 'DataTable',
                phase: 'mount',
                duration: 150,
                hydration: {
                    status: 'complete',
                    mismatch: false
                }
            });

            const entry = processor.entries[0];
            expect(entry.level).toBe(LogLevels.DEBUG);
            expect(entry.data.component).toBe('DataTable');
            expect(entry.data.phase).toBe('mount');
            expect(entry.data.hydration.status).toBe('complete');
        });

        it('should detect style system issues', async () => {
            const error = new Error('Theme token resolution failed');
            await logger.error('Style system error', error, {
                component: 'Button',
                theme: {
                    variant: 'solid',
                    color: 'primary',
                    radius: 'sm'
                },
                tokens: {
                    missing: ['colors.primary.500'],
                    fallback: 'colors.blue.500'
                }
            });

            const entry = processor.entries[0];
            expect(entry.level).toBe(LogLevels.ERROR);
            expect(entry.error).toBe(error);
            expect(entry.data.component).toBe('Button');
            expect(entry.data.tokens.missing).toContain('colors.primary.500');
        });
    });

    describe('Sanity Integration', () => {
        it('should track visual editor interactions', async () => {
            await logger.info('Visual editor update', {
                component: 'RichText',
                operation: 'insert',
                schema: {
                    type: 'block',
                    style: 'normal'
                },
                performance: {
                    parseTime: 50,
                    renderTime: 100
                }
            });

            const entry = processor.entries[0];
            expect(entry.level).toBe(LogLevels.INFO);
            expect(entry.data.component).toBe('RichText');
            expect(entry.data.operation).toBe('insert');
            expect(entry.data.performance.parseTime).toBe(50);
        });

        it('should handle template persistence errors', async () => {
            const error = new Error('Template validation failed');
            await logger.error('Template save failed', error, {
                component: 'PageBuilder',
                template: {
                    id: 'homepage',
                    version: 2,
                    validation: {
                        errors: ['Invalid component nesting'],
                        schema: 'v2.1'
                    }
                }
            });

            const entry = processor.entries[0];
            expect(entry.level).toBe(LogLevels.ERROR);
            expect(entry.error).toBe(error);
            expect(entry.data.template.validation.errors).toHaveLength(1);
        });
    });
}); 