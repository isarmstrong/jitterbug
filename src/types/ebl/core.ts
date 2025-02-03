export interface EdgeBoundaryLayer {
    // Basic error reporting
    reportError(error: Error): void;
    // Optional Sentry integration
    reportToSentry?(error: Error): void;
}

export class CoreValidationLayer implements EdgeBoundaryLayer {
    constructor(private telemetryHook?: (event: string, data?: any) => void) { }

    reportError(error: Error): void {
        this.reportTelemetry('error', { error });
    }

    reportToSentry?(error: Error): void {
        // Implement when Sentry integration is added
    }

    private reportTelemetry(event: string, data?: any): void {
        if (this.telemetryHook) {
            this.telemetryHook(event, data);
        } else {
            console.log('Telemetry:', event, data);
        }
    }
} 