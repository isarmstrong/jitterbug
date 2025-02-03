/* ====================================================================
 * EBL1: Core Validation Layer Interface
 * ====================================================================
*/

// TelemetryHandler: a function to capture validation events
export type TelemetryHandler = (event: string, data?: Record<string, unknown>) => void;

// EdgeBoundaryLayer: Interface for the core validation layer.
export interface EdgeBoundaryLayer {
    /**
     * Validates the input data.
     * @param input The data to validate.
     * @returns True if valid, false otherwise.
     */
    validate<T>(input: T): boolean;

    /**
     * Processes the input and returns validated output or throws an error if invalid.
     * @param input The data to process.
     * @returns Processed result meeting validation requirements.
     */
    process<T>(input: T): T;

    /**
     * Sets a telemetry handler to capture validation events.
     * @param handler A function to handle telemetry events.
     */
    setTelemetryHandler(handler: TelemetryHandler): void;

    /**
     * Optionally clears any cached validation results.
     */
    clearCache?(): void;
}

// Implementation of the EdgeBoundaryLayer interface
export class CoreValidationLayer implements EdgeBoundaryLayer {
    protected telemetryHandler?: TelemetryHandler;
    private _results = new Map<any, boolean>();

    validate<T>(input: T): boolean {
        if (typeof input === 'object' && input !== null) {
            const cached = this._results.get(input);
            if (cached !== undefined) {
                return cached;
            }
        }
        const result = true;  // Placeholder validation
        if (typeof input === 'object' && input !== null) {
            this._results.set(input, result);
        }
        return result;
    }

    process<T>(input: T): T {
        return input;
    }

    setTelemetryHandler(handler: TelemetryHandler): void {
        this.telemetryHandler = handler;
    }

    clearCache(): void {
        this._results.clear();
    }

    reportError(error: Error): void {
        if (this.telemetryHandler) {
            this.telemetryHandler('error', { error });
        }
    }

    // --- Telemetry Hooks ---
    // Minimal telemetry hook: if a telemetry handler is set, send the event and payload
    protected hookTelemetry(event: string, payload?: any): void {
        if (this.telemetryHandler) {
            this.telemetryHandler(event, payload);
        }
    }

    reportToSentry?(error: Error): void {
        // Implement when Sentry integration is added
    }

    private reportTelemetry(event: string, data?: any): void {
        if (this.telemetryHandler) {
            this.telemetryHandler(event, data);
        } else {
            console.log('Telemetry:', event, data);
        }
    }
} 