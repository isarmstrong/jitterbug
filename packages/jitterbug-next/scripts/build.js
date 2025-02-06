import { build } from 'esbuild';
import { mkdir } from 'fs/promises';

async function buildCJS() {
    // Ensure dist directory exists
    await mkdir('dist', { recursive: true });

    const files = ['index.js', 'withJitterbug.js'];

    for (const file of files) {
        const result = await build({
            entryPoints: [`dist/${file}`],
            format: 'cjs',
            outfile: `dist/${file.replace('.js', '.cjs')}`,
            platform: 'node',
            target: 'node14',
            bundle: true,
            external: ['next', 'react', '@isarmstrong/*'],
        });

        if (result.errors.length > 0) {
            throw new Error(`Build failed: ${result.errors.join('\n')}`);
        }
    }
}

buildCJS().catch(console.error); 