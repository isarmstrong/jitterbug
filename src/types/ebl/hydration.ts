/**
 * EBL4: Hydration Layer
 * 
 * Provides SSR hydration type checks and state reconciliation mechanisms.
 * 
 * Tasks:
 * - Add hydration type checks: Validate that a hydration state has the expected shape.
 * - Implement state reconciliation: Merge or reconcile server and client hydration states.
 * - Create mismatch detection: Identify differences between server and client states.
 */

export type HydrationState = Record<string, unknown>;

export interface HydrationLayer {
    /**
     * Validates the hydration state.
     * @param state - The hydration state to validate.
     * @returns A boolean indicating whether the state is valid.
     */
    validateHydrationState(state: unknown): boolean;

    /**
     * Reconciles server and client hydration states.
     * @param serverState - The state from the server side.
     * @param clientState - The state from the client side.
     * @returns The reconciled state.
     */
    reconcileState(serverState: HydrationState, clientState: HydrationState): HydrationState;

    /**
     * Detects mismatches between server and client hydration states.
     * @param serverState - The hydration state from the server.
     * @param clientState - The hydration state from the client.
     * @returns A message describing the mismatch or null if none found.
     */
    detectMismatch(serverState: HydrationState, clientState: HydrationState): string | null;
}

/**
 * A default implementation of the HydrationLayer interface.
 */
export class DefaultHydrationLayer implements HydrationLayer {
    validateHydrationState(state: unknown): boolean {
        // Basic type check: ensure state is a non-null object
        return state !== null && typeof state === 'object';
    }

    reconcileState(serverState: HydrationState, clientState: HydrationState): HydrationState {
        // Basic reconciliation: merge states (client overrides server)
        return { ...serverState, ...clientState };
    }

    detectMismatch(serverState: HydrationState, clientState: HydrationState): string | null {
        // Detect keys present in one state but not the other
        const serverKeys = Object.keys(serverState);
        const clientKeys = Object.keys(clientState);
        const missingInClient = serverKeys.filter(key => !(key in clientState));
        const extraInClient = clientKeys.filter(key => !(key in serverState));

        if (missingInClient.length || extraInClient.length) {
            return `Mismatch detected. Missing in client: ${missingInClient.join(", ") || 'none'}. Extra in client: ${extraInClient.join(", ") || 'none'}.`;
        }

        return null;
    }
} 