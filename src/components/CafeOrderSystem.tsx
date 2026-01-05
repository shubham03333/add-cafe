'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Clock, ChefHat, Edit2, Trash2, X, Save, BarChart3, History, Wifi, WifiOff } from 'lucide-react';
import { Order, MenuItem, OrderItem, CreateOrderRequest, UpdateOrderRequest } from '@/types';
import { useOfflineStatus } from '@/hooks/useOfflineStatus';

const CafeOrderSystem = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [buildingOrder, setBuildingOrder] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dailySales, setDailySales] = useState(0);
  const [salesData, setSalesData] = useState<any>({ total_revenue: 0, payment_breakdown: { cash: { orders: 0, revenue: 0 }, online: { orders: 0, revenue: 0 } } });
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  
  // Offline status
  const isOffline = useOfflineStatus();
  
  // Sales report modal state
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [salesReport, setSalesReport] = useState<any>(null);

  // Payment revenue modal state
  const [isPaymentRevenueModalOpen, setIsPaymentRevenueModalOpen] = useState(false);
  
  // Confirmation modal state
  const [confirmingDeleteOrder, setConfirmingDeleteOrder] = useState<string | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  // Served orders modal state
  const [isServedOrdersModalOpen, setIsServedOrdersModalOpen] = useState(false);
  const [servedOrders, setServedOrders] = useState<Order[]>([]);
  const [loadingServedOrders, setLoadingServedOrders] = useState(false);
  const [popularItems, setPopularItems] = useState<{name: string; quantity: number}[]>([]);

  // Payment mode selection modal state
  const [isPaymentModeModalOpen, setIsPaymentModeModalOpen] = useState(false);
  const [orderToServe, setOrderToServe] = useState<Order | null>(null);

  // Analytics chart state
  const [showAnalytics, setShowAnalytics] = useState(false);

  const closeOrderPopup = () => {
    setViewingOrder(null);
  };
  
  const handleOrderClick = (order: Order) => {
    setViewingOrder(order);
  };

  // Fetch menu items and set up real-time updates
  useEffect(() => {
    fetchMenu();
    fetchOrders();
    fetchPopularItems();

    // Set up polling for real-time updates
    const pollingInterval = setInterval(() => {
      fetchOrders();
    }, 3000); // Poll every 3 seconds

    // Listen for order update events (e.g., payment status changes)
    const handleOrderUpdate = () => {
      console.log('Order update detected, refreshing orders...');
      fetchOrders();
    };

    window.addEventListener('orderUpdated', handleOrderUpdate);

    // Clean up interval and event listener on component unmount
    return () => {
      clearInterval(pollingInterval);
      window.removeEventListener('orderUpdated', handleOrderUpdate);
    };
  }, []);

  const fetchMenu = async () => {
    try {
      const response = await fetch('/api/menu');
      if (!response.ok) throw new Error('Failed to fetch menu');
      const data = await response.json();
      setMenuItems(data);
    } catch (err) {
      setError('Failed to load menu');
      console.error(err);
    }
  };

  const fetchDailySales = async () => {
    try {
      const response = await fetch('/api/daily-sales/today');
      if (!response.ok) throw new Error('Failed to fetch daily sales');
      const data = await response.json();
      setSalesData(data);
      setDailySales(data.total_revenue);
    } catch (err) {
      console.error('Failed to fetch daily sales:', err);
      setSalesData({ total_revenue: 0, payment_breakdown: { cash: { orders: 0, revenue: 0 }, online: { orders: 0, revenue: 0 } } });
      setDailySales(0); // Reset to 0 on error
    }
  };



  const fetchPopularItems = async () => {
    try {
      // Get last 7 days for popular items
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      
      const response = await fetch(`/api/sales-report?startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}`);
      if (!response.ok) throw new Error('Failed to fetch popular items');
      const data = await response.json();
      setPopularItems(data.top_items || []);
    } catch (err) {
      console.error('Failed to fetch popular items:', err);
    }
  };

  const ordersContainerRef = useRef<HTMLDivElement>(null);

  const fetchOrders = async () => {
    const scrollPosition = ordersContainerRef.current?.scrollTop || 0; // Store current scroll position
    try {
    const response = await fetch('/api/orders'); // Remove ?includeServed=true to only get non-served orders
    if (!response.ok) throw new Error('Failed to fetch orders');
    const data = await response.json();
    setOrders(data);
    
    // Calculate pending orders count (orders that are not served)
    const pendingOrders = data.filter((order: Order) => order.status !== 'served');
    setPendingOrdersCount(pendingOrders.length);
    
    // Fetch daily sales from API instead of calculating locally
    await fetchDailySales();
    
    setLoading(false);
    
    if (ordersContainerRef.current) {
        ordersContainerRef.current.scrollTop = scrollPosition; // Restore scroll position
    }
    } catch (err) {
      setError('Failed to load orders');
      setLoading(false);
      console.error(err);
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
    
    try {
      const total = buildingOrder.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      
      // Create order data (order_number will be generated by the API)
      const orderData: CreateOrderRequest = {
        items: buildingOrder,
        total
      };

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });

      if (!response.ok) throw new Error('Failed to place order');

      setBuildingOrder([]);
      await fetchOrders(); // Refresh orders
      
    } catch (err) {
      setError('Failed to place order');
      console.error(err);
    }
  };

  const updateOrderStatus = async (orderId: string, status: Order['status']) => {
    try {
      const updateData: UpdateOrderRequest = { status, items: orders.find(order => order.id === orderId)?.items };

      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) throw new Error('Failed to update order');

      // For served orders, immediately update local state for instant UI feedback
      // and also force a refresh to ensure consistency with the backend
      if (status === 'served') {
        setOrders(prevOrders => prevOrders.filter(order => order.id !== orderId));
        setPendingOrdersCount(prev => prev - 1);
        await fetchDailySales();
        
        // Force an immediate refresh to ensure UI is in sync with backend
        setTimeout(() => {
          fetchOrders();
        }, 100);
      } else {
        await fetchOrders(); // Refresh orders for other status changes
      }
      
    } catch (err) {
      setError('Failed to update order');
      console.error(err);
    }
  };

  const deleteOrder = async (orderId: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete order');

      await fetchOrders(); // Refresh orders
      
    } catch (err) {
      setError('Failed to delete order');
      console.error(err);
    }
  };

  const saveEditedOrder = async () => {
    if (!editingOrder || editingOrder.items.length === 0) {
      if (editingOrder) await deleteOrder(editingOrder.id);
      setEditingOrder(null);
      return;
    }

    try {
      const updateData: UpdateOrderRequest = {
        items: editingOrder.items,
        total: editingOrder.total
      };

      const response = await fetch(`/api/orders/${editingOrder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) throw new Error('Failed to save order');

      setEditingOrder(null);
      await fetchOrders(); // Refresh orders
      
    } catch (err) {
      setError('Failed to save order');
      console.error(err);
    }
  };

  const removeItemFromBuildingOrder = (itemId: number) => {
    setBuildingOrder(prev => prev.filter(item => item.id !== itemId));
  };

  const updateBuildingOrderItemQuantity = (itemId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      // Remove item if quantity is 0 or less
      setBuildingOrder(prev => prev.filter(item => item.id !== itemId));
    } else {
      // Update quantity
      setBuildingOrder(prev => prev.map(item => 
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      ));
    }
  };

  const removeItemFromOrder = async (orderId: string, itemId: number) => {
    try {
      const orderToUpdate = orders.find(order => order.id === orderId);
      if (!orderToUpdate) return;

      const updatedItems = orderToUpdate.items.filter(item => item.id !== itemId);
      const total = updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      const updateData: UpdateOrderRequest = {
        items: updatedItems,
        total
      };

      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) throw new Error('Failed to remove item from order');

      await fetchOrders(); // Refresh orders
      
    } catch (err) {
      setError('Failed to remove item from order');
      console.error(err);
    }
  };

  const editOrder = (order: Order) => {
    setEditingOrder(order);
  };

  const cancelEdit = () => {
    setEditingOrder(null);
  };

  const updateEditingOrderItem = (itemId: number, newQuantity: number) => {
    if (!editingOrder) return;
    
    if (newQuantity <= 0) {
      // Remove item if quantity is 0 or less
      const updatedItems = editingOrder.items.filter(item => item.id !== itemId);
      const total = updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      setEditingOrder({ ...editingOrder, items: updatedItems, total });
    } else {
      // Update quantity
      const updatedItems = editingOrder.items.map(item => 
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      );
      const total = updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      setEditingOrder({ ...editingOrder, items: updatedItems, total });
    }
  };

  const addItemToEditingOrder = (item: MenuItem) => {
    if (!editingOrder) return;
    
    const existingItem = editingOrder.items.find(i => i.id === item.id);
    let updatedItems;
    
    if (existingItem) {
      updatedItems = editingOrder.items.map(i => 
        i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
      );
    } else {
      updatedItems = [...editingOrder.items, { ...item, quantity: 1 }];
    }
    
    const total = updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    setEditingOrder({ ...editingOrder, items: updatedItems, total });
  };

  // Sales report functions
  const generateSalesReport = async () => {
    try {
      const response = await fetch(`/api/sales-report?startDate=${startDate}&endDate=${endDate}`);
      if (!response.ok) throw new Error('Failed to generate sales report');
      const data = await response.json();
      setSalesReport(data);
    } catch (err) {
      setError('Failed to generate sales report');
      console.error(err);
    }
  };

  const openReportModal = () => {
    setIsReportModalOpen(true);
    // Set default date range to current month
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(lastDay.toISOString().split('T')[0]);
  };

  const closeReportModal = () => {
    setIsReportModalOpen(false);
    setSalesReport(null);
  };

  // Payment revenue modal functions
  const openPaymentRevenueModal = () => {
    setIsPaymentRevenueModalOpen(true);
  };

  const closePaymentRevenueModal = () => {
    setIsPaymentRevenueModalOpen(false);
  };

  // Confirmation modal functions
  const openConfirmModal = (orderId: string) => {
    setConfirmingDeleteOrder(orderId);
    setIsConfirmModalOpen(true);
  };

  const closeConfirmModal = () => {
    setIsConfirmModalOpen(false);
    setConfirmingDeleteOrder(null);
  };

  const handleConfirmDelete = async () => {
    if (confirmingDeleteOrder) {
      await deleteOrder(confirmingDeleteOrder);
      closeConfirmModal();
    }
  };

  // Served orders functions
  const fetchServedOrders = async () => {
    setLoadingServedOrders(true);
    try {
      const response = await fetch('/api/orders?includeServed=true');
      if (!response.ok) throw new Error('Failed to fetch served orders');
      const data = await response.json();
      // Filter only served orders and get the last 5
      const served = data.filter((order: Order) => order.status === 'served');
      setServedOrders(served.slice(-5).reverse()); // Get last 5 and reverse to show most recent first
    } catch (err) {
      setError('Failed to fetch served orders');
      console.error(err);
    } finally {
      setLoadingServedOrders(false);
    }
  };

  const openServedOrdersModal = async () => {
    setIsServedOrdersModalOpen(true);
    await fetchServedOrders();
  };

  const closeServedOrdersModal = () => {
    setIsServedOrdersModalOpen(false);
    setServedOrders([]);
  };

  // Payment mode functions
  const openPaymentModeModal = (order: Order) => {
    setOrderToServe(order);
    setIsPaymentModeModalOpen(true);
  };

  const closePaymentModeModal = () => {
    setIsPaymentModeModalOpen(false);
    setOrderToServe(null);
  };

  const handlePaymentModeSelection = async (paymentMode: 'cash' | 'online') => {
    if (!orderToServe) return;

    try {
      // First update the payment mode
      const paymentResponse = await fetch(`/api/orders/${orderToServe.id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMode })
      });

      if (!paymentResponse.ok) throw new Error('Failed to process payment');

      // Then mark the order as served
      await updateOrderStatus(orderToServe.id, 'served');

      closePaymentModeModal();
    } catch (err) {
      setError('Failed to process payment and serve order');
      console.error(err);
      closePaymentModeModal();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-2 sm:p-4 max-w-md mx-auto">
        {/* Header Skeleton */}
        <div className="bg-gradient-to-r from-red-600 to-red-800 rounded-lg shadow-lg p-3 sm:p-4 mb-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-red-400/30 rounded-lg animate-pulse"></div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-center">
              <div className="p-1.5 sm:p-2 bg-white/20 rounded-lg w-8 h-8 sm:w-10 sm:h-10 animate-pulse"></div>
              <div className="bg-white/20 backdrop-blur-sm rounded-lg p-1.5 sm:p-2 min-w-[50px] sm:min-w-[60px] animate-pulse">
                <div className="h-3 bg-white/30 rounded mb-1"></div>
                <div className="h-6 bg-white/40 rounded"></div>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-lg p-1.5 sm:p-2 min-w-[50px] sm:min-w-[60px] animate-pulse">
                <div className="h-3 bg-white/30 rounded mb-1"></div>
                <div className="h-6 bg-white/40 rounded"></div>
              </div>
              <div className="p-1.5 sm:p-2 bg-white/20 rounded-lg w-8 h-8 sm:w-10 sm:h-10 animate-pulse"></div>
              <div className="p-1.5 sm:p-2 bg-white/20 rounded-lg w-8 h-8 sm:w-10 sm:h-10 animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Menu Grid Skeleton */}
        <div className="bg-white rounded-lg shadow-lg p-4 mb-4">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4 animate-pulse"></div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {[...Array(8)].map((_, index) => (
              <div
                key={index}
                className="w-full p-1.5 sm:p-2 rounded-lg min-h-[60px] sm:min-h-[70px] bg-gray-200 animate-pulse"
              ></div>
            ))}
          </div>
        </div>

        {/* Order Queue Skeleton */}
        <div className="bg-white rounded-lg shadow-lg p-4">
          <div className="h-6 bg-gray-200 rounded w-1/2 mb-4 animate-pulse flex items-center gap-2">
            <div className="w-6 h-6 bg-gray-300 rounded"></div>
          </div>
          <div className="space-y-3">
            {[...Array(3)].map((_, index) => (
              <div
                key={index}
                className="p-4 sm:p-5 rounded-lg bg-gray-100 border-l-4 border-gray-300 animate-pulse"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gray-300 rounded"></div>
                    <div className="h-6 bg-gray-300 rounded w-12"></div>
                    <div className="h-6 bg-gray-300 rounded w-16"></div>
                  </div>
                  <div className="h-6 bg-gray-300 rounded w-16"></div>
                </div>
                <div className="mb-3 sm:mb-4 space-y-2">
                  {[...Array(2)].map((_, itemIndex) => (
                    <div key={itemIndex} className="flex justify-between items-center py-1 sm:py-2">
                      <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                      <div className="w-4 h-4 bg-gray-300 rounded"></div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <div className="h-8 bg-gray-300 rounded w-16"></div>
                  <div className="h-8 bg-gray-300 rounded flex-1"></div>
                  <div className="h-8 bg-gray-300 rounded w-8"></div>
                </div>
              </div>
            ))}
          </div>
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
    <div className="min-h-screen bg-gray-100 p-2 sm:p-4 max-w-md mx-auto transition-all duration-300">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-red-800 rounded-lg shadow-lg p-3 sm:p-4 mb-4 transition-all duration-300">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Logo" className="w-16 h-16 sm:w-20 sm:h-20" />
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-center">
            {/* Offline Status Indicator */}
            <div className="relative">
              <button
                className={`p-1.5 sm:p-2 rounded-lg shadow-md transition-colors ${
                  isOffline 
                    ? 'bg-red-500 text-white hover:bg-red-600' 
                    : 'bg-green-500 text-white hover:bg-green-600'
                }`}
                title={isOffline ? 'Offline Mode' : 'Online Mode'}
              >
                {isOffline ? (
                  <WifiOff className="w-4 h-4 sm:w-5 sm:h-5" />
                ) : (
                  <Wifi className="w-4 h-4 sm:w-5 sm:h-5" />
                )}
              </button>
              {isOffline && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></div>
              )}
            </div>

            <a 
              href="/chef" 
              className="p-1.5 sm:p-2 bg-white text-red-600 rounded-lg text-xs sm:text-sm hover:bg-gray-100 transition-colors shadow-md flex items-center gap-1"
              title="Chef Dashboard"
            >
              <span className="hidden sm:inline">👨‍🍳</span>
              <span className="sm:hidden">👨‍🍳</span>
            </a>
            <div
              className="bg-white/20 backdrop-blur-sm rounded-lg p-1.5 sm:p-2 min-w-[50px] sm:min-w-[60px] cursor-pointer hover:bg-white/30 transition-colors"
              onClick={() => {
                const orderQueueElement = document.querySelector('[data-order-queue]');
                if (orderQueueElement) {
                  orderQueueElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }}
              title="Click to view pending orders"
            >
              <div className="text-xs text-white/90">Pending</div>
              <div className="text-base sm:text-lg font-bold text-white">{pendingOrdersCount}</div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-1.5 sm:p-2 min-w-[50px] sm:min-w-[60px] cursor-pointer" onClick={openPaymentRevenueModal}>
              <div className="text-xs text-white/90">Sales</div>
              <div className="text-base sm:text-lg font-bold text-white">₹{dailySales}</div>
              {/* <div className="text-xs text-white/90 mt-0.5">Click to view by payment mode</div> */}
            </div>
            <button
              onClick={openServedOrdersModal}
              className="p-1.5 sm:p-2 bg-white text-red-600 rounded-lg hover:bg-gray-100 transition-colors shadow-md"
              title="Served Orders History"
            >
              <History className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              onClick={openReportModal}
              className="p-1.5 sm:p-2 bg-white text-red-600 rounded-lg hover:bg-gray-100 transition-colors shadow-md"
              title="Sales Report"
            >
              <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Building Order Section */}
      {buildingOrder.length > 0 && (
        <div className="bg-red-100 rounded-lg p-3 mb-4 border-2 border-red-300">
          <h3 className="font-semibold text-red-900 mb-2 text-base">Building Order:</h3>
          {buildingOrder.map(item => (
            <div key={item.id} className="flex justify-between items-center py-2 border-b border-red-300">
              <span className="text-red-900 font-medium text-xs sm:text-sm">{item.name}</span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => updateBuildingOrderItemQuantity(item.id, item.quantity - 1)}
                  className="w-6 h-6 sm:w-7 sm:h-7 bg-red-600 text-white rounded flex items-center justify-center hover:bg-red-700 transition-colors text-xs font-bold"
                >
                  -
                </button>
                <span className="w-6 text-center font-semibold text-red-900 text-xs sm:text-sm">{item.quantity}</span>
                <button
                  onClick={() => updateBuildingOrderItemQuantity(item.id, item.quantity + 1)}
                  className="w-6 h-6 sm:w-7 sm:h-7 bg-red-600 text-white rounded flex items-center justify-center hover:bg-red-700 transition-colors text-xs font-bold"
                >
                  +
                </button>
                <span className="font-medium text-red-900 w-12 sm:w-16 text-right text-xs sm:text-sm">₹{item.price * item.quantity}</span>
                <button
                  onClick={() => removeItemFromBuildingOrder(item.id)}
                  className="p-1 text-red-600 hover:text-red-800 hover:bg-red-100 rounded transition-colors"
                  title="Remove item"
                >
                  <Trash2 className="w-3 h-3 sm:w-3 sm:h-3" />
                </button>
              </div>
            </div>
          ))}
          <div className="border-t border-red-300 pt-2 mt-2 flex flex-col sm:flex-row justify-between items-center gap-2">
            <span className="font-bold text-red-900 text-base">
              Total: ₹{buildingOrder.reduce((sum, item) => sum + (item.price * item.quantity), 0)}
            </span>
            <button 
              onClick={placeOrder}
              className="bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 w-full sm:w-auto text-sm"
            >
              Place Order
            </button>
          </div>
        </div>
      )}

      {/* Edit Order Modal */}
      {editingOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity duration-300">
          <div className="bg-white rounded-xl p-6 max-w-md w-full max-h-[85vh] overflow-y-auto shadow-2xl border border-gray-200 transform transition-all duration-300 scale-100">
            {/* Header */}
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 bg-gradient-to-r from-red-600 to-red-800 bg-clip-text text-transparent">
                  Edit Order #{editingOrder.order_number}
                </h2>
                <p className="text-sm text-gray-600 mt-1">Modify items and quantities</p>
              </div>
              <button
                onClick={cancelEdit}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors duration-200"
                title="Cancel"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {/* Current Items Section */}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-4 text-lg flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                Current Items
              </h3>
              <div className="space-y-3">
                {editingOrder.items.map(item => (
                  <div key={item.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors duration-200">
                    <div className="flex-1 min-w-0">
                      <span className="text-gray-900 font-medium text-sm block truncate">{item.name}</span>
                      <span className="text-gray-600 text-xs">₹{item.price} each</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 bg-white rounded-full p-1 shadow-sm">
                        <button
                          onClick={() => updateEditingOrderItem(item.id, item.quantity - 1)}
                          className="w-8 h-8 bg-gray-100 text-gray-700 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors duration-200 font-semibold text-lg"
                          title="Decrease quantity"
                        >
                          -
                        </button>
                        <span className="w-8 text-center font-bold text-gray-900 text-sm">{item.quantity}</span>
                        <button
                          onClick={() => updateEditingOrderItem(item.id, item.quantity + 1)}
                          className="w-8 h-8 bg-red-100 text-red-700 rounded-full flex items-center justify-center hover:bg-red-200 transition-colors duration-200 font-semibold text-lg"
                          title="Increase quantity"
                        >
                          +
                        </button>
                      </div>
                      <button
                        onClick={() => updateEditingOrderItem(item.id, 0)}
                        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full transition-colors duration-200"
                        title="Remove item"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Add Items Section */}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-4 text-lg flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Add Items
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {menuItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => addItemToEditingOrder(item)}
                    className="bg-gradient-to-r from-red-500 to-red-700 hover:from-red-600 hover:to-red-800 text-white p-3 rounded-lg font-medium text-sm transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg"
                  >
                    <div className="font-semibold text-xs leading-tight">{item.name}</div>
                    <div className="text-xs opacity-90 mt-1">₹{item.price}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Total and Action Buttons */}
            <div className="border-t border-gray-200 pt-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <div className="text-sm text-gray-600">Order Total</div>
                  <div className="text-2xl font-bold text-gray-900">
                    ₹{editingOrder.total}
                  </div>
                </div>
                <div className="flex gap-2 sm:gap-3 flex-col sm:flex-row">
                  <button
                    onClick={cancelEdit}
                    className="px-3 py-1.5 sm:px-4 sm:py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-all duration-200 border border-gray-300 text-xs sm:text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveEditedOrder}
                    className="px-3 py-1.5 sm:px-4 sm:py-2 bg-gradient-to-r from-red-600 to-red-800 text-white rounded-lg font-medium hover:from-red-700 hover:to-red-900 transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-1.5 justify-center text-xs sm:text-sm"
                  >
                    <Save className="w-3 h-3 sm:w-4 sm:h-4" />
                    Save Changes
                  </button>
                </div>
              </div>
              
              {editingOrder.items.length === 0 && (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                  <p className="text-sm text-yellow-800">
                    ⚠️ This order will be deleted if you save without any items.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Menu Grid */}
      <div className="bg-white rounded-lg shadow-lg p-4 mb-4">
        <h2 className="font-semibold text-gray-800 text-lg mb-4">Menu Items</h2>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => addToOrder(item, 1)}
              className="w-full p-1.5 sm:p-2 rounded-lg text-center font-medium min-h-[60px] sm:min-h-[70px] flex flex-col justify-center transition-all duration-300 shadow-md hover:shadow-lg bg-gradient-to-br from-red-600 to-red-800 hover:from-red-700 hover:to-red-900 cursor-pointer hover:scale-105"
            >
              <div className="font-semibold text-[10px] sm:text-[11px] leading-tight px-0.5 overflow-hidden" style={{ 
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical'
              }}>{item.name}</div>
              <div className="text-[9px] sm:text-[10px] opacity-90 mt-0.5 bg-white/20 rounded px-0.5 py-0.5">₹{item.price}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Order Queue */}
      <div className="bg-white rounded-lg shadow-lg p-4" data-order-queue>
        <h2 className="font-semibold text-gray-800 mb-4 text-lg flex items-center gap-2">
          <Clock className="w-6 h-6 text-red-600" />
          Order Queue ({orders.length})
        </h2>
        
        {orders.length === 0 ? (
          <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg">
            <ChefHat className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <div className="text-lg">No orders in queue</div>
            <div className="text-sm mt-2">Start building orders from the menu!</div>
          </div>
        ) : (
          <div ref={ordersContainerRef} className="mt-2" style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <div className="space-y-3 pr-1">
              {orders.map(order => (
                <div 
                  key={order.id} 
                  className="p-4 sm:p-5 rounded-lg border-l-4 border-red-500 bg-gradient-to-r from-red-50 to-white shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer"
                  onClick={() => handleOrderClick(order)}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                      <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-red-700 flex-shrink-0" />
                      <span className="font-bold text-sm sm:text-lg text-red-900">#{order.order_number}</span>
                      <span className={`px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full text-xs font-semibold flex-shrink-0 ${
                        order.status === 'preparing'
                          ? 'bg-yellow-200 text-yellow-900'
                          : order.status === 'ready'
                          ? 'bg-green-200 text-green-900'
                          : order.status === 'served'
                          ? 'bg-red-200 text-red-900'
                          : 'bg-orange-200 text-orange-900'
                      }`}>
                        {order.status}
                      </span>
                      {/* Payment Status Indicator - Compact */}
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full text-xs font-semibold flex-shrink-0 ${
                        order.payment_status === 'paid'
                          ? 'bg-green-100 text-green-800 border border-green-300'
                          : order.payment_status === 'failed'
                          ? 'bg-red-100 text-red-800 border border-red-300'
                          : 'bg-blue-100 text-blue-800 border border-blue-300'
                      }`}>
                        <span className="text-xs">
                          {order.payment_status === 'paid' ? '✓' : order.payment_status === 'failed' ? '✗' : '~'}
                        </span>
                        <span className="hidden sm:inline text-xs">
                          {order.payment_status === 'paid' ? 'Paid' : order.payment_status === 'failed' ? 'Failed' : 'Pending'}
                        </span>
                      </span>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <div className="font-bold text-sm sm:text-lg text-red-900 whitespace-nowrap">₹{order.total}</div>
                    </div>
                  </div>
                  
                  <div className="mb-3 sm:mb-4">
                    {order.items.map(item => (
                      <div key={item.id} className="flex justify-between items-center text-xs sm:text-sm text-red-800 py-1 sm:py-2 border-b border-red-100 last:border-b-0">
                        <span className="font-medium">{item.quantity}x {item.name}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeItemFromOrder(order.id, item.id);
                          }}
                          className="p-1.5 sm:p-2 text-red-600 hover:text-red-800 hover:bg-red-100 rounded-full transition-colors"
                          title="Remove item"
                        >
                          <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        editOrder(order);
                      }}
                      className="px-2 py-1.5 sm:px-3 sm:py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center gap-1 text-xs sm:text-sm"
                      title="Edit order"
                    >
                      <Edit2 className="w-3 h-3 sm:w-3 sm:h-3" />
                      Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openPaymentModeModal(order);
                      }}
                      className="flex-1 py-1.5 sm:py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors text-xs sm:text-sm"
                    >
                      Served
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openConfirmModal(order.id);
                      }}
                      className="px-1.5 py-1 sm:px-1.5 sm:py-0.5 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium transition-colors flex items-center gap-0.5 text-xs"
                      title="Delete order"
                    >
                      <Trash2 className="w-2.5 h-2.5 sm:w-2.5 sm:h-2.5" />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Analytics Chart */}
      {showAnalytics && (
        <div className="bg-white rounded-lg shadow-lg p-4 mb-4">
          <div className="flex justify-between items-center mb-4">
            {/* <h2 className="font-semibold text-gray-800 text-lg flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-blue-600" />
              Order Analytics
            </h2> */}
            <button
              onClick={() => setShowAnalytics(false)}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors"
              title="Close Analytics"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          {/* <OrderAnalyticsChart /> */}
        </div>
      )}

      {/* Sales Report Modal */}
      {isReportModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Sales Report</h2>
              <button
                onClick={closeReportModal}
                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4">
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded text-gray-900 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded text-gray-900 bg-white"
                  />
                </div>
              </div>
              
              <button
                onClick={generateSalesReport}
                className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded font-medium transition-colors"
              >
                Generate Report
              </button>
            </div>

            {salesReport && (
              <div className="border-t border-gray-200 pt-4">
                <h3 className="font-semibold text-gray-900 mb-3">Report Results:</h3>
                
                <div className="space-y-3">
                  <div className="bg-green-50 p-3 rounded">
                    <div className="text-sm text-green-800">Total Revenue</div>
                    <div className="text-lg font-bold text-green-900">₹{salesReport.total_revenue || 0}</div>
                  </div>
                  
                  <div className="bg-red-50 p-3 rounded">
                    <div className="text-sm text-red-800">Total Orders</div>
                    <div className="text-lg font-bold text-red-900">{salesReport.total_orders || 0}</div>
                  </div>
                  
                  {salesReport.daily_sales && salesReport.daily_sales.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Daily Breakdown:</h4>
                      <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                        <div className="space-y-2">
                          {salesReport.daily_sales.map((day: any) => (
                            <div key={day.date} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                              <span className="text-sm text-gray-700">{new Date(day.date).toLocaleDateString()}</span>
                              <span className="font-medium text-gray-900">₹{day.revenue}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {salesReport.top_items && salesReport.top_items.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Top Selling Items:</h4>
                      <div className="space-y-2">
                        {salesReport.top_items.slice(0, 5).map((item: any, index: number) => (
                          <div key={index} className="flex justify-between items-center p-2 bg-orange-50 rounded">
                            <span className="break-words min-w-0 flex-1 text-sm text-orange-800">{item.name}</span>
                            <span className="ml-2 font-medium text-orange-900">{item.quantity} sold</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Professional Bill Popup */}
      {viewingOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 print:block print:bg-white print:p-0 print:m-0">
          <div className="bg-white rounded-lg max-w-sm w-full max-h-[90vh] overflow-y-auto shadow-2xl border-2 border-gray-300 print:shadow-none print:border-none print:max-w-none print:w-full print:max-h-none print:overflow-visible print:p-0 print:m-0 print:min-h-screen print:flex print:flex-col">
            {/* Logo at Top */}
            <div className="flex justify-center py-2 px-4 border-b-2 border-gray-300 print:border-b print:border-black print:py-1 print:px-2">
              <img src="/adda.png" alt="Restaurant Logo" className="w-12 h-12 print:w-16 print:h-16" />
            </div>

            {/* Bill Content */}
            <div className="p-3 print:p-1">
              {/* Restaurant Header */}
              <div className="text-center mb-2 print:mb-1">
                <h1 className="text-base font-bold text-gray-900 print:text-black print:text-lg">Adda Cafe</h1>
              </div>

              {/* Order Header */}
              <div className="text-center mb-2 print:mb-1">
                <div className="text-xs text-gray-600 print:text-black">Order #{viewingOrder.order_number}</div>
                <div className="text-xs text-gray-500 print:text-black">{new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</div>
              </div>

              {/* Items List */}
              <div className="border-t border-b border-gray-300 py-1 mb-2 print:border-black print:py-0.5 print:mb-1">
                <div className="space-y-0.5 print:space-y-0">
                  {viewingOrder.items.map(item => (
                    <div key={item.id} className="flex justify-between items-center py-0.5 print:py-0">
                      <div className="flex-1">
                        <span className="text-gray-900 font-medium print:text-black text-xs">{item.quantity}x {item.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-gray-900 font-medium print:text-black text-xs">₹{item.price * item.quantity}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className="border-t-2 border-gray-300 pt-1 mb-2 print:border-black print:pt-0.5 print:mb-1">
                <div className="flex justify-between items-center">
                  <span className="text-base font-bold text-gray-900 print:text-black print:text-lg">TOTAL</span>
                  <span className="text-base font-bold text-red-900 print:text-black print:text-lg">₹{viewingOrder.total}</span>
                </div>
              </div>

              {/* Footer */}
              <div className="text-center text-xs text-gray-500 print:text-black mb-2 print:mb-1">
                <p>Thank you for your business!</p>
                <p>Please visit again</p>
              </div>

              {/* Action Buttons at Bottom */}
              <div className="flex gap-3 justify-center print:hidden mt-2">
                <button
                  onClick={() => window.print()}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  title="Print Bill"
                >
                  🖨️ Print
                </button>
                <button
                  onClick={closeOrderPopup}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors"
                  title="Close"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Confirm Deletion</h2>
              <button
                onClick={closeConfirmModal}
                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-6">
              <p className="text-gray-700">
                Are you sure you want to delete this order? This action cannot be undone.
              </p>
            </div>

            <div className="flex gap-2 sm:gap-3 justify-end flex-col sm:flex-row">
              <button
                onClick={closeConfirmModal}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-400 transition-colors text-sm sm:text-base"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors text-sm sm:text-base"
              >
                Delete Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Served Orders Modal */}
      {isServedOrdersModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full max-h-[80vh] overflow-y-auto shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">Recent Served Orders</h2>
              <button
                onClick={closeServedOrdersModal}
                className="p-1.5 sm:p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
                title="Close"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>

            {loadingServedOrders ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-red-600 mx-auto mb-3 sm:mb-4"></div>
                <div className="text-sm sm:text-base text-gray-600">Loading served orders...</div>
              </div>
            ) : servedOrders.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <History className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 opacity-50" />
                <div className="text-sm sm:text-base">No served orders yet</div>
                <div className="text-xs sm:text-sm mt-1 sm:mt-2">Orders that have been served will appear here</div>
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {servedOrders.map(order => (
                  <div key={order.id} className="p-3 sm:p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <span className="font-bold text-green-900 text-sm sm:text-base">#{order.order_number}</span>
                        <span className="px-1.5 py-0.5 sm:px-2 sm:py-1 bg-green-200 text-green-900 rounded-full text-xs font-semibold">
                          served
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-900 text-sm sm:text-base">₹{order.total}</div>
                      </div>
                    </div>

                    <div className="text-xs sm:text-sm text-green-800">
                      {order.items.map(item => (
                        <div key={item.id} className="flex justify-between py-0.5 sm:py-1">
                          <span className="break-words min-w-0 flex-1">{item.quantity}x {item.name}</span>
                          <span className="ml-2">₹{item.price * item.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payment Mode Selection Modal */}
      {isPaymentModeModalOpen && orderToServe && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Select Payment Mode</h2>
              <button
                onClick={closePaymentModeModal}
                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-6">
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold text-gray-900">Order #{orderToServe.order_number}</span>
                  <span className="font-bold text-lg text-red-900">₹{orderToServe.total}</span>
                </div>
                <div className="text-sm text-gray-600">
                  {orderToServe.items.map(item => (
                    <div key={item.id} className="flex justify-between">
                      <span>{item.quantity}x {item.name}</span>
                      <span>₹{item.price * item.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-gray-700 mb-4">
                How did the customer pay for this order?
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => handlePaymentModeSelection('cash')}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                💵 Cash
              </button>
              <button
                onClick={() => handlePaymentModeSelection('online')}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                📱 Online
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Revenue Modal */}
      {isPaymentRevenueModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-4 max-w-sm w-full max-h-[70vh] overflow-y-auto shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-900">Today's Payment Breakdown</h2>
              <button
                onClick={closePaymentRevenueModal}
                className="p-1 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Total Revenue */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-3 rounded-lg border border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-green-700 font-medium">Total Revenue</div>
                    <div className="text-xl font-bold text-green-900">₹{salesData.total_revenue}</div>
                  </div>
                  <div className="text-2xl">💰</div>
                </div>
              </div>

              {/* Cash & Online Payments in one row */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gradient-to-r from-yellow-50 to-amber-50 p-3 rounded-lg border border-yellow-200">
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-xs text-yellow-700 font-medium">Cash</div>
                    <div className="text-lg">💵</div>
                  </div>
                  <div className="text-sm font-bold text-yellow-900">₹{salesData.payment_breakdown.cash.revenue}</div>
                  <div className="text-xs text-yellow-600">{salesData.payment_breakdown.cash.orders} orders</div>
                </div>

                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-xs text-blue-700 font-medium">Online</div>
                    <div className="text-lg">📱</div>
                  </div>
                  <div className="text-sm font-bold text-blue-900">₹{salesData.payment_breakdown.online.revenue}</div>
                  <div className="text-xs text-blue-600">{salesData.payment_breakdown.online.orders} orders</div>
                </div>
              </div>

              {/* Payment Distribution - Compact */}
              <div className="bg-gray-50 p-3 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2 text-sm">Payment Distribution</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">Cash</span>
                    <span className="text-xs font-medium text-gray-900">
                      {salesData.total_revenue > 0
                        ? Math.round((salesData.payment_breakdown.cash.revenue / salesData.total_revenue) * 100)
                        : 0}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className="bg-yellow-500 h-1.5 rounded-full"
                      style={{
                        width: `${salesData.total_revenue > 0
                          ? (salesData.payment_breakdown.cash.revenue / salesData.total_revenue) * 100
                          : 0}%`
                      }}
                    ></div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">Online</span>
                    <span className="text-xs font-medium text-gray-900">
                      {salesData.total_revenue > 0
                        ? Math.round((salesData.payment_breakdown.online.revenue / salesData.total_revenue) * 100)
                        : 0}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className="bg-blue-500 h-1.5 rounded-full"
                      style={{
                        width: `${salesData.total_revenue > 0
                          ? (salesData.payment_breakdown.online.revenue / salesData.total_revenue) * 100
                          : 0}%`
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-200">
              <button
                onClick={closePaymentRevenueModal}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CafeOrderSystem;
