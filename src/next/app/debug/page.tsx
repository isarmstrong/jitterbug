'use client';

import React, { useState } from 'react';
import { LogStream } from '../components/LogStream';
import { logger } from '../lib/logger';
import { triggerServerError } from './actions';

// Function to cause a type error
function causeTypeError(): never {
  // Using undefined to cause a type error
  const obj = undefined;
  // Using type assertion to force a type error
  void ((obj as unknown as { nonexistent: { property: string } }).nonexistent.property);
  throw new Error('This should never be reached');
}

export default function Home() {
  const [lastError, setLastError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleClientError = () => {
    try {
      causeTypeError();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setLastError(errorMessage);
      logger.error('Client-side error occurred', error instanceof Error ? error : new Error(errorMessage));
    }
  };

  const handlePromiseError = () => {
    new Promise<void>((_, reject) => {
      reject(new Error('Promised rejection'));
    }).catch(error => {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setLastError(errorMessage);
      logger.error('Promise rejection occurred', error instanceof Error ? error : new Error(errorMessage));
    });
  };

  const handleServerError = async () => {
    setIsLoading(true);
    try {
      await triggerServerError();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setLastError(errorMessage);
      logger.error('Server-side error occurred', error instanceof Error ? error : new Error(errorMessage));
    } finally {
      setIsLoading(false);
    }
  };

  // Enable debug mode in localStorage
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('jitterbug', '*');
      logger.info('Debug mode enabled in localStorage');
    }
  }, []);

  React.useEffect(() => {
    logger.info('Home page mounted');
    return () => {
      logger.info('Home page unmounted');
    };
  }, []);

  return (
    <main className="container mx-auto p-4">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-4">Error Testing</h1>
          <div className="space-y-8">
            <section className="space-y-4">
              <h2 className="text-xl">Client-side Errors</h2>
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleClientError}
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  Trigger Type Error
                </button>
                <button
                  onClick={handlePromiseError}
                  className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
                >
                  Trigger Promise Rejection
                </button>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl">Server-side Errors</h2>
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleServerError}
                  className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
                  disabled={isLoading}
                >
                  {isLoading ? 'Loading...' : 'Trigger Server Error'}
                </button>
              </div>
            </section>
          </div>

          {lastError && (
            <div className="mt-8 p-4 bg-gray-100 rounded">
              <h3 className="font-bold">Last Error:</h3>
              <pre className="mt-2 text-sm overflow-auto">{lastError}</pre>
            </div>
          )}
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-4">Live Log Stream</h2>
          <LogStream />
        </div>
      </div>
    </main>
  );
}
