'use client';

import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, TrendingDown, Calendar, RefreshCw, Download, Eye, Target } from 'lucide-react';

interface AnalyticsData {
  time_period: string;
  order_count: number;
  total_revenue: number;
  avg_order_value: number;
}

interface OrderAnalyticsChartProps {
  className?: string;
}

const OrderAnalyticsChart: React.FC<OrderAnalyticsChartProps> = ({ className = '' }) => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<'hourly' | 'daily' | 'weekly' | 'monthly'>('daily');
  const [days, setDays] = useState(7);
  const [totalOrders, setTotalOrders] = useState(0);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/orders/analytics?period=${period}&days=${days}`);
      if (!response.ok) throw new Error('Failed to fetch analytics data');

      const data = await response.json();
      if (data.success) {
        setAnalyticsData(data.data);
        setTotalOrders(data.total_orders);
      } else {
        throw new Error(data.error || 'Failed to fetch data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [period, days]);

  const formatTimeLabel = (timePeriod: string) => {
    const date = new Date(timePeriod);

    switch (period) {
      case 'hourly':
        return date.toLocaleString('en-IN', {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          hour12: true
        });
      case 'daily':
        return date.toLocaleDateString('en-IN', {
          month: 'short',
          day: 'numeric'
        });
      case 'weekly':
        return `Week of ${date.toLocaleDateString('en-IN', {
          month: 'short',
          day: 'numeric'
        })}`;
      case 'monthly':
        return date.toLocaleDateString('en-IN', {
          month: 'short',
          year: 'numeric'
        });
      default:
        return timePeriod;
    }
  };

  const maxOrderCount = Math.max(...analyticsData.map(d => d.order_count), 1);
  const peakPeriod = analyticsData.reduce((max, current) => current.order_count > max.order_count ? current : max, analyticsData[0] || null);

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-6 h-6 text-red-600" />
            <h2 className="text-xl font-semibold text-gray-900">Order Analytics</h2>
          </div>
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-600"></div>
        </div>
        <div className="text-center py-8 text-gray-500">
          Loading analytics data...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-6 h-6 text-red-600" />
            <h2 className="text-xl font-semibold text-gray-900">Order Analytics</h2>
          </div>
          <button
            onClick={fetchAnalytics}
            className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
            title="Retry"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
        <div className="text-center py-8 text-red-600">
          <div className="text-lg font-medium mb-2">Error Loading Data</div>
          <div className="text-sm">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-6 h-6 text-red-600" />
          <h2 className="text-xl font-semibold text-gray-900">Order Analytics</h2>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as typeof period)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="hourly">Hourly</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Days:</span>
            <select
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="1">1 Day</option>
              <option value="7">7 Days</option>
              <option value="30">30 Days</option>
              <option value="90">90 Days</option>
            </select>
          </div>

          <button
            onClick={fetchAnalytics}
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Enhanced Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-100 p-4 rounded-xl border border-blue-200 hover:shadow-md transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-blue-700 font-medium mb-1">Total Orders</div>
              <div className="text-2xl font-bold text-blue-900">{totalOrders.toLocaleString('en-IN')}</div>
              <div className="text-xs text-blue-600 mt-1">Last {days} days</div>
            </div>
            <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-emerald-100 p-4 rounded-xl border border-green-200 hover:shadow-md transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-green-700 font-medium mb-1">Avg Orders/Day</div>
              <div className="text-2xl font-bold text-green-900">
                {(totalOrders / days).toFixed(1)}
              </div>
              <div className="text-xs text-green-600 mt-1">Daily average</div>
            </div>
            <div className="p-2 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
              <Target className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-violet-100 p-4 rounded-xl border border-purple-200 hover:shadow-md transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-purple-700 font-medium mb-1">Peak Period</div>
              <div className="text-lg font-bold text-purple-900 truncate">
                {peakPeriod ? formatTimeLabel(peakPeriod.time_period) : 'N/A'}
              </div>
              <div className="text-xs text-purple-600 mt-1">Highest activity</div>
            </div>
            <div className="p-2 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
              <BarChart3 className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-red-100 p-4 rounded-xl border border-orange-200 hover:shadow-md transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-orange-700 font-medium mb-1">Total Revenue</div>
              <div className="text-2xl font-bold text-orange-900">
                ₹{analyticsData.reduce((sum, data) => sum + Number(data.total_revenue), 0).toLocaleString('en-IN')}
              </div>
              <div className="text-xs text-orange-600 mt-1">Revenue generated</div>
            </div>
            <div className="p-2 bg-orange-100 rounded-lg group-hover:bg-orange-200 transition-colors">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Bar Chart */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Orders by {period.charAt(0).toUpperCase() + period.slice(1)} Period
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {/* Export functionality can be added here */}}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              title="Export Data"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={() => {/* View details functionality */}}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              title="View Details"
            >
              <Eye className="w-4 h-4" />
            </button>
          </div>
        </div>

        {analyticsData.length === 0 ? (
          <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg">
            <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <div className="text-lg">No data available</div>
            <div className="text-sm mt-2">Try adjusting the time period or date range</div>
          </div>
        ) : (
          <div className="space-y-2">
            {analyticsData.map((data, index) => {
              const percentage = (data.order_count / maxOrderCount) * 100;
              const prevData = analyticsData[index + 1];
              const trend = prevData ? (data.order_count > prevData.order_count ? 'up' : data.order_count < prevData.order_count ? 'down' : 'same') : null;

              return (
                <div
                  key={index}
                  className="group relative bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-all duration-300 hover:border-red-200"
                >
                  {/* Trend Indicator */}
                  {trend && (
                    <div className="absolute -top-2 -right-2 z-10">
                      <div className={`p-1 rounded-full shadow-sm ${
                        trend === 'up' ? 'bg-green-100 text-green-600' :
                        trend === 'down' ? 'bg-red-100 text-red-600' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {trend === 'up' ? <TrendingUp className="w-3 h-3" /> :
                         trend === 'down' ? <TrendingDown className="w-3 h-3" /> :
                         <Target className="w-3 h-3" />}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-4">
                    {/* Time Period Label */}
                    <div className="w-28 text-sm text-gray-700 font-medium flex-shrink-0">
                      {formatTimeLabel(data.time_period)}
                    </div>

                    {/* Enhanced Bar Chart */}
                    <div className="flex-1">
                      <div className="flex items-center gap-4">
                        {/* Animated Bar */}
                        <div className="flex-1 relative">
                          <div className="bg-gray-100 rounded-full h-8 overflow-hidden shadow-inner">
                            <div
                              className="bg-gradient-to-r from-red-400 via-red-500 to-red-600 h-full rounded-full transition-all duration-1000 ease-out flex items-center justify-end pr-3 shadow-sm"
                              style={{
                                width: `${percentage}%`,
                                minWidth: data.order_count > 0 ? '30px' : '0px'
                              }}
                            >
                              {/* Bar Label */}
                              <span className="text-white text-sm font-bold drop-shadow-sm">
                                {data.order_count}
                              </span>
                            </div>
                          </div>

                          {/* Percentage Indicator */}
                          <div className="absolute -top-6 left-0 text-xs text-gray-500 font-medium">
                            {percentage.toFixed(1)}%
                          </div>
                        </div>

                        {/* Revenue & Average */}
                        <div className="flex flex-col items-end min-w-[100px] gap-1">
                          <div className="text-sm font-bold text-gray-900">
                            ₹{data.total_revenue.toLocaleString('en-IN')}
                          </div>
                          <div className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-full">
                            Avg: ₹{Math.round(data.avg_order_value).toLocaleString('en-IN')}
                          </div>
                        </div>
                      </div>

                      {/* Hover Details */}
                      <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="flex justify-between text-xs text-gray-600 bg-gray-50 rounded px-3 py-2">
                          <span>Orders: {data.order_count}</span>
                          <span>Revenue: ₹{data.total_revenue.toLocaleString('en-IN')}</span>
                          <span>Avg: ₹{Math.round(data.avg_order_value).toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 text-sm text-gray-600 border-t border-gray-200 pt-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded"></div>
          <span>Order Count</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs">₹</span>
          <span>Total Revenue</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs">∅</span>
          <span>Average Order Value</span>
        </div>
      </div>
    </div>
  );
};

export default OrderAnalyticsChart;
