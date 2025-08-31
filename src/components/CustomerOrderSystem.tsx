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
    <div className="min-h-screen bg-gray-100 p-3 max-w-md mx-auto">
      <div className="bg-gradient-to-r from-red-600 to-red-800 rounded-lg shadow-lg p-3 mb-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Logo" className="w-16 h-16 sm:w-20 sm:h-20" />
            <h1 className="text-lg sm:text-xl font-bold text-white">Place Your Order</h1>
          </div>
          {(buildingOrder.length > 0 || isOrderActive) && !orderNumber && (
            <button
              onClick={clearOrder}
              className="px-2 py-1 bg-red-500 text-white rounded text-xs sm:text-sm hover:bg-red-600"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {orderNumber && (
        <div className="bg-red-100 rounded-lg p-3 mb-3 border-2 border-red-300">
          <h3 className="font-semibold text-red-900 mb-2 text-sm sm:text-base">Your Order Status:</h3>
          <div className="flex justify-between items-center">
            <div>
              <div className="text-red-900 font-medium text-sm sm:text-base">Order #{orderNumber}</div>
              <div className="text-xs sm:text-sm text-red-700">
                Status: {orderStatus || 'processing'}
              </div>
              <div className="text-xs sm:text-sm text-red-700">
                Payment: {paymentStatus === 'paid' ? 'Paid' : paymentStatus === 'failed' ? 'Failed' : 'Pending'}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {paymentStatus === 'pending' && orderStatus !== 'served' && (
                <button
                  onClick={handlePayment}
                  className="px-3 py-1 sm:px-4 sm:py-2 bg-blue-600 text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-blue-700"
                >
                  Pay ₹{buildingOrder.reduce((sum, item) => sum + (item.price * item.quantity), 0)}
                </button>
              )}
              {orderStatus === 'served' && (
                <button
                  onClick={startNewOrder}
                  className="px-3 py-1 sm:px-4 sm:py-2 bg-green-600 text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-green-700"
                >
                  New Order
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {(buildingOrder.length > 0 || isOrderActive) && (
        <div className="bg-red-100 rounded-lg p-3 mb-3 border-2 border-red-300">
          <h3 className="font-semibold text-red-900 mb-2 text-sm sm:text-base">Your Order:</h3>
          {buildingOrder.map(item => (
            <div key={item.id} className="flex justify-between items-center py-2 border-b border-red-300">
              <span className="text-red-900 font-medium text-sm sm:text-base">{item.name}</span>
              <div className="flex items-center gap-1 sm:gap-2">
                {!orderNumber ? (
                  <>
                    <button
                      onClick={() => updateBuildingOrderItemQuantity(item.id, item.quantity - 1)}
                      className="w-5 h-5 sm:w-6 sm:h-6 bg-red-600 text-white rounded flex items-center justify-center hover:bg-red-700 transition-colors text-xs sm:text-sm"
                    >
                      -
                    </button>
                    <span className="w-5 text-center font-semibold text-red-900 text-xs sm:text-sm">{item.quantity}</span>
                    <button
                      onClick={() => updateBuildingOrderItemQuantity(item.id, item.quantity + 1)}
                      className="w-5 h-5 sm:w-6 sm:h-6 bg-red-600 text-white rounded flex items-center justify-center hover:bg-red-700 transition-colors text-xs sm:text-sm"
                    >
                      +
                    </button>
                  </>
                ) : (
                  <span className="w-5 text-center font-semibold text-red-900 text-xs sm:text-sm">×{item.quantity}</span>
                )}
                <span className="font-medium text-red-900 w-12 sm:w-16 text-right text-xs sm:text-sm">₹{item.price * item.quantity}</span>
                {!orderNumber && (
                  <button
                    onClick={() => removeItemFromBuildingOrder(item.id)}
                    className="p-1 sm:p-2 text-red-600 hover:text-red-800 hover:bg-red-100 rounded transition-colors"
                    title="Remove item"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          ))}
          <div className="border-t border-red-300 pt-2 mt-2 flex justify-between items-center">
            <span className="font-bold text-red-900 text-sm sm:text-base">
              Total: ₹{buildingOrder.reduce((sum, item) => sum + (item.price * item.quantity), 0)}
            </span>
            <div className="flex gap-1 sm:gap-2 items-center">
              {orderNumber ? (
                <span className="text-red-900 font-medium text-xs sm:text-sm">Order #{orderNumber}</span>
              ) : (
                <button 
                  onClick={placeOrder}
                  disabled={isPlacingOrder}
                  className="bg-red-600 text-white px-3 py-1 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPlacingOrder ? 'Order Placed' : 'Place Order'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-lg p-3">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-semibold text-gray-800 text-base sm:text-lg">Menu Items</h2>
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="p-1 sm:p-2 text-gray-600 hover:text-red-600 hover:bg-gray-100 rounded-full transition-colors"
            title="Search menu items"
          >
            <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </div>

        {/* Search Bar - Conditionally Rendered */}
        {showSearch && (
          <div className="mb-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Search menu items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-1 sm:px-4 sm:py-2 pl-8 sm:pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 text-gray-900 text-sm sm:text-base"
                autoFocus
              />
              <div className="absolute inset-y-0 left-0 pl-2 sm:pl-3 flex items-center pointer-events-none">
                <svg className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-2 sm:pr-3 flex items-center"
                >
                  <svg className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-1 mb-2">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => {
                setSelectedCategory(category);
                setSearchQuery(''); // Clear search when changing category
              }}
              className={`px-2 py-1 sm:px-3 sm:py-1 rounded-full text-xs sm:text-sm font-medium ${
                selectedCategory === category
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
        
        {buildingOrder.length === 0 && !orderNumber && (
          <div className="text-center py-4 sm:py-6 text-gray-500 mb-2">
            <div className="text-sm sm:text-lg">Select items to build your order</div>
            {/* <div className="text-xs sm:text-sm mt-1">Click on menu items to add them to your order</div> */}
           </div>
        )}
        
        <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
          {filteredMenuItems.map(item => (
            <button
              key={item.id}
              onClick={() => !orderNumber && addToOrder(item, 1)}
              disabled={!!orderNumber}
              className={`w-full p-2 sm:p-4 rounded-lg text-center font-medium min-h-[70px] sm:min-h-[90px] flex flex-col justify-center transition-all duration-300 shadow-md hover:shadow-lg cursor-pointer hover:scale-105 ${
                orderNumber 
                  ? 'bg-gray-400 cursor-not-allowed opacity-70' 
                  : 'bg-gradient-to-br from-red-600 to-red-800 hover:from-red-700 hover:to-red-900'
              }`}
            >
              <div className="font-semibold text-xs sm:text-sm leading-tight px-1 overflow-hidden" style={{ 
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical'
              }}>{item.name}</div>
              <div className="text-[10px] sm:text-xs opacity-90 mt-1 sm:mt-2 bg-white/20 rounded px-1 py-0.5">₹{item.price}</div>
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
