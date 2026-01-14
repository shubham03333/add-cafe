'use client';

import { useState, useEffect } from 'react';

export const useOfflineStatus = () => {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      console.log('Connection restored');
    };

    const handleOffline = () => {
      setIsOffline(true);
      console.log('Connection lost');
    };

    // Set initial status - check if navigator is available
    if (typeof navigator !== 'undefined') {
      setIsOffline(!navigator.onLine);
    }

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOffline;
};
