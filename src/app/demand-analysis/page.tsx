'use client';

import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, BarChart3, ArrowLeft } from 'lucide-react';
import { Order, OrderItem } from '@/types';
import Link from 'next/link';

interface DishDemand {
  dishId: number;
  dishName: string;
  totalQuantity: number;
  totalRevenue: number;
  demandLevel: 'high' | 'medium' | 'low';
}

const DemandAnalysisPage: React.FC = () => {
  const [dishDemands, setDishDemands] = useState<DishDemand[]>([]);
  const [filteredDemands, setFilteredDemands] = useState<DishDemand[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [thresholds, setThresholds] = useState({
    high: 10,
    medium: 4,
    low: 0
  });
  const [showThresholdSettings, setShowThresholdSettings] = useState(false);

  const fetchOrdersAndAnalyze = async () => {
    try {
      setLoading(true);
      // Fetch all orders including served ones
      const response = await fetch('/api/orders?includeServed=true&loadAll=true');
      if (!response.ok) throw new Error('Failed to fetch orders');

      const orders: Order[] = await response.json();
      
      // Aggregate dish quantities and revenue
      const dishDataMap = new Map<number, { name: string; quantity: number; revenue: number }>();
      
      orders.forEach(order => {
        order.items.forEach((item: OrderItem) => {
          const existing = dishDataMap.get(item.id);
          if (existing) {
            dishDataMap.set(item.id, {
              name: item.name,
              quantity: existing.quantity + item.quantity,
              revenue: existing.revenue + (item.price * item.quantity)
            });
          } else {
            dishDataMap.set(item.id, {
              name: item.name,
              quantity: item.quantity,
              revenue: item.price * item.quantity
            });
          }
        });
      });
      
      // Convert to array and calculate demand levels using custom thresholds
      const demands: DishDemand[] = Array.from(dishDataMap.entries()).map(([dishId, data]) => {
        let demandLevel: 'high' | 'medium' | 'low';
        
        if (data.quantity >= thresholds.high) {
          demandLevel = 'high';
        } else if (data.quantity >= thresholds.medium) {
          demandLevel = 'medium';
        } else {
          demandLevel = 'low';
        }
        
        return {
          dishId,
          dishName: data.name,
          totalQuantity: data.quantity,
          totalRevenue: data.revenue,
          demandLevel
        };
      });
      
      // Sort by quantity descending
      demands.sort((a, b) => b.totalQuantity - a.totalQuantity);
      
      setDishDemands(demands);
    } catch (err) {
      setError('Failed to load demand analysis data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrdersAndAnalyze();
  }, []);

  // Update filtered demands when dishDemands or activeFilter changes
  useEffect(() => {
    if (activeFilter === 'all') {
      setFilteredDemands(dishDemands);
    } else {
      setFilteredDemands(dishDemands.filter(dish => dish.demandLevel === activeFilter));
    }
  }, [dishDemands, activeFilter]);

  const handleFilterClick = (filter: 'all' | 'high' | 'medium' | 'low') => {
    setActiveFilter(filter);
  };

  const getDemandColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getDemandIcon = (level: string) => {
    switch (level) {
      case 'high': return <TrendingUp className="w-4 h-4" />;
      case 'low': return <TrendingDown className="w-4 h-4" />;
      default: return <BarChart3 className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading demand analysis...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12 text-red-600">
            <p>{error}</p>
            <button
              onClick={fetchOrdersAndAnalyze}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <Link 
              href="/admin"
              className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Return to Admin Panel
            </Link>
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <BarChart3 className="w-6 h-6" />
                Dish Demand Analysis
              </h1>
              <img 
                src="/adda.png" 
                alt="Cafe Logo" 
                className="w-20 h-20 object-contain"
              />
            </div>
          </div>
          <p className="text-gray-600 mb-4">
            Analyze which dishes are in high demand and which need more promotion.
          </p>

          <div className="mb-6">
            <button
              onClick={() => setShowThresholdSettings(!showThresholdSettings)}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              {showThresholdSettings ? 'Hide Threshold Settings' : 'Configure Demand Thresholds'}
            </button>
            
            {showThresholdSettings && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-lg text-gray-700 font-semibold mb-3">Demand Threshold Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      High Demand (≥)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={thresholds.high}
                      onChange={(e) => setThresholds({...thresholds, high: parseInt(e.target.value) || 0})}
                      className="w-full px-3 py-2 border text-gray-700 border-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Medium Demand (≥)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={thresholds.medium}
                      onChange={(e) => setThresholds({...thresholds, medium: parseInt(e.target.value) || 0})}
                      className="w-full px-3 py-2 border text-gray-700 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {`Low Demand (<)`}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={thresholds.medium - 1}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Automatically calculated</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    fetchOrdersAndAnalyze();
                    setShowThresholdSettings(false);
                  }}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Apply Thresholds
                </button>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div 
              className={`border rounded-lg p-4 cursor-pointer transition-all ${
                activeFilter === 'all' 
                  ? 'bg-blue-100 border-blue-400 shadow-md' 
                  : 'bg-blue-50 border-blue-200 hover:bg-blue-100'
              }`}
              onClick={() => handleFilterClick('all')}
            >
              <div className="text-blue-800 font-semibold">Show All</div>
              <div className="text-blue-600 text-sm">All dishes</div>
            </div>
            <div 
              className={`border rounded-lg p-4 cursor-pointer transition-all ${
                activeFilter === 'high' 
                  ? 'bg-green-100 border-green-400 shadow-md' 
                  : 'bg-green-50 border-green-200 hover:bg-green-100'
              }`}
              onClick={() => handleFilterClick('high')}
            >
              <div className="text-green-800 font-semibold">High Demand</div>
              <div className="text-green-600 text-sm">10+ orders</div>
            </div>
            <div 
              className={`border rounded-lg p-4 cursor-pointer transition-all ${
                activeFilter === 'medium' 
                  ? 'bg-yellow-100 border-yellow-400 shadow-md' 
                  : 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100'
              }`}
              onClick={() => handleFilterClick('medium')}
            >
              <div className="text-yellow-800 font-semibold">Medium Demand</div>
              <div className="text-yellow-600 text-sm">4-9 orders</div>
            </div>
            <div 
              className={`border rounded-lg p-4 cursor-pointer transition-all ${
                activeFilter === 'low' 
                  ? 'bg-red-100 border-red-400 shadow-md' 
                  : 'bg-red-50 border-red-200 hover:bg-red-100'
              }`}
              onClick={() => handleFilterClick('low')}
            >
              <div className="text-red-800 font-semibold">Low Demand</div>
              <div className="text-red-600 text-sm">0-3 orders</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Dish Performance</h2>
          
          {filteredDemands.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>No order data available for analysis.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Dish Name</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Total Quantity Sold</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Total Revenue</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Demand Level</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDemands.map((dish) => (
                    <tr key={dish.dishId} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-gray-900">{dish.dishName}</td>
                      <td className="py-3 px-4 text-gray-900">{dish.totalQuantity}</td>
                      <td className="py-3 px-4 text-green-600 font-semibold">₹{dish.totalRevenue.toLocaleString()}</td>
                      <td className="py-3 px-4">
                        <div className={`flex items-center gap-2 font-medium ${getDemandColor(dish.demandLevel)}`}>
                          {getDemandIcon(dish.demandLevel)}
                          {dish.demandLevel.charAt(0).toUpperCase() + dish.demandLevel.slice(1)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50">
                    <td className="py-3 px-4 font-bold text-gray-900">Total</td>
                    <td className="py-3 px-4 font-bold text-gray-900">
                      {filteredDemands.reduce((sum, dish) => sum + dish.totalQuantity, 0)}
                    </td>
                    <td className="py-3 px-4 font-bold text-green-700">
                      ₹{filteredDemands.reduce((sum, dish) => sum + dish.totalRevenue, 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={fetchOrdersAndAnalyze}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Refresh Data
          </button>
        </div>
      </div>
    </div>
  );
};

export default DemandAnalysisPage;
