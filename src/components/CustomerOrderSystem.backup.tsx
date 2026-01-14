
'use client';

import { useState, useEffect } from 'react';
import { MenuItem, OrderItem, CreateOrderRequest, Order } from '@/types';

const CustomerOrderSystem = () => {
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [buildingOrder, setBuildingOrder] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [orderStatus, setOrderStatus] = useState<string | null>(null);

  useEffect(() => {
    fetchMenu();
    fetchActiveOrders();
    
    const pollingInterval = setInterval(() => {
      if (orderNumber) {
        fetchActiveOrders();
      }
    }, 3000);
    
    // Generate or retrieve device ID
    const existingDeviceId = localStorage.getItem('deviceId');
    if (existingDeviceId) {
      setDeviceId(existingDeviceId);
    } else {
      const newDeviceId = Math.random().toString(36).substring(2) + Date.now().toString(36);
      localStorage.setItem('deviceId', newDeviceId);
      setDeviceId(newDeviceId);
    }

    return () => clearInterval(pollingInterval);
  }, [orderNumber]);

  const fetchMenu = async () => {
    try {
      const response = await fetch('/api/menu');
      if (!response.ok) throw new Error('Failed to fetch menu');
      const data = await response.json();
      setMenuItems(data);
      setLoading(false);
    } catch (err) {
      setError('Failed to load menu');
      setLoading(false);
      console.error(err);
    }
  };

  const fetchActiveOrders = async () => {
    try {
      const response = await fetch('/api/orders');
      if (!response.ok) throw new Error('Failed to fetch orders');
      const data = await response.json();
      setActiveOrders(data);
      
      if (orderNumber !== null) {
        const ourOrder = data.find((order: Order) => order.order_number === orderNumber);
        if (ourOrder) {
          setOrderStatus(ourOrder.status);
        } else {
          setOrderStatus('served');
        }
      }
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    }
  };

  const addToOrder = (item: MenuItem, quantity: number) => {
    setBuildingOrder(prev => {
      const existing = prev.find(p => p.id === item.id);
      if (existing) {
        return prev.map(p => p.id === item.id ? {...p, quantity: p.quantity + quantity} : p);
      }
      return [...prev, { ...item, quantity }];
    });
  };

  const placeOrder = async () => {
    if (buildingOrder.length === 0) return;
    
    setIsPlacingOrder(true); // Disable button
    try {
      const total = buildingOrder.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      
      const orderData: CreateOrderRequest = {
        items: buildingOrder,
        total,
        order_type: 'DINE_IN'
      };

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });

      if (!response.ok) throw new Error('Failed to place order');

      const result = await response.json();
      setOrderNumber(result.order_number);
      setOrderStatus('preparing');
      console.log("Order placed successfully:", result.order_number); // Debugging statement
      console.log("Order number set to:", result.order_number); // Debugging statement
      
    } catch (err) {
      setError('Failed to place order');
      console.error(err);
      setIsPlacingOrder(false); // Re-enable button only on error
    }
  };

  const removeItemFromBuildingOrder = (itemId: number) => {
    setBuildingOrder(prev => prev.filter(item => item.id !== itemId));
  };

  const updateBuildingOrderItemQuantity = (itemId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      setBuildingOrder(prev => prev.filter(item => item.id !== itemId));
    } else {
      setBuildingOrder(prev => prev.map(item => 
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      ));
    }
  };

  const clearOrder = () => {
    setBuildingOrder([]);
    setOrderNumber(null);
    setOrderStatus(null);
  };

  const startNewOrder = () => {
    setBuildingOrder([]);
    setOrderNumber(null);
    setOrderStatus(null);
  };

  const isOrderActive = orderNumber !== null && orderStatus !== 'served';

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <img src="/adda.png" alt="Logo" className="w-12 h-12 mx-auto mb-4 animate-pulse" />
          <div className="text-gray-700">Loading menu...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
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
    <div className="min-h-screen bg-gray-100 p-4 max-w-md mx-auto">
      <div className="bg-gradient-to-r from-red-600 to-red-800 rounded-lg shadow-lg p-4 mb-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Logo" className="w-24 h-24" />
            <h1 className="text-xl font-bold text-white">Place Your Order</h1>
          </div>
          {(buildingOrder.length > 0 || isOrderActive) && !orderNumber && (
            <button
              onClick={clearOrder}
              className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {orderNumber && (
        <div className="bg-red-100 rounded-lg p-4 mb-4 border-2 border-red-300">
          <h3 className="font-semibold text-red-900 mb-2">Your Order Status:</h3>
          <div className="flex justify-between items-center">
            <div>
              <div className="text-red-900 font-medium">Order #{orderNumber}</div>
              <div className="text-sm text-red-700">
                Status: {orderStatus || 'processing'}
              </div>
            </div>
            {orderStatus === 'served' && (
              <button
                onClick={startNewOrder}
                className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
              >
                New Order
              </button>
            )}
          </div>
        </div>
      )}

      {(buildingOrder.length > 0 || isOrderActive) && (
        <div className="bg-red-100 rounded-lg p-4 mb-4 border-2 border-red-300">
          <h3 className="font-semibold text-red-900 mb-2">Your Order:</h3>
          {buildingOrder.map(item => (
            <div key={item.id} className="flex justify-between items-center py-2 border-b border-red-300">
              <span className="text-red-900 font-medium">{item.name}</span>
              <div className="flex items-center gap-2">
                {!orderNumber ? (
                  <>
                    <button
                      onClick={() => updateBuildingOrderItemQuantity(item.id, item.quantity - 1)}
                      className="w-6 h-6 bg-red-600 text-white rounded flex items-center justify-center hover:bg-red-700 transition-colors text-sm"
                    >
                      -
                    </button>
                    <span className="w-6 text-center font-semibold text-red-900 text-sm">{item.quantity}</span>
                    <button
                      onClick={() => updateBuildingOrderItemQuantity(item.id, item.quantity + 1)}
                      className="w-6 h-6 bg-red-600 text-white rounded flex items-center justify-center hover:bg-red-700 transition-colors text-sm"
                    >
                      +
                    </button>
                  </>
                ) : (
                  <span className="w-6 text-center font-semibold text-red-900 text-sm">×{item.quantity}</span>
                )}
                <span className="font-medium text-red-900 w-16 text-right">₹{item.price * item.quantity}</span>
                {!orderNumber && (
                  <button
                    onClick={() => removeItemFromBuildingOrder(item.id)}
                    className="p-2 text-red-600 hover:text-red-800 hover:bg-red-100 rounded transition-colors"
                    title="Remove item"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          ))}
          <div className="border-t border-red-300 pt-2 mt-2 flex justify-between items-center">
            <span className="font-bold text-red-900">
              Total: ₹{buildingOrder.reduce((sum, item) => sum + (item.price * item.quantity), 0)}
            </span>
            <div className="flex gap-2 items-center">
              {orderNumber ? (
                <span className="text-red-900 font-medium">Order #{orderNumber}</span>
              ) : (
                <button 
                  onClick={placeOrder}
                  disabled={isPlacingOrder}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPlacingOrder ? 'Order Placed' : 'Place Order'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-lg p-4">
        <h2 className="font-semibold text-gray-800 text-lg mb-4">Menu Items</h2>
        
        {buildingOrder.length === 0 && !orderNumber && (
          <div className="text-center py-8 text-gray-500 mb-4">
            <div className="text-lg">Select items to build your order</div>
            <div className="text-sm mt-2">Click on menu items to add them to your order</div>
          </div>
        )}
        
        <div className="grid grid-cols-2 gap-3">
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => !orderNumber && addToOrder(item, 1)}
              disabled={!!orderNumber}
              className={`w-full p-4 rounded-lg text-center font-medium min-h-[90px] flex flex-col justify-center transition-all duration-300 shadow-md hover:shadow-lg cursor-pointer hover:scale-105 ${
                orderNumber 
                  ? 'bg-gray-400 cursor-not-allowed opacity-70' 
                  : 'bg-gradient-to-br from-red-600 to-red-800 hover:from-red-700 hover:to-red-900'
              }`}
            >
              <div className="font-semibold text-sm leading-tight px-1 overflow-hidden" style={{ 
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical'
              }}>{item.name}</div>
              <div className="text-xs opacity-90 mt-2 bg-white/20 rounded px-1 py-0.5">₹{item.price}</div>
            </button>
          ))}
        </div>
      </div>

      {buildingOrder.length === 0 && menuItems.length === 0 && !loading && (
        <div className="text-center py-12 text-gray-500">
          <div className="text-lg">No menu items available</div>
          <div className="text-sm mt-2">Please check back later</div>
        </div>
      )}
    </div>
  );
};

export default CustomerOrderSystem;
