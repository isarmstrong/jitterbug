module.exports = {
    root: true,
    env: {
        es2022: true,
        node: true,
        browser: true,
    },
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:@typescript-eslint/recommended-requiring-type-checking',
        'plugin:import/recommended',
        'plugin:import/typescript',
        'plugin:react/recommended',
        'plugin:react-hooks/recommended',
        'plugin:prettier/recommended',
    ],
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        project: ['./tsconfig.json', './tsconfig.gui.json'],
        tsconfigRootDir: __dirname,
        ecmaFeatures: {
            jsx: true,
        },
    },
    plugins: ['@typescript-eslint', 'import', 'react', 'react-hooks'],
    rules: {
        '@typescript-eslint/no-explicit-any': 'warn',
        'import/no-unresolved': 'error',
        '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
        '@typescript-eslint/no-misused-promises': [
            'error',
            {
                checksVoidReturn: false,
            },
        ],
        'react/react-in-jsx-scope': 'off', // Not needed in Next.js
        '@typescript-eslint/require-await': 'warn', // Downgrade to warning since some async methods are interface requirements
    },
    settings: {
        'import/parsers': {
            '@typescript-eslint/parser': ['.ts', '.tsx']
        },
        'import/resolver': {
            typescript: {
                alwaysTryTypes: true,
                project: ['./tsconfig.json', './tsconfig.gui.json']
            },
            node: true
        },
        react: {
            version: 'detect'
        }
    },
    ignorePatterns: [
        'dist/**/*',
        'node_modules/**/*',
        'coverage/**/*',
        '**/*.js',
        '**/*.cjs',
        '**/*.mjs',
        '**/*.json'
    ]
} 