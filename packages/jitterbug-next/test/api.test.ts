import { describe, it, expect } from 'vitest';
import { createLogHandler } from '../src/api';

describe('createLogHandler', () => {
    it('should handle POST requests', async () => {
        const { POST } = createLogHandler();
        const response = await POST(new Request('http://localhost', {
            method: 'POST',
            body: JSON.stringify([{ message: 'test' }])
        }));

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ success: true });
    });

    it('should handle OPTIONS requests', async () => {
        const { OPTIONS } = createLogHandler();
        const response = await OPTIONS();

        expect(response.status).toBe(204);
    });

    it('should add CORS headers when enabled', async () => {
        const { POST } = createLogHandler({ cors: true });
        const response = await POST(new Request('http://localhost', {
            method: 'POST',
            body: JSON.stringify([{ message: 'test' }])
        }));

        expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
        expect(response.headers.get('Access-Control-Allow-Methods')).toBe('POST, OPTIONS, HEAD');
    });

    it('should call custom log processor', async () => {
        let processed = false;
        const { POST } = createLogHandler({
            processLogs: () => {
                processed = true;
            }
        });

        await POST(new Request('http://localhost', {
            method: 'POST',
            body: JSON.stringify([{ message: 'test' }])
        }));

        expect(processed).toBe(true);
    });

    it('should handle errors', async () => {
        const { POST } = createLogHandler();
        const response = await POST(new Request('http://localhost', {
            method: 'POST',
            body: 'invalid json'
        }));

        expect(response.status).toBe(500);
        expect(await response.json()).toHaveProperty('error');
    });
}); 