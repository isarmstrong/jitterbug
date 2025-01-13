const { describe, it, expect, vi, beforeEach } = require('vitest');
const { GuiTransport } = require('../../src/transports/gui');
const { createTestEntry } = require('../utils');
const React = require('react');
const { render, screen, fireEvent } = require('@testing-library/react');

describe('GuiTransport', () => {
    let transport;
    let container;

    beforeEach(() => {
        transport = new GuiTransport({
            maxEntries: 100,
            filterLevel: 'INFO'
        });
        container = document.createElement('div');
        document.body.appendChild(container);
        vi.clearAllMocks();
    });

    afterEach(() => {
        document.body.removeChild(container);
        transport.destroy();
    });

    describe('Basic Transport', () => {
        it('should initialize with config', () => {
            expect(transport.maxEntries).toBe(100);
            expect(transport.filterLevel).toBe('INFO');
        });

        it('should render log entries', async () => {
            const entry = createTestEntry({
                message: 'Test GUI Message',
                level: 'INFO'
            });

            await transport.log(entry);
            render(<transport.LogViewer />, { container });

            expect(screen.getByText('Test GUI Message')).toBeInTheDocument();
        });

        it('should respect max entries', async () => {
            const entries = Array(150).fill(null).map((_, i) =>
                createTestEntry({ message: `Entry ${i}` })
            );

            for (const entry of entries) {
                await transport.log(entry);
            }

            render(<transport.LogViewer />, { container });
            const logEntries = screen.getAllByRole('listitem');
            expect(logEntries.length).toBe(100);
        });
    });

    describe('Filtering', () => {
        it('should filter by log level', async () => {
            const entries = [
                createTestEntry({ level: 'DEBUG', message: 'Debug message' }),
                createTestEntry({ level: 'INFO', message: 'Info message' }),
                createTestEntry({ level: 'ERROR', message: 'Error message' })
            ];

            for (const entry of entries) {
                await transport.log(entry);
            }

            render(<transport.LogViewer />, { container });

            const filterSelect = screen.getByLabelText('Log Level');
            fireEvent.change(filterSelect, { target: { value: 'ERROR' } });

            expect(screen.queryByText('Debug message')).not.toBeInTheDocument();
            expect(screen.queryByText('Info message')).not.toBeInTheDocument();
            expect(screen.getByText('Error message')).toBeInTheDocument();
        });

        it('should filter by search text', async () => {
            const entries = [
                createTestEntry({ message: 'First test message' }),
                createTestEntry({ message: 'Second test message' }),
                createTestEntry({ message: 'Different message' })
            ];

            for (const entry of entries) {
                await transport.log(entry);
            }

            render(<transport.LogViewer />, { container });

            const searchInput = screen.getByPlaceholderText('Search logs...');
            fireEvent.change(searchInput, { target: { value: 'test' } });

            expect(screen.getByText('First test message')).toBeInTheDocument();
            expect(screen.getByText('Second test message')).toBeInTheDocument();
            expect(screen.queryByText('Different message')).not.toBeInTheDocument();
        });
    });

    describe('UI Interactions', () => {
        it('should expand log details on click', async () => {
            const entry = createTestEntry({
                message: 'Expandable message',
                data: { details: 'Extra information' }
            });

            await transport.log(entry);
            render(<transport.LogViewer />, { container });

            const logEntry = screen.getByText('Expandable message');
            fireEvent.click(logEntry);

            expect(screen.getByText('Extra information')).toBeInTheDocument();
        });

        it('should clear logs when clear button is clicked', async () => {
            const entries = Array(5).fill(null).map((_, i) =>
                createTestEntry({ message: `Entry ${i}` })
            );

            for (const entry of entries) {
                await transport.log(entry);
            }

            render(<transport.LogViewer />, { container });
            const clearButton = screen.getByText('Clear');
            fireEvent.click(clearButton);

            expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
        });
    });

    describe('Performance', () => {
        it('should handle rapid log updates', async () => {
            const entries = Array(1000).fill(null).map((_, i) =>
                createTestEntry({ message: `Rapid Entry ${i}` })
            );

            render(<transport.LogViewer />, { container });

            for (const entry of entries) {
                await transport.log(entry);
            }

            expect(screen.getAllByRole('listitem').length).toBe(100);
            expect(screen.getByText('Rapid Entry 999')).toBeInTheDocument();
        });

        it('should debounce search updates', async () => {
            const entries = Array(100).fill(null).map((_, i) =>
                createTestEntry({ message: `Entry ${i}` })
            );

            for (const entry of entries) {
                await transport.log(entry);
            }

            render(<transport.LogViewer />, { container });
            const searchInput = screen.getByPlaceholderText('Search logs...');

            // Rapid search updates
            fireEvent.change(searchInput, { target: { value: 'Entry 1' } });
            fireEvent.change(searchInput, { target: { value: 'Entry 12' } });
            fireEvent.change(searchInput, { target: { value: 'Entry 123' } });

            // Wait for debounce
            await new Promise(resolve => setTimeout(resolve, 300));

            expect(screen.getByText('Entry 123')).toBeInTheDocument();
        });
    });

    describe('Error Handling', () => {
        it('should handle malformed entries gracefully', async () => {
            const malformedEntry = {
                message: 'Malformed entry'
                // Missing required fields
            };

            await transport.log(malformedEntry);
            render(<transport.LogViewer />, { container });

            expect(screen.getByText('Malformed entry')).toBeInTheDocument();
            expect(screen.getByText('Invalid log entry format')).toBeInTheDocument();
        });

        it('should handle render errors', async () => {
            const entry = createTestEntry({
                data: {
                    circular: {}
                }
            });
            entry.data.circular.self = entry.data.circular;

            await transport.log(entry);
            render(<transport.LogViewer />, { container });

            expect(screen.getByText('Error rendering log entry')).toBeInTheDocument();
        });
    });
});
