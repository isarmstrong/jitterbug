import { describe, expect, it, vi } from 'vitest';
import { CoreValidationLayer } from '../../src/types/ebl/core';

describe('CoreValidationLayer', () => {
    it('validates input', () => {
        const layer = new CoreValidationLayer();
        expect(layer.validate({ test: 'data' }).isValid).toBe(true);
        expect(layer.validate('string').isValid).toBe(true);
        expect(layer.validate(123).isValid).toBe(true);
    });

    it('processes input', () => {
        const layer = new CoreValidationLayer();
        const input = { test: 'data' };
        expect(layer.process(input)).toBe(input);
    });

    it('handles telemetry', () => {
        const mockHandler = vi.fn();
        const layer = new CoreValidationLayer();
        layer.setTelemetryHandler(mockHandler);

        const error = new Error('test');
        layer.reportError(error);

        expect(mockHandler).toHaveBeenCalledWith('error', { message: error.message });
    });
}); 