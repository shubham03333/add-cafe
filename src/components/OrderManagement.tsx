'use client';

import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Eye, RefreshCw, Filter, SortAsc, SortDesc } from 'lucide-react';

interface Order {
  id: string;
  order_number: string;
  items: any[];
  total: number;
  status: string;
  payment_status: string;
  payment_mode: string;
  order_time: string;
  customer_name?: string;
  customer_phone?: string;
}

interface PaginationData {
  currentPage: number;
  totalPages: number;
  totalOrders: number;
  limit: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

const OrderManagement = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('order_time');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [todayFilter, setTodayFilter] = useState(false);

  const fetchOrders = async (page: number = 1) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '15',
        sortBy,
        sortOrder
      });

      if (statusFilter) {
        params.append('status', statusFilter);
      }

      if (todayFilter) {
        params.append('today', 'true');
        // Force sort by order_time ASC when today filter is active
        params.set('sortBy', 'order_time');
        params.set('sortOrder', 'ASC');
      }

      const response = await fetch(`/api/orders/paginated?${params}`);
      if (!response.ok) throw new Error('Failed to fetch orders');

      const data = await response.json();
      setOrders(data.orders);
      setPagination(data.pagination);
      setCurrentPage(page);
    } catch (err) {
      setError('Failed to load orders');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders(1);
  }, [statusFilter, sortBy, sortOrder, todayFilter]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= (pagination?.totalPages || 1)) {
      fetchOrders(page);
    }
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortBy(column);
      setSortOrder('DESC');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'served': return 'bg-green-100 text-green-800';
      case 'preparing': return 'bg-yellow-100 text-yellow-800';
      case 'ready': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  if (loading && orders.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
        <span className="ml-2 text-gray-900">Loading orders...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Orders ({pagination?.totalOrders || 0})
          </h2>

          <div className="flex flex-col sm:flex-row gap-3">
            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="preparing">Preparing</option>
                <option value="ready">Ready</option>
                <option value="served">Served</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Today Filter Button */}
            <button
              onClick={() => setTodayFilter(!todayFilter)}
              className={`px-4 py-2 rounded-md text-white transition-colors flex items-center gap-2 ${
                todayFilter ? 'bg-red-700' : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {todayFilter ? 'Show All Orders' : "Today's Orders"}
            </button>

            {/* Refresh Button */}
            <button
              onClick={() => fetchOrders(currentPage)}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded">
            <p className="text-red-700">{error}</p>
          </div>
        )}
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('order_number')}
                >
                  <div className="flex items-center gap-1">
                    Order #
                    {sortBy === 'order_number' && (
                      sortOrder === 'ASC' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Items
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('total')}
                >
                  <div className="flex items-center gap-1">
                    Amount
                    {sortBy === 'total' && (
                      sortOrder === 'ASC' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('order_time')}
                >
                  <div className="flex items-center gap-1">
                    Date & Time
                    {sortBy === 'order_time' && (
                      sortOrder === 'ASC' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    #{order.order_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      {order.customer_name && <div className="font-medium text-gray-900">{order.customer_name}</div>}
                      {order.customer_phone && <div className="text-gray-500">{order.customer_phone}</div>}
                      {!order.customer_name && !order.customer_phone && (
                        <span className="text-gray-400">Walk-in</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="max-w-xs">
                      {order.items?.map((item: any, index: number) => (
                        <div key={index} className="text-gray-900 leading-tight">
                          {item.quantity}x {item.name}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    ₹{order.total}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col gap-1">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPaymentStatusColor(order.payment_status)}`}>
                        {order.payment_status}
                      </span>
                      {order.payment_mode && (
                        <span className="text-xs text-gray-500 capitalize">
                          {order.payment_mode}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDateTime(order.order_time)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button
                      className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {orders.length === 0 && !loading && (
          <div className="text-center py-12 text-gray-500">
            <div className="text-lg text-gray-900">No orders found</div>
            <div className="text-sm mt-2 text-gray-600">Try adjusting your filters</div>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-sm text-gray-700">
              Showing {((pagination.currentPage - 1) * pagination.limit) + 1} to{' '}
              {Math.min(pagination.currentPage * pagination.limit, pagination.totalOrders)} of{' '}
              {pagination.totalOrders} orders
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(pagination.currentPage - 1)}
                disabled={!pagination.hasPrevPage}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>

              {/* Page Numbers */}
              <div className="flex gap-1">
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  const pageNum = Math.max(1, Math.min(pagination.totalPages - 4, pagination.currentPage - 2)) + i;
                  if (pageNum > pagination.totalPages) return null;

                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`px-3 py-2 border rounded-md text-sm font-medium ${
                        pageNum === pagination.currentPage
                          ? 'border-red-500 bg-red-50 text-red-600'
                          : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => handlePageChange(pagination.currentPage + 1)}
                disabled={!pagination.hasNextPage}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderManagement;
