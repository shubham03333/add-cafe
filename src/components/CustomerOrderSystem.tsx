'use client';

import { useState, useEffect } from 'react';
import { MenuItem, OrderItem, CreateOrderRequest, Order } from '@/types';

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
      'Chilax cold cocoa': '/cold_cofee.jpeg',

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
    if (lowerDishName.includes('manch') && lowerDishName.includes('roll')) {
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
    return '/manch_roll.jpeg'; // fallback image
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
          setPaymentStatus(ourOrder.payment_status);
        } else {
          setOrderStatus('served');
          setPaymentStatus('paid'); // Assume paid if served
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
        total
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 p-2 sm:p-4 max-w-md mx-auto">
      {/* Modern Header */}
      <div className="bg-gradient-to-r from-red-500 via-red-600 to-red-700 rounded-2xl shadow-xl p-4 mb-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="Logo" className="w-12 h-12 sm:w-16 sm:h-16" />
              <div>
                <h3>Place Your Order</h3>
                {/* <p className="text-red-100 text-sm">Place Your Order</p> */}
              </div>
            </div>
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
                {paymentStatus === 'pending' && orderStatus !== 'served' && (
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
                {orderStatus === 'served' && (
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
          </div>
        </div>
      )}

      {(buildingOrder.length > 0 || isOrderActive) && (
        <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-2xl p-3 mb-4 border border-orange-200 shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-orange-500 rounded-full p-1.5">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <h3 className="font-bold text-orange-900 text-base">Your Order</h3>
          </div>

          <div className="space-y-2 mb-3">
            {buildingOrder.map(item => (
              <div key={item.id} className="bg-white rounded-lg p-2 shadow-sm border border-orange-100">
                <div className="flex justify-between items-center">
                  <div className="flex-1 min-w-0">
                    <span className="text-orange-900 font-semibold text-sm block mb-1">{item.name}</span>
                    <span className="text-orange-700 font-medium text-xs">₹{item.price} each</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {!orderNumber ? (
                      <div className="flex items-center gap-1 bg-orange-100 rounded-md p-1">
                        <button
                          onClick={() => updateBuildingOrderItemQuantity(item.id, item.quantity - 1)}
                          className="w-6 h-6 bg-orange-500 text-white rounded-md flex items-center justify-center hover:bg-orange-600 transition-colors text-xs font-bold min-h-[24px] min-w-[24px]"
                        >
                          −
                        </button>
                        <span className="w-6 text-center font-bold text-orange-900 text-xs">{item.quantity}</span>
                        <button
                          onClick={() => updateBuildingOrderItemQuantity(item.id, item.quantity + 1)}
                          className="w-6 h-6 bg-orange-500 text-white rounded-md flex items-center justify-center hover:bg-orange-600 transition-colors text-xs font-bold min-h-[24px] min-w-[24px]"
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <span className="text-orange-900 font-semibold text-xs">×{item.quantity}</span>
                    )}
                    <span className="font-bold text-orange-900 text-sm w-12 text-right">₹{item.price * item.quantity}</span>
                    {!orderNumber && (
                      <button
                        onClick={() => removeItemFromBuildingOrder(item.id)}
                        className="w-6 h-6 bg-red-100 hover:bg-red-200 text-red-600 rounded-md flex items-center justify-center transition-colors min-h-[24px] min-w-[24px]"
                        title="Remove item"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-lg p-3 shadow-sm border border-orange-100">
            <div className="flex justify-between items-center mb-3">
              <span className="font-bold text-orange-900 text-base">
                Total: ₹{buildingOrder.reduce((sum, item) => sum + (item.price * item.quantity), 0)}
              </span>
              <div className="text-xs text-orange-700">
                {buildingOrder.length} item{buildingOrder.length !== 1 ? 's' : ''}
              </div>
            </div>

            <div className="flex gap-2 items-center">
              {orderNumber ? (
                <div className="flex-1 bg-orange-100 text-orange-900 px-3 py-2 rounded-lg font-semibold text-xs text-center">
                  Order #{orderNumber}
                </div>
              ) : (
                <button
                  onClick={placeOrder}
                  disabled={isPlacingOrder}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-4 py-3 rounded-lg font-bold text-sm shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] flex items-center justify-center gap-2"
                >
                  {isPlacingOrder ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Placing Order...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Place Order
                    </>
                  )}
                </button>
              )}
            </div>
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
              onClick={() => !orderNumber && addToOrder(item, 1)}
              disabled={!!orderNumber}
              className={`w-full p-3 rounded-xl text-center font-medium min-h-[160px] flex flex-col justify-center transition-all duration-300 shadow-lg hover:shadow-xl cursor-pointer hover:scale-105 active:scale-95 ${
                orderNumber
                  ? 'bg-gray-200 cursor-not-allowed opacity-60'
                  : 'bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 active:from-red-700 active:to-red-800'
              }`}
            >
              <div className="flex flex-col items-center gap-2">
                <div className="relative">
                  <img
                    src={getDishImage(item.name)}
                    alt={item.name}
                    className="w-20 h-20 object-cover rounded-xl border-2 border-white/30 shadow-md"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '/water_bottle.png'; // fallback image
                    }}
                  />

                </div>
                <div className="flex-1 flex flex-col justify-between">
                  <div className="font-bold text-white text-xs leading-tight px-1 whitespace-normal text-center">{item.name}</div>
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

      {/* WhatsApp Chat Button */}
      <div className="max-w-md mx-auto relative">
        <button
          onClick={() => {
            const phoneNumber = '917558379411'; // Replace with actual cafe WhatsApp number
            const message = encodeURIComponent('Hello, I have placed Order kindly check your wahatsapp.');
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
