'use client';

import React, { useState, useEffect } from 'react';
import { Package, AlertTriangle, CheckCircle, RefreshCw, Plus, Minus, Box, Edit } from 'lucide-react';
import { MenuItem } from '@/types';
import RawMaterialsManager from './RawMaterialsManager';

interface InventoryStats {
  totalItems: number;
  lowStockItems: number;
  outOfStockItems: number;
  totalStockValue: number;
}

const InventoryDashboard: React.FC = () => {
  const [inventory, setInventory] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<InventoryStats>({
    totalItems: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
    totalStockValue: 0
  });
  const [activeTab, setActiveTab] = useState<'menu' | 'raw-materials'>('menu');

const fetchInventory = async (isBackgroundRefresh = false) => {
    try {
        if (!isBackgroundRefresh) {
            setLoading(true);
        } else {
            setIsRefreshing(true);
        }
        const response = await fetch('/api/inventory');
        if (!response.ok) throw new Error('Failed to fetch inventory');
        const data = await response.json();
        setInventory(data);
        calculateStats(data);
    } catch (err) {
        setError('Failed to load inventory');
        console.error(err);
    } finally {
        if (!isBackgroundRefresh) {
            setLoading(false);
        } else {
            setIsRefreshing(false);
        }
    }
  };

  const calculateStats = (items: MenuItem[]) => {
    const totalItems = items.length;
    const lowStockItems = items.filter(item => 
      (item.stock_quantity || 0) <= (item.low_stock_threshold || 5) && 
      (item.stock_quantity || 0) > 0
    ).length;
    const outOfStockItems = items.filter(item => (item.stock_quantity || 0) <= 0).length;
    const totalStockValue = items.reduce((total, item) => 
      total + ((item.stock_quantity || 0) * (item.price || 0)), 0
    );

    setStats({
      totalItems,
      lowStockItems,
      outOfStockItems,
      totalStockValue
    });
  };

  const updateStockDirectly = async (itemId: number, newStock: number) => {
    console.log(`Updating stock directly for item ID: ${itemId}, New stock: ${newStock}`);
    
    // Optimistically update the inventory state
    setInventory(prevInventory => {
      return prevInventory.map(item => {
        if (item.id === itemId) {
          return { ...item, stock_quantity: Math.max(0, newStock) };
        }
        return item;
      });
    });
    
    try {
      const response = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([{ id: itemId, stock_quantity: Math.max(0, newStock) }])
      });

      if (!response.ok) throw new Error('Failed to update stock');
      
      console.log(`Stock updated successfully for item ID: ${itemId}`);
    } catch (err) {
      // Revert the optimistic update if the API call fails
      setInventory(prevInventory => {
        return prevInventory.map(item => {
          if (item.id === itemId) {
            return { ...item, stock_quantity: item.stock_quantity };
          }
          return item;
        });
      });
      setError('Failed to update stock');
      console.error('Error updating stock:', err);
    }
  };

  const adjustStock = async (itemId: number, action: 'add' | 'subtract', quantity: number = 1) => {
    // Optimistically update the inventory state
    setInventory(prevInventory => {
        return prevInventory.map(item => {
            if (item.id === itemId) {
                const newStock = action === 'add' ? (item.stock_quantity || 0) + quantity : (item.stock_quantity || 0) - quantity;
                return { ...item, stock_quantity: Math.max(0, newStock) }; // Ensure stock doesn't go below 0
            }
            return item;
        });
    });
    
    try {
        const response = await fetch('/api/inventory', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify([{ id: itemId, quantity, action }])
        });

        if (!response.ok) throw new Error('Failed to adjust stock');
        
        // Optionally, you can fetch the inventory again if needed
        // await fetchInventory(); 
    } catch (err) {
        // Revert the optimistic update if the API call fails
        setInventory(prevInventory => {
            return prevInventory.map(item => {
                if (item.id === itemId) {
                    const newStock = action === 'add' ? (item.stock_quantity || 0) - quantity : (item.stock_quantity || 0) + quantity;
                    return { ...item, stock_quantity: Math.max(0, newStock) }; // Ensure stock doesn't go below 0
                }
                return item;
            });
        });
        setError('Failed to adjust stock');
        console.error(err);
    }
  };

  // Wrapper functions for button clicks
  const handleRefreshClick = () => {
    fetchInventory(false); // Manual refresh - not background
  };

  const handleTryAgainClick = () => {
    fetchInventory(false); // Manual refresh - not background
  };

  useEffect(() => {
    fetchInventory();
    
    // Set up polling for real-time updates
    const pollingInterval = setInterval(() => {
      fetchInventory(true); // Pass true for background refresh
    }, 5000); // Poll every 5 seconds
    
    // Clean up interval on component unmount
    return () => clearInterval(pollingInterval);
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading inventory...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded">
        <p>{error}</p>
        <button 
          onClick={handleTryAgainClick}
          className="mt-2 text-red-600 hover:text-red-800 underline"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Items Card */}
        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Items</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalItems}</p>
            </div>
            <Package className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        {/* Low Stock Card */}
        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Low Stock</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.lowStockItems}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-yellow-500" />
          </div>
        </div>

        {/* Out of Stock Card */}
        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Out of Stock</p>
              <p className="text-2xl font-bold text-red-600">{stats.outOfStockItems}</p>
            </div>
            <Minus className="w-8 h-8 text-red-500" />
          </div>
        </div>

        {/* Total Value Card */}
        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Value</p>
              <p className="text-2xl font-bold text-green-600">₹{stats.totalStockValue.toFixed(2)}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex border-b border-gray-200 mb-6">
          <button
            onClick={() => setActiveTab('menu')}
            className={`px-4 py-2 font-medium text-sm ${
              activeTab === 'menu'
                ? 'border-b-2 border-red-600 text-red-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Package className="w-4 h-4 inline mr-2" />
            Menu Items
          </button>
          <button
            onClick={() => setActiveTab('raw-materials')}
            className={`px-4 py-2 font-medium text-sm ${
              activeTab === 'raw-materials'
                ? 'border-b-2 border-red-600 text-red-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Box className="w-4 h-4 inline mr-2" />
            Raw Materials
          </button>
        </div>

        {activeTab === 'menu' && (
          <>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Menu Items Inventory</h2>
              <button
                onClick={handleRefreshClick}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>

            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="inline-block min-w-full align-middle">
                <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Item</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Category</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Stock</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Threshold</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.map((item) => {
                    const stock = item.stock_quantity || 0;
                    const threshold = item.low_stock_threshold || 5;
                    let status = 'good';
                    let statusColor = 'text-green-600';
                    
                    if (stock <= 0) {
                      status = 'out-of-stock';
                      statusColor = 'text-red-600';
                    } else if (stock <= threshold) {
                      status = 'low-stock';
                      statusColor = 'text-yellow-600';
                    }

                    return (
                      <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="font-medium text-gray-900">{item.name}</div>
                          <div className="text-sm text-gray-600">₹{item.price}</div>
                        </td>
                        <td className="py-3 px-4 text-gray-700">{item.category}</td>
                        <td className="py-3 px-4 font-medium text-gray-900">{stock} {item.unit_type || 'pieces'}</td>
                        <td className="py-3 px-4 text-gray-600">{threshold}</td>
                        <td className={`py-3 px-4 font-medium ${statusColor}`}>
                          {status === 'good' && 'Good'}
                          {status === 'low-stock' && 'Low Stock'}
                          {status === 'out-of-stock' && 'Out of Stock'}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2 mb-2">
                            <input
                              type="number"
                              min="0"
                              step="1"
                              defaultValue={1}
                              className="w-20 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-600 text-gray-900"
                              placeholder="Qty"
                              data-item-id={item.id}
                            />
                            <button
                              onClick={() => {
                                const input = document.querySelector(`input[data-item-id="${item.id}"]`) as HTMLInputElement;
                                if (input) {
                                  const quantity = Number(input.value);
                                  console.log(`Setting quantity: ${quantity} for item ID: ${item.id}`);
                                  if (quantity >= 0) {
                                    updateStockDirectly(item.id, quantity);
                                    input.value = '1'; // Reset to default
                                  } else {
                                    console.error('Invalid quantity entered');
                                  }
                                } else {
                                  console.error('Input element not found for item ID:', item.id);
                                }
                              }}
                              className="p-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition-colors"
                              title="Set stock to specified quantity"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => adjustStock(item.id, 'add')}
                              className="p-2 bg-green-100 text-green-600 rounded hover:bg-green-200 transition-colors"
                              title="Add 1 unit"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => adjustStock(item.id, 'subtract')}
                              disabled={stock <= 0}
                              className="p-2 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Subtract 1 unit"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
            </div>

            {inventory.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <div className="text-lg">No inventory items found</div>
                <div className="text-sm">Add items to your menu to see them here</div>
              </div>
            )}
          </>
        )}

        {activeTab === 'raw-materials' && (
          <RawMaterialsManager onRawMaterialUpdate={fetchInventory} />
        )}
      </div>
    </div>
  );
};

export default InventoryDashboard;
