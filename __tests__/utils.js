function createTestEntry(overrides = {}) {
    return {
        level: 'INFO',
        message: 'Test message',
        timestamp: new Date().toISOString(),
        data: {},
        context: {
            runtime: 'edge',
            environment: 'test',
            namespace: 'test'
        },
        ...overrides
    };
}

function createTestError(message = 'Test error') {
    return new Error(message);
}

module.exports = {
    createTestEntry,
    createTestError
};
