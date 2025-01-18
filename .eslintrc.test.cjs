module.exports = {
    root: true,
    env: {
        es2022: true,
        node: true,
        browser: true,
        jest: true,
    },
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        project: ['./tsconfig.json'],
        tsconfigRootDir: __dirname,
        ecmaFeatures: {
            jsx: true,
        },
    },
    settings: {
        react: {
            version: '18.2.0',
            runtime: 'automatic',
        },
    },
    plugins: ['@typescript-eslint', 'react'],
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:@typescript-eslint/recommended-requiring-type-checking',
        'plugin:react/recommended',
        'plugin:react/jsx-runtime',
    ],
    rules: {
        '@typescript-eslint/no-floating-promises': 'error',
        '@typescript-eslint/explicit-function-return-type': ['warn', {
            allowExpressions: true,
            allowTypedFunctionExpressions: true,
            allowHigherOrderFunctions: true,
        }],
        '@typescript-eslint/no-explicit-any': 'error',
        '@typescript-eslint/no-unused-vars': ['warn', {
            argsIgnorePattern: '^_',
            varsIgnorePattern: '^(_|React$)',
        }],
        'no-undef': 'off', // TypeScript handles this
        'react/prop-types': 'off', // TypeScript handles this
        'react/react-in-jsx-scope': 'off', // Not needed with React 17+
        'react/jsx-uses-react': 'off', // Not needed with React 17+
        'react/jsx-filename-extension': ['error', { extensions: ['.tsx'] }],
    },
}; 