import type { DynamicModule } from '../types/extension';

/**
 * Safely import a module dynamically with proper typing
 * @param modulePath The module path to import
 * @returns A promise that resolves to the imported module
 * @throws Error if the module cannot be imported
 */
export async function importModule<T>(modulePath: string): Promise<T> {
    try {
        // Using import() directly is safer than Function constructor
        // and is properly analyzed by TypeScript
        const module = await import(modulePath) as DynamicModule<T>;
        return module as unknown as T;
    } catch (err) {
        const error = err instanceof Error ? err : new Error(`Failed to import module: ${modulePath}`);
        throw error;
    }
}

/**
 * Try to import a module from multiple possible paths
 * @param modulePaths Array of possible module paths to try
 * @param errorMessage Custom error message if all imports fail
 * @returns A promise that resolves to the first successfully imported module
 * @throws Error if none of the modules can be imported
 */
export async function tryImportModules<T>(
    modulePaths: readonly string[],
    errorMessage: string
): Promise<T> {
    const errors: Error[] = [];

    for (const path of modulePaths) {
        try {
            return await importModule<T>(path);
        } catch (err) {
            errors.push(err instanceof Error ? err : new Error(`Failed to import module: ${path}`));
        }
    }

    const error = new Error(errorMessage);
    error.cause = errors;
    throw error;
} 