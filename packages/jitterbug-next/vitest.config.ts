import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['test/**/*.test.ts', '../../__tests__/**/*.test.ts'],
    },
    resolve: {
        alias: {
            '@core': '../../src/types',
            '@transports': '../../src/transports',
            '@processors': '../../src/processors',
            '@utils': '../../src/utils'
        }
    }
}); 