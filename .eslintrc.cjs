module.exports = {
    root: true,
    env: {
        es2022: true,
        node: true,
        browser: true,
    },
    parser: '@typescript-eslint/parser',
    parserOptions: {
        project: ['./tsconfig.json', './tsconfig.gui.json'],
        tsconfigRootDir: __dirname,
        sourceType: 'module',
        ecmaVersion: 2022,
    },
    plugins: ['@typescript-eslint', 'prettier'],
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:@typescript-eslint/recommended-requiring-type-checking',
        'prettier',
    ],
    rules: {
        '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
        '@typescript-eslint/require-await': 'off',
        '@typescript-eslint/no-floating-promises': 'error',
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'warn',
        '@typescript-eslint/no-unsafe-call': 'warn',
        '@typescript-eslint/no-unsafe-return': 'warn',
        '@typescript-eslint/no-var-requires': 'warn',
        'no-undef': 'off',
    },
    ignorePatterns: ['__tests__/**/*', '*.config.ts'],
}; 