'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import CafeOrderSystem from '@/components/CafeOrderSystem';
import { ThemeProvider } from '@/contexts/ThemeContext';

export default function DashboardPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const userRole = localStorage.getItem('userRole');

    if (isLoggedIn === 'true' && userRole === 'dashboard') {
      setIsAuthenticated(true);
    } else {
      router.push('/login');
    }
    setIsLoading(false);
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-3" />
          <p className="text-gray-600 text-sm">Opening Adda Cafe POS…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <ThemeProvider>
        <CafeOrderSystem />
      </ThemeProvider>
    </div>
  );
}
