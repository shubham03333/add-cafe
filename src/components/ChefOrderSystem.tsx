'use client';

import React, { useEffect, useState } from 'react';
import { Order } from '@/types';
import { Clock } from 'lucide-react';
import Image from 'next/image';

const ChefOrderSystem = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch orders for chefs with real-time updates
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await fetch('/api/orders/chef');
        if (!response.ok) throw new Error('Failed to fetch orders');
        const data = await response.json();
        setOrders(data);
      } catch (err) {
        setError('Failed to load orders');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
    
    // Set up polling for real-time updates
    const pollingInterval = setInterval(() => {
      fetchOrders();
    }, 4000); // Poll every 3 seconds
    
    // Clean up interval on component unmount
    return () => clearInterval(pollingInterval);
  }, []);

  const updateStockDirectly = async (itemId: number, quantity: number) => {
    try {
      const response = await fetch('/api/inventory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([{ id: itemId, quantity, action: 'subtract' }])
      });

      if (!response.ok) throw new Error('Failed to update stock');
      
      console.log(`Stock decreased successfully for item ID: ${itemId} by ${quantity}`);
    } catch (err) {
      console.error('Error updating stock:', err);
      throw err;
    }
  };

  const markAsPrepared = async (orderId: string) => {
    try {
      const orderToPrepare = orders.find(order => order.id === orderId);
      if (!orderToPrepare) throw new Error('Order not found');

      // Decrease stock for each item in the order
      for (const item of orderToPrepare.items) {
        await updateStockDirectly(item.id, item.quantity);
      }

      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ready' })
      });

      if (!response.ok) throw new Error('Failed to update order status');
      setOrders(prevOrders => prevOrders.filter(order => order.id !== orderId));
    } catch (err) {
      setError('Failed to mark order as prepared');
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="text-center">
          <img src="/logo.png" alt="Logo" className="w-12 h-12 mx-auto mb-4 animate-pulse" />
          <div className="text-gray-700">Loading orders...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="text-center text-red-600">
          <div className="text-xl font-bold mb-2">Error</div>
          <div>{error}</div>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded w-full sm:w-auto"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-3 sm:p-4 max-w-md mx-auto">
      {/* Header */}
      <div className="bg-red-600 rounded-lg shadow-lg p-3 sm:p-4 mb-3 sm:mb-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="Cafe Adda Logo"
              width={55}
              height={55}
              className="rounded-lg"
            />
            <h1 className="text-lg sm:text-xl font-bold text-white">Chef Dash.</h1>
          </div>
          <a 
            href="/dashbord"
            target="_blank" 
            className="px-2 py-1 sm:px-3 sm:py-1 bg-red-700 text-white rounded text-xs sm:text-sm hover:bg-red-800 transition-colors whitespace-nowrap"
          >
            View Dash
          </a>
        </div>
      </div>

      {/* Orders Queue */}
      <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4">
        <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2 text-sm sm:text-base">
          <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
          Order Queue ({orders.length})
        </h2>
        
        {orders.length === 0 ? (
          <div className="text-center py-6 sm:py-8 text-gray-500">
            <Clock className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 opacity-50" />
            <div className="text-sm sm:text-base">No orders in queue</div>
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {orders.map(order => (
              <div key={order.id} className="p-3 sm:p-4 rounded-lg border-l-4 border-orange-600 bg-orange-100 shadow-md transition-shadow hover:shadow-lg">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-orange-800" />
                    <span className="font-bold text-base sm:text-lg text-orange-900">#{order.order_number}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-sm sm:text-base text-orange-900">₹{order.total}</div>
                    {order.customer_name ? (
                      <div className="text-xs font-semibold text-orange-800">{order.customer_name}</div>
                    ) : null}
                  </div>
                </div>
                
                <div className="mb-2 sm:mb-3">
                  {order.items.map(item => (
                    <div key={item.id} className="flex justify-between items-center text-xs sm:text-sm text-orange-800 py-1">
                      <span className="truncate">{item.quantity}x {item.name}</span>
                    </div>
                  ))}
                </div>
                
                <button
                  onClick={() => markAsPrepared(order.id)}
                  className="w-full py-2 sm:py-2 bg-green-600 hover:bg-green-700 text-white rounded font-medium transition-colors text-sm sm:text-base touch-manipulation"
                  style={{ minHeight: '44px' }} // Minimum touch target size for mobile
                >
                  ✅ Mark as Prepared
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChefOrderSystem;
