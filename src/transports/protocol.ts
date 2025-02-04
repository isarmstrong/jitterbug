/*
 * Transport Protocol Types
 * This file defines the types for transport protocols used across the package.
 */

export interface TransportProtocol {
    protocol: string;         // Name or identifier of the protocol
    version?: string;         // Optional version of the protocol
    options?: Record<string, unknown>;  // Additional protocol options
} 