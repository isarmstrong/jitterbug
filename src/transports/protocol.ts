/*
 * Transport Protocol Types
 * This file defines the types for transport protocols used across the package.
 */

import type { ValidationResult } from '../types/ebl/core';
import { isBoolean, isNumber, isObject, isString } from '../utils/validation';

export enum ProtocolVersion {
    V1 = '1.0',
    V2 = '2.0'
}

export interface StreamConfig {
    /** Maximum chunk size in bytes */
    maxChunkSize: number;
    /** Chunk encoding format */
    encoding: 'json' | 'msgpack';
    /** Stream compression */
    compression?: 'gzip' | 'br' | 'deflate';
}

export interface ProtocolOptions {
    /** Maximum payload size in bytes */
    maxPayloadSize?: number;
    /** Timeout in milliseconds */
    timeout?: number;
    /** Whether to enable compression */
    compression?: boolean;
    /** Custom headers */
    headers?: Record<string, string>;
    /** Stream configuration */
    stream?: StreamConfig;
    /** Retry configuration */
    retry?: {
        /** Maximum number of retries */
        maxRetries: number;
        /** Base delay between retries in milliseconds */
        baseDelay: number;
        /** Maximum delay between retries in milliseconds */
        maxDelay: number;
    };
}

export interface TransportProtocol {
    /** Name or identifier of the protocol */
    protocol: string;
    /** Version of the protocol */
    version: ProtocolVersion;
    /** Additional protocol options */
    options?: ProtocolOptions;
}

export interface StreamingProtocol extends TransportProtocol {
    /** Stream configuration is required for streaming protocols */
    options: Required<Pick<ProtocolOptions, 'stream'>>;
}

export interface ProtocolValidation {
    /** Validates protocol configuration */
    validateProtocol(protocol: TransportProtocol): ValidationResult;
    /** Validates protocol version compatibility */
    validateVersion(version: ProtocolVersion): ValidationResult;
    /** Validates protocol options */
    validateOptions(options: ProtocolOptions): ValidationResult;
}

export interface ProtocolMetrics {
    /** Number of successful transmissions */
    successCount: number;
    /** Number of failed transmissions */
    failureCount: number;
    /** Average payload size in bytes */
    avgPayloadSize: number;
    /** Maximum payload size seen */
    maxPayloadSize: number;
    /** Protocol version in use */
    protocolVersion: ProtocolVersion;
    /** Last error message if any */
    lastError?: string;
    /** Stream metrics if streaming is enabled */
    streamMetrics?: {
        /** Total chunks processed */
        totalChunks: number;
        /** Average chunk size */
        avgChunkSize: number;
        /** Maximum chunk size seen */
        maxChunkSize: number;
        /** Compression ratio if compression enabled */
        compressionRatio?: number;
    };
    /** Retry metrics */
    retryMetrics?: {
        /** Total number of retries */
        totalRetries: number;
        /** Average retry count per operation */
        avgRetries: number;
        /** Maximum retries for a single operation */
        maxRetries: number;
        /** Number of operations that succeeded after retry */
        retriedSuccesses: number;
    };
}

export class ProtocolValidator implements ProtocolValidation {
    private readonly defaultMaxPayloadSize = 5 * 1024 * 1024; // 5MB
    private readonly defaultTimeout = 30000; // 30 seconds
    private readonly defaultRetryConfig = {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 10000
    };

    validateProtocol(protocol: TransportProtocol): ValidationResult {
        if (!isObject(protocol)) {
            return {
                isValid: false,
                errors: ['Protocol must be an object']
            };
        }

        if (!isString(protocol.protocol)) {
            return {
                isValid: false,
                errors: ['Protocol identifier must be a string']
            };
        }

        if (!Object.values(ProtocolVersion).includes(protocol.version)) {
            return {
                isValid: false,
                errors: ['Invalid protocol version']
            };
        }

        if (protocol.options) {
            return this.validateOptions(protocol.options);
        }

        return { isValid: true };
    }

    validateVersion(version: ProtocolVersion): ValidationResult {
        if (!Object.values(ProtocolVersion).includes(version)) {
            return {
                isValid: false,
                errors: [`Invalid version: ${version}. Expected one of: ${Object.values(ProtocolVersion).join(', ')}`]
            };
        }
        return { isValid: true };
    }

    validateOptions(options: ProtocolOptions): ValidationResult {
        if (!isObject(options)) {
            return {
                isValid: false,
                errors: ['Options must be an object']
            };
        }

        const errors: string[] = [];

        if (options.maxPayloadSize !== undefined) {
            if (!isNumber(options.maxPayloadSize) || options.maxPayloadSize <= 0) {
                errors.push('maxPayloadSize must be a positive number');
            } else if (options.maxPayloadSize > this.defaultMaxPayloadSize) {
                errors.push(`maxPayloadSize cannot exceed ${this.defaultMaxPayloadSize} bytes`);
            }
        }

        if (options.timeout !== undefined) {
            if (!isNumber(options.timeout) || options.timeout <= 0) {
                errors.push('timeout must be a positive number');
            } else if (options.timeout > this.defaultTimeout) {
                errors.push(`timeout cannot exceed ${this.defaultTimeout}ms`);
            }
        }

        if (options.compression !== undefined && !isBoolean(options.compression)) {
            errors.push('compression must be a boolean');
        }

        if (options.headers !== undefined) {
            if (!isObject(options.headers)) {
                errors.push('headers must be a record of string key-value pairs');
            } else {
                for (const [key, value] of Object.entries(options.headers)) {
                    if (!isString(key) || !isString(value)) {
                        errors.push('all header keys and values must be strings');
                        break;
                    }
                }
            }
        }

        if (options.stream !== undefined) {
            if (!isObject(options.stream)) {
                errors.push('stream must be an object');
            } else {
                const { maxChunkSize, encoding, compression } = options.stream;

                if (!isNumber(maxChunkSize) || maxChunkSize <= 0) {
                    errors.push('stream.maxChunkSize must be a positive number');
                }

                if (!['json', 'msgpack'].includes(encoding)) {
                    errors.push('stream.encoding must be either "json" or "msgpack"');
                }

                if (compression !== undefined && !['gzip', 'br', 'deflate'].includes(compression)) {
                    errors.push('stream.compression must be one of: gzip, br, deflate');
                }
            }
        }

        if (options.retry !== undefined) {
            if (!isObject(options.retry)) {
                errors.push('retry must be an object');
            } else {
                const retry = options.retry;

                if (!isNumber(retry.maxRetries) || retry.maxRetries < 0 || !Number.isInteger(retry.maxRetries)) {
                    errors.push('retry.maxRetries must be a non-negative integer');
                }

                if (!isNumber(retry.baseDelay) || retry.baseDelay < 0) {
                    errors.push('retry.baseDelay must be a non-negative number');
                }

                if (!isNumber(retry.maxDelay) || retry.maxDelay < retry.baseDelay) {
                    errors.push('retry.maxDelay must be a number greater than or equal to baseDelay');
                }
            }
        }

        return {
            isValid: errors.length === 0,
            errors: errors.length > 0 ? errors : undefined,
            metadata: {
                defaultsApplied: !options.maxPayloadSize || !options.timeout || !options.retry
            }
        };
    }
} 