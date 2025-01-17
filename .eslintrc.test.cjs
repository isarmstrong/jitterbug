module.exports = {
    root: false,
    env: {
        es2022: true,
        node: true,
        browser: true,
        jest: true,
    },
    parser: 'espree',
    parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
    },
    extends: ['eslint:recommended'],
    rules: {
        'no-undef': 'off',
        'no-unused-vars': 'warn',
    },
}; 