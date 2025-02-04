/* ====================================================================
 * EBL1: Core Validation Layer Interface
 * ====================================================================
*/

// Add TelemetryHandler type alias
// Define TelemetryHandler to handle telemetry events with an event name and associated data
export type TelemetryHandler = (event: string, data: unknown) => void;

// Define validation result type
export type ValidationResult = {
    isValid: boolean;
    errors?: string[];
    metadata?: Record<string, unknown>;
};

// EdgeBoundaryLayer: Interface for the core validation layer.
export interface EdgeBoundaryLayer {
    /**
     * Validates the provided input using the core validation logic.
     * @param input The input to validate, of generic type T. Defaults to unknown if not specified.
     * @returns A ValidationResult object containing validation status and any errors
     */
    validate<T = unknown>(input: T): ValidationResult;

    /**
     * Processes the input and returns the processed value.
     * @param input The input of generic type T. Defaults to unknown if not specified.
     * @returns The processed value of type T
     */
    process<T = unknown>(input: T): T;

    /**
     * Sets the telemetry handler. Accepts a TelemetryHandler or undefined to clear the handler.
     * @param handler The telemetry handler to set.
     */
    setTelemetryHandler(handler: TelemetryHandler | undefined): void;

    /**
     * Optionally clears any cached validation results.
     */
    clearCache?(): void;
}

// Implementation of the EdgeBoundaryLayer interface
export class CoreValidationLayer implements EdgeBoundaryLayer {
    protected telemetryHandler?: TelemetryHandler;
    private _results: Map<object, ValidationResult> = new Map();

    validate<T>(input: T): ValidationResult {
        // Handle null or undefined input
        if (input == null) {
            return { isValid: false, errors: ['Input cannot be null or undefined'] };
        }

        // Check cache for object inputs
        if (typeof input === 'object') {
            const cached = this._results.get(input);
            if (cached !== undefined) {
                return cached;
            }
        }

        // Placeholder validation - replace with actual validation logic
        const result: ValidationResult = { isValid: true };

        // Cache result for object inputs
        if (typeof input === 'object') {
            this._results.set(input, result);
        }

        return result;
    }

    process<T>(input: T): T {
        if (!this.validate(input).isValid) {
            throw new Error('Cannot process invalid input');
        }
        return input;
    }

    setTelemetryHandler(handler: TelemetryHandler | undefined): void {
        this.telemetryHandler = handler;
    }

    clearCache(): void {
        this._results.clear();
    }

    reportError(error: Error): void {
        if (this.telemetryHandler) {
            this.telemetryHandler('error', { message: error.message });
        }
    }

    // --- Telemetry Hooks ---
    protected hookTelemetry(event: string, payload?: Record<string, unknown>): void {
        if (this.telemetryHandler) {
            this.telemetryHandler(event, payload);
        }
    }

    reportToSentry?(error: Error): void {
        // Implement when Sentry integration is added
        this.hookTelemetry('sentry_error', {
            message: error.message,
            stack: error.stack
        });
    }

    private reportTelemetry(event: string, data?: Record<string, unknown>): void {
        if (this.telemetryHandler) {
            this.telemetryHandler(event, data);
        } else {
            console.log('Telemetry:', event, data);
        }
    }
} 