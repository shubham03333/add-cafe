 'use client';

import { useState, useEffect } from 'react';
import { MenuItem, OrderItem, CreateOrderRequest, Order, Table } from '@/types';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import TableSelection from './TableSelection';

// Google Pay type declarations
declare global {
  interface Window {
    google?: any;
  }
  namespace google {
    namespace payments {
      namespace api {
        class PaymentsClient {
          constructor(config: { environment: string });
          isReadyToPay(request: any): Promise<{ result: boolean }>;
          loadPaymentData(request: any): Promise<any>;
        }
      }
    }
  }
}

const CustomerOrderSystem = () => {
  const { customer, logout } = useCustomerAuth();
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [filteredMenuItems, setFilteredMenuItems] = useState<MenuItem[]>([]);
  const [buildingOrder, setBuildingOrder] = useState<OrderItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [orderStatus, setOrderStatus] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'paid' | 'failed'>('pending');
  const [lastKnownOrderStatus, setLastKnownOrderStatus] = useState<string | null>(null);
  const [showCartModal, setShowCartModal] = useState(false);
  const [isEditingOrder, setIsEditingOrder] = useState(false);
  const [editingOrderItems, setEditingOrderItems] = useState<OrderItem[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEditBuildingOrderModal, setShowEditBuildingOrderModal] = useState(false);
  const [editingBuildingOrderItems, setEditingBuildingOrderItems] = useState<OrderItem[]>([]);
  const [isEditingCart, setIsEditingCart] = useState(false);
  const [isLoadingEditModal, setIsLoadingEditModal] = useState(false);

  // Customer name states
  const [customerName, setCustomerName] = useState<string>(customer?.name || '');
  const [showNameModal, setShowNameModal] = useState(false);
  const [tempName, setTempName] = useState<string>('');

  // Order flow states
  const [currentStep, setCurrentStep] = useState<'tableSelection' | 'menu'>('tableSelection');
  const [selectedOrderType, setSelectedOrderType] = useState<'DINE_IN' | 'TAKEAWAY' | 'DELIVERY' | null>('DINE_IN');
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);

  // Order flow handlers
  const handleTableSelect = (table: Table) => {
    setSelectedTable(table);
    setCurrentStep('menu');
  };

  const handleBackToTableSelection = () => {
    setCurrentStep('tableSelection');
    setSelectedTable(null);
  };

  const handleTakeawaySelect = () => {
    setSelectedOrderType('TAKEAWAY');
    setSelectedTable(null);
    setCurrentStep('menu');
  };

  // New state for recent orders modal and data
  const [showRecentOrdersModal, setShowRecentOrdersModal] = useState(false);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);

  // Function to safely load recent orders from localStorage
  const loadRecentOrders = () => {
    try {
      if (typeof window !== 'undefined' && window.self === window.top) { // Check if not in iframe to avoid cross-origin issues
        const storedRecentOrders = localStorage.getItem('recentOrders');
        if (storedRecentOrders) {
          setRecentOrders(JSON.parse(storedRecentOrders));
        }
      } else {
        console.warn('Running in iframe, localStorage access blocked for security reasons');
        setRecentOrders([]); // Clear or handle accordingly
      }
    } catch (e) {
      console.error('Failed to load recent orders from localStorage', e);
      setRecentOrders([]);
    }
  };

  // Function to update recent order status in localStorage
  const updateRecentOrderStatus = (orderNumber: string, status: Order['status'], paymentStatus: Order['payment_status']) => {
    try {
      if (typeof window !== 'undefined' && window.self === window.top) {
        const storedRecentOrders = localStorage.getItem('recentOrders');
        if (storedRecentOrders) {
          let recentOrdersArray: Order[] = JSON.parse(storedRecentOrders);
          const orderIndex = recentOrdersArray.findIndex(order => order.order_number === orderNumber);
          if (orderIndex !== -1) {
            recentOrdersArray[orderIndex] = {
              ...recentOrdersArray[orderIndex],
              status,
              payment_status: paymentStatus
            };
            localStorage.setItem('recentOrders', JSON.stringify(recentOrdersArray));
            setRecentOrders(recentOrdersArray);
          }
        }
      }
    } catch (e) {
      console.error('Failed to update recent order status in localStorage', e);
    }
  };



  // Listen for recent orders update event
  useEffect(() => {
    const handleRecentOrdersUpdate = () => {
      loadRecentOrders();
    };

    window.addEventListener('recentOrdersUpdated', handleRecentOrdersUpdate);

    return () => {
      window.removeEventListener('recentOrdersUpdated', handleRecentOrdersUpdate);
    };
  }, []);

  // Extract unique categories from menu items
  const categories = ['All', ...Array.from(new Set(menuItems.map(item => item.category)))];

  // Function to get image URL for a dish
  const getDishImage = (dishName: string): string => {
    const imageMap: { [key: string]: string } = {
      // Exact matches
      'Cheese Roll': '/Chees_roll.jpeg',
      'Cold Coffee': '/cold_cofee.jpeg',
      'Dahi Vada': '/dahiVada.jpeg',
      'Munch Bhel': '/manch_bhel.jpeg',
      'Manch Roll': '/manch_roll.jpeg',
      'Masala Manch': '/masala_manch.jpeg',
      'Peri Peri Manch': '/peri_peri-Manch.jpeg',
      'Soup': '/soup.png',
      'Tea': '/tea.png',
      'Water Bottle': '/water_bottle.png',
      'Mini water bottle':'/water_bottle.png',
      'Chilax cold cocoa': '/cocoa.jpeg',

      // Alternative spellings/case variations
      'Cheese roll': '/Chees_roll.jpeg',
      'cheese roll': '/Chees_roll.jpeg',
      'Cold coffee': '/cold_cofee.jpeg',
      'cold coffee': '/cold_cofee.jpeg',
      'Dahi vada': '/dahiVada.jpeg',
      'dahi vada': '/dahiVada.jpeg',
      'Munch bhel': '/manch_bhel.jpeg',
      'munch bhel': '/manch_bhel.jpeg',
      'Manch roll': '/manch_roll.jpeg',
      'manch roll': '/manch_roll.jpeg',
      'Masala manch': '/masala_manch.jpeg',
      'Peri peri manch': '/peri_peri-Manch.jpeg',
      'peri peri manch': '/peri_peri-Manch.jpeg',
      'soup': '/soup.png',
      'tea': '/tea.png',
      'adda special combo':'/combo.jpeg',
      'mini Water Bottle':'/water_bottle.png',
      'Mini Water Bottle':'/water_bottle.png'
    };

    // Try exact match first
    if (imageMap[dishName]) {
      return imageMap[dishName];
    }

    // Try case-insensitive match with spaces replaced by underscores
    const normalizedName = dishName.toLowerCase().replace(/\s+/g, '_');
    const imageKeys = Object.keys(imageMap);
    for (const key of imageKeys) {
      if (key.toLowerCase().replace(/\s+/g, '_') === normalizedName) {
        return imageMap[key];
      }
    }

    // Try partial matches for common words
    const lowerDishName = dishName.toLowerCase();
    if (lowerDishName.includes('cheese') && lowerDishName.includes('roll')) {
      return '/Chees_roll.jpeg';
    }
    if (lowerDishName.includes('cold') && lowerDishName.includes('coffee')) {
      return '/cold_cofee.jpeg';
    }
    if (lowerDishName.includes('dahi') && lowerDishName.includes('vada')) {
      return '/dahiVada.jpeg';
    }
    if (lowerDishName.includes('munch') && lowerDishName.includes('bhel')) {
      return '/manch_bhel.jpeg';
    }
    if (lowerDishName.includes('munch') && lowerDishName.includes('roll')) {
      return '/manch_roll.jpeg';
    }
    if (lowerDishName.includes('masala') && lowerDishName.includes('manch')) {
      return '/masala_manch.jpeg';
    }
    if (lowerDishName.includes('peri') && lowerDishName.includes('manch')) {
      return '/peri_peri-Manch.jpeg';
    }
    if (lowerDishName.includes('soup')) {
      return '/soup.png';
    }
    if (lowerDishName.includes('tea')) {
      return '/tea.png';
    }
  if (lowerDishName.includes('mini') && lowerDishName.includes('water')) {
      return '/water_bottle.png';
    }
    // Return default image if no match found
    return '/adda.png'; // fallback image
  };
  useEffect(() => {
    let filtered = menuItems;

    // Apply category filter
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(query)
      );
    }

    setFilteredMenuItems(filtered);
  }, [menuItems, selectedCategory, searchQuery]);

  useEffect(() => {
    fetchMenu();

    // Fix flicker: fetch orders excluding served to keep edit button visible, but include cancelled
    const fetchActiveOrdersSafe = async () => {
      try {
        const response = await fetch('/api/orders?status=preparing,ready,pending,cancelled&includeServed=false');
        if (!response.ok) throw new Error('Failed to fetch orders');
        const data = await response.json();
        setActiveOrders(data);

        if (orderNumber !== null) {
          const ourOrder = data.find((order: Order) => order.order_number === orderNumber);
          if (ourOrder) {
            setOrderStatus(ourOrder.status);
            setPaymentStatus(ourOrder.payment_status);
            setLastKnownOrderStatus(ourOrder.status);
            updateRecentOrderStatus(orderNumber, ourOrder.status, ourOrder.payment_status);
          } else {
            // Order not found in active orders - it must have been deleted (cancelled)
            const finalStatus: Order['status'] = 'cancelled';
            const finalPaymentStatus: 'pending' | 'paid' | 'failed' = 'pending';

            setOrderStatus(finalStatus);
            setPaymentStatus(finalPaymentStatus);
            setLastKnownOrderStatus(finalStatus); // Update last known status

            // Update recent orders in localStorage with cancelled status
            updateRecentOrderStatus(orderNumber, finalStatus, finalPaymentStatus);
          }
        }
      } catch (err) {
        console.error('Failed to fetch orders:', err);
      }
    };

    fetchActiveOrdersSafe();

    const pollingInterval = setInterval(() => {
      if (orderNumber) {
        fetchActiveOrdersSafe();
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

    // Customer name is now managed through authenticated user context

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
      // Fetch orders including cancelled and served ones to distinguish status properly
      const response = await fetch('/api/orders?status=preparing,ready,served,cancelled&includeServed=true');
      if (!response.ok) throw new Error('Failed to fetch orders');
      const data = await response.json();
      setActiveOrders(data);

      if (orderNumber !== null) {
        const ourOrder = data.find((order: Order) => order.order_number === orderNumber);
        if (ourOrder) {
          setOrderStatus(ourOrder.status);
          setPaymentStatus(ourOrder.payment_status);
          setLastKnownOrderStatus(ourOrder.status); // Update last known status

          // Update recent orders in localStorage with current status
          updateRecentOrderStatus(orderNumber, ourOrder.status, ourOrder.payment_status);
        } else {
          // Order not found in active orders - it must have been deleted (cancelled)
          const finalStatus: Order['status'] = 'cancelled';
          const finalPaymentStatus: 'pending' | 'paid' | 'failed' = 'pending';

          setOrderStatus(finalStatus);
          setPaymentStatus(finalPaymentStatus);
          setLastKnownOrderStatus(finalStatus); // Update last known status

          // Update recent orders in localStorage with cancelled status
          updateRecentOrderStatus(orderNumber, finalStatus, finalPaymentStatus);
        }
      }
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    }
  };

  const addToOrder = (item: MenuItem, quantity: number) => {
    console.log('addToOrder called with item:', item.name, 'id:', item.id, 'quantity:', quantity);
    setBuildingOrder(prev => {
      console.log('prev buildingOrder:', prev);
      const existing = prev.find(p => p.id === item.id);
      console.log('existing:', existing);
      if (existing) {
        const newOrder = prev.map(p => p.id === item.id ? {...p, quantity: p.quantity + quantity} : p);
        console.log('updated existing, new buildingOrder:', newOrder);
        return newOrder;
      }
      const newOrder = [...prev, { ...item, quantity }];
      console.log('added new, new buildingOrder:', newOrder);
      return newOrder;
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
        order_type: selectedOrderType!,
        table_id: selectedOrderType === 'DINE_IN' ? selectedTable?.table_code : null
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
      setPaymentStatus('pending');
      setIsPlacingOrder(false); // Re-enable button after successful order
      console.log("Order placed successfully:", result.order_number); // Debugging statement
      console.log("Order number set to:", result.order_number); // Debugging statement

        // Save recent order to localStorage
        try {
          const storedRecentOrders = localStorage.getItem('recentOrders');
          let recentOrdersArray: Order[] = storedRecentOrders ? JSON.parse(storedRecentOrders) : [];

          // Create complete order object with all necessary data
          const completeOrder: Order = {
            ...result,
            items: buildingOrder,
            total: buildingOrder.reduce((sum, item) => sum + (item.price * item.quantity), 0),
            status: 'preparing',
            payment_status: 'pending'
          };

          // Add new order at the front
          recentOrdersArray = [completeOrder, ...recentOrdersArray.filter(o => o.order_number !== completeOrder.order_number)];
          // Limit to last 5 orders
          if (recentOrdersArray.length > 5) {
            recentOrdersArray = recentOrdersArray.slice(0, 5);
          }
          localStorage.setItem('recentOrders', JSON.stringify(recentOrdersArray));
          setRecentOrders(recentOrdersArray);

          // Trigger update event for other components to refresh recent orders
          window.dispatchEvent(new CustomEvent('recentOrdersUpdated'));
        } catch (e) {
          console.error('Failed to save recent orders to localStorage', e);
        }

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
    setPaymentStatus('pending');
    setIsPlacingOrder(false); // Reset placing order state for new order
  };

  const startEditingOrder = async () => {
    if (!orderNumber) return;

    const currentOrder = activeOrders.find(order => order.order_number === orderNumber);
    if (currentOrder && currentOrder.items) {
      setEditingOrderItems([...currentOrder.items]);

      // Check if menu items are loaded
      if (menuItems.length === 0 && !loading) {
        setIsLoadingEditModal(true);
        try {
          await fetchMenu();
        } catch (error) {
          console.error('Failed to fetch menu items for edit modal:', error);
        } finally {
          setIsLoadingEditModal(false);
        }
      }

      setShowEditModal(true);
    }
  };

  const updateEditingOrderItemQuantity = (itemId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      setEditingOrderItems(prev => prev.filter(item => item.id !== itemId));
    } else {
      setEditingOrderItems(prev => prev.map(item =>
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      ));
    }
  };

  const removeEditingOrderItem = (itemId: number) => {
    setEditingOrderItems(prev => prev.filter(item => item.id !== itemId));
  };

  const addItemToEditingOrder = (item: MenuItem, quantity: number) => {
    setEditingOrderItems(prev => {
      const existing = prev.find(p => p.id === item.id);
      if (existing) {
        return prev.map(p => p.id === item.id ? {...p, quantity: p.quantity + quantity} : p);
      }
      return [...prev, { ...item, quantity }];
    });
  };

  const saveEditedOrder = async () => {
    if (!orderNumber || editingOrderItems.length === 0) return;

    try {
      const total = editingOrderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      // Find the current order to get the database ID
      const currentOrder = activeOrders.find(order => order.order_number === orderNumber);
      if (!currentOrder) {
        throw new Error('Order not found');
      }

      const response = await fetch(`/api/orders/${currentOrder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: editingOrderItems,
          total
        })
      });

      if (!response.ok) throw new Error('Failed to update order');

      const result = await response.json();
      setShowEditModal(false);
      setEditingOrderItems([]);
      fetchActiveOrders(); // Refresh orders to show updated data

      // Update recent orders in localStorage with the edited items and total
      try {
        const storedRecentOrders = localStorage.getItem('recentOrders');
        if (storedRecentOrders) {
          let recentOrdersArray: Order[] = JSON.parse(storedRecentOrders);
          const orderIndex = recentOrdersArray.findIndex(order => order.order_number === orderNumber);
          if (orderIndex !== -1) {
            recentOrdersArray[orderIndex] = {
              ...recentOrdersArray[orderIndex],
              items: editingOrderItems,
              total: total
            };
            localStorage.setItem('recentOrders', JSON.stringify(recentOrdersArray));
            setRecentOrders(recentOrdersArray);

            // Trigger update event for other components to refresh recent orders
            window.dispatchEvent(new CustomEvent('recentOrdersUpdated'));
          }
        }
      } catch (e) {
        console.error('Failed to update recent orders in localStorage', e);
      }

      console.log("Order updated successfully:", result);
    } catch (err) {
      setError('Failed to update order');
      console.error(err);
    }
  };

  const cancelEditingOrder = () => {
    setShowEditModal(false);
    setEditingOrderItems([]);
  };

  const handlePayment = async () => {
    if (!orderNumber) return;

    try {
      // Calculate total amount
      const totalAmount = buildingOrder.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      // Google Pay configuration
      const paymentDataRequest = {
        apiVersion: 2,
        apiVersionMinor: 0,
        allowedPaymentMethods: [
          {
            type: 'CARD',
            parameters: {
              allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
              allowedCardNetworks: ['AMEX', 'DISCOVER', 'INTERAC', 'JCB', 'MASTERCARD', 'VISA']
            },
            tokenizationSpecification: {
              type: 'PAYMENT_GATEWAY',
              parameters: {
                gateway: 'example',
                gatewayMerchantId: 'exampleGatewayMerchantId'
              }
            }
          }
        ],
        merchantInfo: {
          merchantId: '12345678901234567890',
          merchantName: 'Cafe Adda'
        },
        transactionInfo: {
          totalPriceStatus: 'FINAL',
          totalPrice: totalAmount.toString(),
          currencyCode: 'INR',
          countryCode: 'IN'
        }
      };

      // Check if Google Pay is available
      const paymentsClient = new google.payments.api.PaymentsClient({
        environment: 'TEST' // Change to 'PRODUCTION' for live
      });

      const isReadyToPay = await paymentsClient.isReadyToPay({
        apiVersion: 2,
        apiVersionMinor: 0,
        allowedPaymentMethods: paymentDataRequest.allowedPaymentMethods
      });

      if (!isReadyToPay.result) {
        throw new Error('Google Pay is not available');
      }

      // Load payment data
      const paymentData = await paymentsClient.loadPaymentData(paymentDataRequest);

      // If payment successful, update order status
      const response = await fetch(`/api/orders/${orderNumber}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethod: 'google_pay',
          paymentData: paymentData
        })
      });

      if (!response.ok) throw new Error('Payment processing failed');

      const result = await response.json();
      setPaymentStatus('paid');
      console.log("Payment successful:", result);

      // Trigger refresh in other components (like CafeOrderSystem)
      localStorage.setItem('orderUpdateTrigger', Date.now().toString());
      window.dispatchEvent(new CustomEvent('orderUpdated'));

    } catch (err) {
      console.error('Payment failed:', err);
      setPaymentStatus('failed');
    }
  };

  const isOrderActive = orderNumber !== null && orderStatus !== 'served';

  // Fix: Adjust isOrderActive to consider only 'preparing', 'ready', 'pending' as active
  const isOrderEditable = orderNumber !== null && (orderStatus === 'preparing' || orderStatus === 'ready' || orderStatus === 'pending');

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

  // Conditional rendering based on current step
  if (currentStep === 'tableSelection') {
    return <TableSelection onTableSelect={handleTableSelect} onTakeawaySelect={handleTakeawaySelect} />;
  }

  // Menu step (currentStep === 'menu')
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 p-2 sm:p-4 max-w-md mx-auto">
      {/* Modern Header */}
      <div className="bg-gradient-to-r from-red-500 via-red-600 to-red-700 rounded-2xl shadow-xl p-4 mb-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative z-10">
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-3 flex-1">
          <img src="/logo.png" alt="Logo" className="w-12 h-12 sm:w-16 sm:h-16" />
          <div className="flex-1">
            {/* <h3>Place Your Order</h3> */}
            {customerName && (
              <p className="text-red-100 text-sm">Welcome, {customerName}!</p>
            )}
          </div>
          <button
            onClick={() => {
              setShowRecentOrdersModal(true);
              loadRecentOrders();
            }}
            className="bg-white/30 hover:bg-white/50 backdrop-blur-md text-white px-3 py-2 rounded-2xl text-xs font-semibold shadow-lg transition-all duration-300 min-h-[40px] flex items-center gap-2 border border-white/40 hover:border-white cursor-pointer ml-2"
            title="Recent Orders"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18M3 18h18" />
            </svg>
            Recent Orders
          </button>
        </div>
        <div className="flex items-center gap-2">
          {(buildingOrder.length > 0 || isOrderActive) && !orderNumber && (
            <button
              onClick={clearOrder}
              className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 min-h-[44px] flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Clear
            </button>
          )}
          {/* <button
            onClick={() => setShowNameModal(true)}
            className="bg-white/30 hover:bg-white/50 backdrop-blur-md text-white px-3 py-2 rounded-2xl text-xs font-semibold shadow-lg transition-all duration-300 min-h-[40px] flex items-center gap-2 border border-white/40 hover:border-white cursor-pointer"
            title="Set Customer Name"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            {customerName ? 'Update Name' : 'Set Name'}
          </button> */}
        </div>
      </div>
        </div>
      </div>

      {orderNumber && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-4 mb-4 border border-blue-200 shadow-lg">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-blue-500 rounded-full p-2">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="font-bold text-blue-900 text-lg">Order Status</h3>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="text-blue-900 font-bold text-lg mb-1">Order #{orderNumber}</div>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-3 h-3 rounded-full ${
                    orderStatus === 'served' ? 'bg-green-500' :
                    orderStatus === 'preparing' ? 'bg-yellow-500' :
                    orderStatus === 'ready' ? 'bg-orange-500' : 'bg-gray-400'
                  }`}></div>
                  <span className="text-sm font-medium text-gray-700 capitalize">
                    {orderStatus || 'Processing'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${
                    paymentStatus === 'paid' ? 'bg-green-500' :
                    paymentStatus === 'failed' ? 'bg-red-500' : 'bg-yellow-500'
                  }`}></div>
                  <span className="text-sm font-medium text-gray-700">
                    Payment: {paymentStatus === 'paid' ? 'Paid' : paymentStatus === 'failed' ? 'Failed' : 'Pending'}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                {paymentStatus === 'pending' && isOrderEditable && (
                  <button
                    onClick={handlePayment}
                    className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 py-3 rounded-xl font-semibold text-sm shadow-lg hover:shadow-xl transition-all duration-200 min-h-[48px] flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    Pay ₹{buildingOrder.reduce((sum, item) => sum + (item.price * item.quantity), 0)}
                  </button>
                )}

                {isOrderEditable && (
                  <button
                    onClick={startEditingOrder}
                    className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white px-4 py-3 rounded-xl font-semibold text-sm shadow-lg hover:shadow-xl transition-all duration-200 min-h-[48px] flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit Order
                  </button>
                )}

                {(!isOrderEditable && (orderStatus === 'served' || orderStatus === 'cancelled')) && (
                  <button
                    onClick={startNewOrder}
                    className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-4 py-3 rounded-xl font-semibold text-sm shadow-lg hover:shadow-xl transition-all duration-200 min-h-[48px] flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    New Order
                  </button>
                )}
              </div>
            </div>

            {/* Order Items Display */}
            {(() => {
              const currentOrder = Array.isArray(activeOrders) ? activeOrders.find(order => order.order_number === orderNumber) : null;
              if (currentOrder && currentOrder.items && currentOrder.items.length > 0) {
                return (
                  <div className="border-t border-gray-200 pt-4">
                    <h4 className="font-semibold text-gray-900 mb-3">Order Items</h4>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {currentOrder.items.map((item, index) => (
                        <div key={index} className="flex justify-between items-center bg-gray-50 rounded-lg p-3">
                          <div className="flex-1 min-w-0">
                            <span className="text-gray-900 font-medium text-sm block">{item.name}</span>
                            <span className="text-gray-600 text-xs">₹{item.price} × {item.quantity}</span>
                          </div>
                          <span className="font-bold text-gray-900 text-sm">₹{item.price * item.quantity}</span>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-gray-200 mt-3 pt-3">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-gray-900 text-lg">Total: ₹{currentOrder.total}</span>
                        <span className="text-sm text-gray-600">{currentOrder.items.length} item{currentOrder.items.length !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            })()}
          </div>
        </div>
      )}



      <div className="bg-white rounded-2xl shadow-xl p-4 mb-4">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-3">
            <div className="bg-purple-500 rounded-full p-2">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h2 className="font-bold text-gray-800 text-lg">Menu Items</h2>
          </div>
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="bg-gray-100 hover:bg-gray-200 p-3 rounded-xl transition-colors min-h-[48px] min-w-[48px] flex items-center justify-center"
            title="Search menu items"
          >
            <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </div>

        {/* Search Bar - Conditionally Rendered */}
        {showSearch && (
          <div className="mb-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Search menu items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 text-base shadow-sm"
                autoFocus
              />
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center"
                >
                  <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2 mb-2 overflow-x-auto">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => {
                setSelectedCategory(category);
                setSearchQuery(''); // Clear search when changing category
              }}
              className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-200 min-h-[40px] ${
                selectedCategory === category
                  ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {buildingOrder.length === 0 && !orderNumber && (
          <div className="text-center py-4 text-gray-500 mb-2">
            {/* <div className="bg-gray-50 rounded-xl p-6"> */}
              {/* <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg> */}
              {/* <div className="text-lg font-medium text-gray-600">Select items to build your order</div> */}
              <div className="text-sm text-gray-500 mt-1">Tap on any menu item to add it to your cart</div>
            {/* </div> */}
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          {filteredMenuItems.map(item => (
            <button
              key={item.id}
              onClick={() => addToOrder(item, 1)}
      className="w-full p-3 rounded-xl text-center font-medium min-h-[180px] flex flex-col justify-center transition-all duration-300 shadow-lg hover:shadow-xl cursor-pointer hover:scale-105 active:scale-95 bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 active:from-red-700 active:to-red-800"
            >
              <div className="flex flex-col items-center gap-2">
                <div className="relative">
                  <img
                    src={getDishImage(item.name)}
                    alt={item.name}
                    className="w-24 h-24 object-cover rounded-xl border-2 border-white/30 shadow-md"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '/water_bottle.png'; // fallback image
                    }}
                  />

                </div>
                <div className="flex-1 flex flex-col justify-between">
                  <div className="font-bold text-white text-[10px] leading-tight px-1 whitespace-normal text-center">{item.name}</div>
                  <div className="bg-white/20 backdrop-blur-sm text-white font-bold rounded-lg px-2 py-1 mt-1 text-xs shadow-sm">₹{item.price}</div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {buildingOrder.length === 0 && menuItems.length === 0 && !loading && (
          <div className="text-center py-12 text-gray-500">
            <div className="text-lg">No menu items available</div>
            <div className="text-sm mt-2">Please check back later</div>
          </div>
        )}
      </div>

      {/* Fixed Bottom Cart Bar */}
      {buildingOrder.length > 0 && (
        <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40 max-w-md mx-auto">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-orange-500 rounded-full p-2">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
                <div>
                  <div className="font-semibold text-gray-900">
                    {buildingOrder.length} item{buildingOrder.length !== 1 ? 's' : ''}
                  </div>
                  <div className="text-sm text-gray-600">
                    ₹{buildingOrder.reduce((sum, item) => sum + (item.price * item.quantity), 0)}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowCartModal(true)}
                className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-6 py-3 rounded-xl font-semibold text-sm shadow-lg hover:shadow-xl transition-all duration-200"
              >
                View Cart
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cart Modal */}
      {showCartModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center pt-4 pb-4">
          <div className="bg-white w-full max-w-md mx-4 rounded-3xl max-h-[95vh] overflow-hidden shadow-2xl">
            <div className="p-3 sm:p-4">
        {/* Modal Header */}
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h3 className="text-base sm:text-lg font-bold text-gray-900">
            {isEditingCart ? 'Add Items to Cart' : (orderNumber ? `Order #${orderNumber}` : 'Your Order')}
          </h3>
          <button
            onClick={() => setShowCartModal(false)}
            className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-2 py-1.5 rounded-md font-semibold text-xs shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-1.5"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Item
          </button>
        </div>

        {/* Order Items */}
              <div className="space-y-3 mb-4 sm:mb-6 max-h-80 sm:max-h-96 overflow-y-auto">
                {(() => {
                  // Show building order items if no order number, otherwise show placed order items
                  const itemsToShow = orderNumber
                    ? (activeOrders && Array.isArray(activeOrders) ? activeOrders.find(order => order.order_number === orderNumber)?.items || [] : [])
                    : buildingOrder;

                  return itemsToShow.map(item => (
                    <div key={item.id} className="bg-gray-50 rounded-lg p-3 sm:p-4">
                      <div className="flex justify-between items-center">
                        <div className="flex-1 min-w-0 mr-3">
                          <span className="text-gray-900 font-semibold text-sm sm:text-base block mb-1">{item.name}</span>
                          <span className="text-gray-600 font-medium text-xs sm:text-sm">₹{item.price} each</span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {!orderNumber && (
                            <div className="flex items-center gap-1 bg-white rounded-md p-1 border">
                              <button
                                onClick={() => updateBuildingOrderItemQuantity(item.id, item.quantity - 1)}
                                className="w-6 h-6 sm:w-7 sm:h-7 bg-orange-500 text-white rounded-md flex items-center justify-center hover:bg-orange-600 transition-colors text-xs sm:text-sm font-bold"
                              >
                                −
                              </button>
                              <span className="w-6 sm:w-8 text-center font-bold text-gray-900 text-xs sm:text-sm">{item.quantity}</span>
                              <button
                                onClick={() => updateBuildingOrderItemQuantity(item.id, item.quantity + 1)}
                                className="w-6 h-6 sm:w-7 sm:h-7 bg-orange-500 text-white rounded-md flex items-center justify-center hover:bg-orange-600 transition-colors text-xs sm:text-sm font-bold"
                              >
                                +
                              </button>
                            </div>
                          )}
                          {orderNumber && (
                            <span className="w-6 sm:w-8 text-center font-bold text-gray-900 text-xs sm:text-sm">×{item.quantity}</span>
                          )}
                          <span className="font-bold text-gray-900 text-sm sm:text-base w-12 sm:w-16 text-right">₹{item.price * item.quantity}</span>
                          {!orderNumber && (
                            <button
                              onClick={() => removeItemFromBuildingOrder(item.id)}
                              className="w-6 h-6 sm:w-7 sm:h-7 bg-red-100 hover:bg-red-200 text-red-600 rounded-md flex items-center justify-center transition-colors"
                              title="Remove item"
                            >
                              <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ));
                })()}
              </div>

              {/* Total and Actions */}
              <div className="border-t border-gray-200 pt-4">
                <div className="flex justify-between items-center mb-4">
                  <span className="font-bold text-gray-900 text-lg sm:text-xl">
                    Total: ₹{(() => {
                      if (orderNumber) {
                        const currentOrder = activeOrders && Array.isArray(activeOrders) ? activeOrders.find(order => order.order_number === orderNumber) : null;
                        return currentOrder?.total || 0;
                      }
                      return buildingOrder.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                    })()}
                  </span>
                  <div className="text-xs sm:text-sm text-gray-600">
                    {(() => {
                      if (orderNumber) {
                        const currentOrder = activeOrders && Array.isArray(activeOrders) ? activeOrders.find(order => order.order_number === orderNumber) : null;
                        const itemCount = currentOrder?.items?.length || 0;
                        return `${itemCount} item${itemCount !== 1 ? 's' : ''}`;
                      }
                      return `${buildingOrder.length} item${buildingOrder.length !== 1 ? 's' : ''}`;
                    })()}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex flex-row gap-2 sm:gap-3">
                    {!orderNumber && (
                      <>
                        <button
                          onClick={() => {
                            clearOrder();
                            setShowCartModal(false);
                          }}
                          className="flex-1 bg-gradient-to-r from-red-400 to-red-500 hover:from-red-500 hover:to-red-600 text-white px-2 py-1.5 sm:px-3 sm:py-2 rounded-md sm:rounded-lg font-semibold text-xs sm:text-sm shadow-sm sm:shadow-md hover:shadow-lg transition-all duration-200 min-h-[36px] sm:min-h-[40px] flex items-center justify-center"
                        >
                          <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Clear Cart
                        </button>
                        <button
                          onClick={() => {
                            placeOrder();
                            setShowCartModal(false);
                          }}
                          disabled={isPlacingOrder}
                          className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-2 py-1.5 sm:px-3 sm:py-2 rounded-md sm:rounded-lg font-semibold text-xs sm:text-sm shadow-sm sm:shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed min-h-[36px] sm:min-h-[40px]"
                        >
                          {isPlacingOrder ? (
                            <>
                              <svg className="w-3 h-3 sm:w-4 sm:h-4 animate-spin mr-1 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                              Placing Order...
                            </>
                          ) : (
                            'Place Order'
                          )}
                        </button>
                      </>
                    )}
                    {orderNumber && (
                      <>
                        <button
                          onClick={() => setShowCartModal(false)}
                          className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-2 py-1.5 sm:px-3 sm:py-2 rounded-md sm:rounded-lg font-semibold text-xs sm:text-sm shadow-sm sm:shadow-md hover:shadow-lg transition-all duration-200 min-h-[36px] sm:min-h-[40px] flex items-center justify-center"
                        >
                          Close
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Orders Modal */}
      {showRecentOrdersModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto shadow-2xl border border-gray-300">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">Recent Orders</h3>
              <button
                onClick={() => setShowRecentOrdersModal(false)}
                className="text-gray-600 hover:text-gray-900 transition-colors"
                title="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {recentOrders.length === 0 ? (
              <p className="text-gray-600">No recent orders found.</p>
            ) : (
              <ul className="space-y-3">
                {recentOrders.map(order => (
                  <li key={order.order_number} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-semibold text-gray-900">Order #{order.order_number}</span>
                      <span className="text-sm text-gray-600 capitalize">{order.status}</span>
                    </div>
                    <div className="text-sm text-gray-700">
                      {order.items && order.items.length > 0 ? (
                        <ul className="list-disc list-inside max-h-24 overflow-y-auto">
                          {order.items.map(item => (
                            <li key={item.id}>
                              {item.name} × {item.quantity}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span>No items</span>
                      )}
                    </div>
                    <div className="mt-2 font-bold text-gray-900">Total: ₹{order.total}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Edit Order Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity duration-300">
          <div className="bg-white rounded-xl p-6 max-w-md w-full max-h-[85vh] overflow-y-auto shadow-2xl border border-gray-200 transform transition-all duration-300 scale-100">
            {/* Header */}
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 bg-gradient-to-r from-red-600 to-red-800 bg-clip-text text-transparent">
                  Edit Order #{orderNumber}
                </h2>
                <p className="text-sm text-gray-600 mt-1">Modify items and quantities</p>
              </div>
              <button
                onClick={cancelEditingOrder}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors duration-200"
                title="Cancel"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Current Items Section */}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-4 text-lg flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                Current Items
              </h3>
              <div className="space-y-3">
                {editingOrderItems.map(item => (
                  <div key={item.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors duration-200">
                    <div className="flex-1 min-w-0">
                      <span className="text-gray-900 font-medium text-sm block truncate">{item.name}</span>
                      <span className="text-gray-600 text-xs">₹{item.price} each</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 bg-white rounded-full p-1 shadow-sm">
                        <button
                          onClick={() => updateEditingOrderItemQuantity(item.id, item.quantity - 1)}
                          className="w-8 h-8 bg-gray-100 text-gray-700 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors duration-200 font-semibold text-lg"
                          title="Decrease quantity"
                        >
                          -
                        </button>
                        <span className="w-8 text-center font-bold text-gray-900 text-sm">{item.quantity}</span>
                        <button
                          onClick={() => updateEditingOrderItemQuantity(item.id, item.quantity + 1)}
                          className="w-8 h-8 bg-red-100 text-red-700 rounded-full flex items-center justify-center hover:bg-red-200 transition-colors duration-200 font-semibold text-lg"
                          title="Increase quantity"
                        >
                          +
                        </button>
                      </div>
                      <button
                        onClick={() => removeEditingOrderItem(item.id)}
                        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full transition-colors duration-200"
                        title="Remove item"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
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
              {(loading || isLoadingEditModal) ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
                  <p className="text-gray-600 mt-2">Loading menu items...</p>
                </div>
              ) : menuItems.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  <p className="text-lg font-medium">No menu items available</p>
                  <p className="text-sm mt-1">Please try again later</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {menuItems.map(item => (
                    <button
                      key={item.id}
                      onClick={() => addItemToEditingOrder(item, 1)}
                      className="bg-gradient-to-r from-red-500 to-red-700 hover:from-red-600 hover:to-red-800 text-white p-2 rounded-md font-medium text-xs transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg flex flex-col items-center justify-center min-h-[60px]"
                    >
                      <div className="font-semibold text-xs leading-tight text-center mb-1">{item.name}</div>
                      <div className="text-xs opacity-90 bg-white/20 rounded px-1.5 py-0.5">₹{item.price}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Total and Action Buttons */}
            <div className="border-t border-gray-200 pt-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <div className="text-sm text-gray-600">Order Total</div>
                  <div className="text-2xl font-bold text-gray-900">
                    ₹{editingOrderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)}
                  </div>
                </div>
                <div className="flex gap-2 sm:gap-3 flex-col sm:flex-row">
                  <button
                    onClick={cancelEditingOrder}
                    className="px-3 py-1.5 sm:px-4 sm:py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-all duration-200 border border-gray-300 text-xs sm:text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveEditedOrder}
                    disabled={editingOrderItems.length === 0}
                    className="px-3 py-1.5 sm:px-4 sm:py-2 bg-gradient-to-r from-red-600 to-red-800 text-white rounded-lg font-medium hover:from-red-700 hover:to-red-900 transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-1.5 justify-center text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Save Changes
                  </button>
                </div>
              </div>

              {editingOrderItems.length === 0 && (
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

      {/* Customer Name Modal */}
      {/* {showNameModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-gray-300">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">
                {customerName ? 'Update Customer Name' : 'Set Customer Name'}
              </h3>
              <button
                onClick={() => {
                  setShowNameModal(false);
                  setTempName('');
                }}
                className="text-gray-600 hover:text-gray-900 transition-colors"
                title="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="customerName" className="block text-sm font-medium text-gray-700 mb-2">
                  Customer Name
                </label>
                <input
                  id="customerName"
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  placeholder="Enter customer name"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900 text-base shadow-sm"
                  autoFocus
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowNameModal(false);
                    setTempName('');
                  }}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (tempName.trim()) {
                      // Customer name is now managed through authenticated user context
                      localStorage.setItem('customerName', tempName.trim());
                      setShowNameModal(false);
                      setTempName('');
                    }
                  }}
                  disabled={!tempName.trim()}
                  className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {customerName ? 'Update' : 'Set Name'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )} */}

      {/* WhatsApp Chat Button */}
      <div className="max-w-md mx-auto relative">
        <button
          onClick={() => {
            const phoneNumber = '917558379410'; // Replace with actual cafe WhatsApp number
            const message = encodeURIComponent('Hello, I have placed Order kindly check your whatsapp.');
            const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;
            window.open(whatsappUrl, '_blank');
          }}
          className="fixed bottom-4 right-4 bg-green-500 hover:bg-green-600 text-white p-3 rounded-full shadow-lg transition-colors duration-200 z-50 max-w-[56px] max-h-[56px]"
          title="Chat with us on WhatsApp"
        >
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default CustomerOrderSystem;
