'use client';

import { useEffect } from 'react';

/**
 * Global AbortError Suppressor Component
 * Prevents harmless browser request cancellation AbortErrors (e.g. map tile zoom cancels, API timeouts)
 * from triggering Next.js 16 Turbopack dev runtime error overlays.
 */
export function AbortErrorSuppressor() {
  useEffect(() => {
    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      if (
        reason &&
        (reason.name === 'AbortError' ||
          reason.message?.includes('aborted') ||
          reason.message?.includes('The user aborted a request') ||
          reason.toString?.().includes('AbortError'))
      ) {
        event.preventDefault();
      }
    };

    const handleError = (event: ErrorEvent) => {
      if (
        event.message?.includes('AbortError') ||
        event.message?.includes('aborted') ||
        event.message?.includes('The user aborted a request')
      ) {
        event.preventDefault();
      }
    };

    window.addEventListener('unhandledrejection', handleRejection);
    window.addEventListener('error', handleError);

    return () => {
      window.removeEventListener('unhandledrejection', handleRejection);
      window.removeEventListener('error', handleError);
    };
  }, []);

  return null;
}
