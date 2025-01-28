'use server';

import { logger } from '../lib/logger';

export async function triggerServerError() {
    logger.error('Server error triggered', new Error('This is a test server error'));
    throw new Error('Server error triggered');
} 