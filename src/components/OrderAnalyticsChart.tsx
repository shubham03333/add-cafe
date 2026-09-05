'use client';

import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Calendar, RefreshCw, Target } from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { parseIstWallClock } from '@/lib/display-time';

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
    const date = parseIstWallClock(timePeriod);
    if (Number.isNaN(date.getTime())) return timePeriod;

    switch (period) {
      case 'hourly':
        return date.toLocaleString(undefined, {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          hour12: true,
        });
      case 'daily':
        return date.toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
        });
      case 'weekly':
        return `Week of ${date.toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
        })}`;
      case 'monthly':
        return date.toLocaleDateString(undefined, {
          month: 'short',
          year: 'numeric',
        });
      default:
        return timePeriod;
    }
  };

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
              onChange={(e) => {
                const next = parseInt(e.target.value, 10);
                setDays(next);
                if (next >= 180 && (period === 'hourly' || period === 'daily')) {
                  setPeriod('monthly');
                }
              }}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="1">1 Day</option>
              <option value="7">7 Days</option>
              <option value="30">30 Days</option>
              <option value="90">90 Days</option>
              <option value="180">6 Months</option>
              <option value="365">1 Year</option>
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
              <div className="text-xs text-blue-600 mt-1">
                Last {days === 365 ? 'year' : days === 180 ? '6 months' : `${days} days`}
              </div>
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

      {/* Charts */}
      <div className="mb-2 grid gap-6 lg:grid-cols-2">
        <div className="h-72">
          <h3 className="mb-3 text-sm font-semibold text-zinc-800">Orders</h3>
          {analyticsData.length === 0 ? (
            <div className="flex h-full items-center justify-center rounded-xl bg-zinc-50 text-sm text-zinc-400">No data</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[...analyticsData].reverse()} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
                <XAxis dataKey="time_period" tickFormatter={formatTimeLabel} tick={{ fontSize: 10, fill: '#71717a' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#71717a' }} axisLine={false} tickLine={false} width={32} />
                <Tooltip
                  labelFormatter={(l) => formatTimeLabel(String(l))}
                  formatter={(v) => [Number(v) || 0, 'Orders']}
                  contentStyle={{ borderRadius: 12, border: '1px solid #e4e4e7' }}
                />
                <Bar dataKey="order_count" fill="#b91c1c" radius={[6, 6, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="h-72">
          <h3 className="mb-3 text-sm font-semibold text-zinc-800">Revenue</h3>
          {analyticsData.length === 0 ? (
            <div className="flex h-full items-center justify-center rounded-xl bg-zinc-50 text-sm text-zinc-400">No data</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={[...analyticsData].reverse()} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="analyticsRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0f766e" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#0f766e" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
                <XAxis dataKey="time_period" tickFormatter={formatTimeLabel} tick={{ fontSize: 10, fill: '#71717a' }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#71717a' }}
                  axisLine={false}
                  tickLine={false}
                  width={44}
                  tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
                />
                <Tooltip
                  labelFormatter={(l) => formatTimeLabel(String(l))}
                  formatter={(v) => [`₹${Number(v || 0).toLocaleString('en-IN')}`, 'Revenue']}
                  contentStyle={{ borderRadius: 12, border: '1px solid #e4e4e7' }}
                />
                <Area type="monotone" dataKey="total_revenue" stroke="#0f766e" strokeWidth={2.5} fill="url(#analyticsRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
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
