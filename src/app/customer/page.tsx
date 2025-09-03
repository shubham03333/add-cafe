'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import CustomerOrderSystem from '@/components/CustomerOrderSystem';

export default function CustomerPage() {
  const { customer, loading } = useCustomerAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!loading && !customer) {
      router.push('/customer/login');
    }
  }, [customer, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!customer) {
    return null; // Will redirect to login
  }

  return <CustomerOrderSystem />;
}
