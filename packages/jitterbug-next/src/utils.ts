import { Environment, Runtime } from '@isarmstrong/jitterbug';

/**
 * Detects the Next.js runtime environment (browser, edge, or nodejs)
 */
export function detectNextRuntime(): typeof Runtime[keyof typeof Runtime] {
    // Check for browser environment first
    if (typeof window !== 'undefined') {
        return Runtime.BROWSER;
    }

    // Check for edge runtime
    if (typeof EdgeRuntime !== 'undefined') {
        return Runtime.EDGE;
    }

    // Default to Node.js runtime
    return Runtime.NODE;
}

/**
 * Detects the Next.js environment (development, test, or production)
 */
export function detectNextEnvironment(): typeof Environment[keyof typeof Environment] {
    // Check for test environment first
    if (process.env.NODE_ENV === 'test') {
        return Environment.TEST;
    }

    // Check for development environment
    if (process.env.NODE_ENV === 'development') {
        return Environment.DEVELOPMENT;
    }

    // Default to production
    return Environment.PRODUCTION;
}

/**
 * Checks if the current environment is Next.js 15 or higher
 * This is determined by checking for the existence of req.signal
 */
export function isNext15Plus(): boolean {
    try {
        // Check for Next.js version in package.json
        const nextVersion = process.env.NEXT_VERSION || '';
        const majorVersion = parseInt(nextVersion.split('.')[0], 10);
        return !isNaN(majorVersion) && majorVersion >= 15;
    } catch {
        // If we can't determine the version, we'll rely on feature detection
        return true; // Default to true as most modern Next.js apps will be 15+
    }
} 