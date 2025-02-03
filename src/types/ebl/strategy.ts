/* ====================================================================
 * EBL1: Validation Strategy Hierarchy
 * ====================================================================
 *
 * This module defines the hierarchy of validation strategies for the Edge Boundary Layer.
 */

import type { EdgeBoundaryLayer, TelemetryHandler } from './core.js';

export interface ValidationStrategy extends EdgeBoundaryLayer {
    /**
     * Returns the priority of this validation strategy. Lower numbers indicate higher precedence.
     */
    getPriority(): number;
}

export abstract class BaseValidationStrategy implements ValidationStrategy {
    protected telemetryHandler?: TelemetryHandler;

    abstract getPriority(): number;

    validate<T>(input: T): boolean {
        return true;
    }

    process<T>(input: T): T {
        return input;
    }

    setTelemetryHandler(handler: TelemetryHandler): void {
        this.telemetryHandler = handler;
    }

    clearCache(): void {
        // Optional implementation
    }
}

export class StrictValidationStrategy extends BaseValidationStrategy {
    getPriority(): number {
        return 1;
    }
}

export class LenientValidationStrategy extends BaseValidationStrategy {
    getPriority(): number {
        return 2;
    }
} 