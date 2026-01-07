import React, { useState, useEffect } from 'react';
import { BarChart3, X, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';

const SalesReport = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [salesReport, setSalesReport] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const [todaysSales, setTodaysSales] = useState({ total_orders: 0, total_revenue: 0 });
  const [totalRevenue, setTotalRevenue] = useState({ total_orders: 0, total_revenue: 0 });
  const [salesLoading, setSalesLoading] = useState(false);
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('asc');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [currentTime, setCurrentTime] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Update current time with IST formatting
  useEffect(() => {
    const updateTime = async () => {
      try {
        const response = await fetch('/api/time/current');
        if (!response.ok) throw new Error('Failed to fetch current time');
        const data = await response.json();
        setCurrentTime(data.currentTime);
      } catch (error) {
        console.error('Error getting current time:', error);
        setCurrentTime(new Date().toLocaleTimeString());
      }
    };

    updateTime();
    const intervalId = setInterval(updateTime, 1000);

    return () => clearInterval(intervalId);
  }, []);

  const generateSalesReport = async () => {
    try {
      const response = await fetch(`/api/sales-report?startDate=${startDate}&endDate=${endDate}`);
      if (!response.ok) throw new Error('Failed to generate sales report');
      const data = await response.json();
      setSalesReport(data);
      setCurrentPage(1); // Reset to first page when new report is generated
    } catch (err) {
      setError('Failed to generate sales report');
      console.error(err);
    }
  };

  useEffect(() => {
    // Fetch initial data on mount
    fetchTodaysSales();
    fetchTotalRevenue();

    // Set interval to refresh data every 30 seconds
    const intervalId = setInterval(() => {
      fetchTodaysSales();
      fetchTotalRevenue();
    }, 30000);

    // Cleanup interval on unmount
    return () => clearInterval(intervalId);
  }, []);

  // Reset to first page when sorting changes
  useEffect(() => {
    setCurrentPage(1);
  }, [sortBy, sortOrder]);

  const closeReportModal = () => {
    setSalesReport(null);
    setError(null);
  };

  // Fetch today's sales
  const fetchTodaysSales = async () => {
    setSalesLoading(true);
    try {
      const response = await fetch('/api/daily-sales/today');
      if (!response.ok) throw new Error('Failed to fetch today\'s sales');
      const data = await response.json();
      setTodaysSales(data);
    } catch (err) {
      setError('Failed to load today\'s sales');
      console.error(err);
    } finally {
      setSalesLoading(false);
    }
  };
    // Reset today's sales
  const resetTodaysSales = async () => {
    if (!confirm('Are you sure you want to reset today\'s sales? This action cannot be undone.')) return;
    
    setSalesLoading(true);
    try {
      const response = await fetch('/api/daily-sales/reset?resetToday=true', {
        method: 'POST'
      });

      if (!response.ok) throw new Error('Failed to reset today\'s sales');

      await fetchTodaysSales();
      
    } catch (err) {
      setError('Failed to reset today\'s sales');
      console.error(err);
    } finally {
      setSalesLoading(false);
    }
  };

    // Fetch total revenue
  const fetchTotalRevenue = async () => {
    setSalesLoading(true);
    try {
      const response = await fetch('/api/total-revenue');
      if (!response.ok) throw new Error('Failed to fetch total revenue');
      const data = await response.json();
      setTotalRevenue(data);
    } catch (err) {
      setError('Failed to load total revenue');
      console.error(err);
    } finally {
      setSalesLoading(false);
    }
  };

  // Fetch all sales data
  const fetchSalesData = async () => {
    await Promise.all([fetchTodaysSales(), fetchTotalRevenue()]);
  };

  // Fetch daily order details
  const fetchDailyOrderDetails = async (date: string) => {
    setDetailsLoading(true);

    // Parse the date string to Date object
    const inputDate = new Date(date);
    // Add one day (24 hours)
    inputDate.setDate(inputDate.getDate() + 1);
    // Convert back to YYYY-MM-DD string
    const nextDay = inputDate.toISOString().split('T')[0];

    // Set selectedDate to next day
    setSelectedDate(nextDay);

// const prevDate = (() => {
//   const dateObj = new Date(nextDay);
//   dateObj.setDate(dateObj.getDate() - 1);
//   return dateObj.toLocaleDateString();
// })();

    try {
      // Use the date as-is without conversion to avoid timezone issues
      const response = await fetch(`/api/daily-orders/${date}`);
      if (!response.ok) throw new Error('Failed to fetch daily order details');
      const data = await response.json();
      setOrderDetails(data);
      setShowOrderModal(true);
    } catch (err) {
      setError('Failed to load daily order details');
      console.error(err);
    } finally {
      setDetailsLoading(false);
    }
  };

  const closeOrderModal = () => {
    setShowOrderModal(false);
    setOrderDetails(null);
    setSelectedDate(null);
  };

  // Date range preset handler
  const setDateRangePreset = (preset: string) => {
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);

    switch (preset) {
      case 'today':
        setStartDate(startOfDay.toISOString().split('T')[0]);
        setEndDate(today.toISOString().split('T')[0]);

         // setStartDate(startOfDay.toISOString().split('T')[0]);
        // setEndDate(today.toISOString().split('T')[0]);

        // new Date(new Date(startOfDay).setDate(new Date(startOfDay).getDate() + 1))
        break;
      case 'thisWeek':
        setStartDate(startOfWeek.toISOString().split('T')[0]);
        setEndDate(today.toISOString().split('T')[0]);
        break;
      case 'thisMonth':
        setStartDate(startOfMonth.toISOString().split('T')[0]);
        setEndDate(today.toISOString().split('T')[0]);
        break;
      case 'lastMonth':
        setStartDate(startOfLastMonth.toISOString().split('T')[0]);
        setEndDate(endOfLastMonth.toISOString().split('T')[0]);
        break;
    }
  };
  



  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
        {/* Sales Metrics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6">
          {/* Today's Sales Card */}
          <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 border-l-4 border-red-500">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">Today's Sales</h3>
              <div className="flex items-center gap-1 sm:gap-2">
                <button
                  onClick={fetchTodaysSales}
                  disabled={salesLoading}
                  className="p-1 sm:p-2 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors disabled:opacity-50 text-sm"
                  title="Refresh Today's Sales"
                >
                  🔄
                </button>
                <button
                  onClick={resetTodaysSales}
                  disabled={salesLoading}
                  className="p-1 sm:p-2 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors disabled:opacity-50 text-sm"
                  title="Reset Today's Sales"
                >
                  🔄 Reset
                </button>
              </div>
            </div>
            {salesLoading ? (
              <div className="text-center py-3 sm:py-4">
                <div className="animate-pulse text-sm sm:text-base">Loading...</div>
              </div>
            ) : (
              <div className="space-y-1 sm:space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm sm:text-base text-gray-800">Total Orders:</span>
                  <span className="text-lg sm:text-xl font-bold text-red-700">{todaysSales.total_orders}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm sm:text-base text-gray-800">Revenue:</span>
                  <span className="text-lg sm:text-xl font-bold text-green-700">₹{Number(todaysSales.total_revenue).toFixed(2)}</span>
                </div>
                <div className="text-xs text-gray-500 mt-1 sm:mt-2">
                  Updated: {currentTime || new Date().toLocaleTimeString()}
                </div>
              </div>
            )}
          </div>

          {/* Total Revenue Card */}
          <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">Total Revenue</h3>
              <button
                onClick={fetchTotalRevenue}
                disabled={salesLoading}
                className="p-1 sm:p-2 bg-green-100 text-green-600 rounded hover:bg-green-200 transition-colors disabled:opacity-50 text-sm"
                title="Refresh Total Revenue"
              >
                🔄
              </button>
            </div>
            {salesLoading ? (
              <div className="text-center py-3 sm:py-4">
                <div className="animate-pulse text-sm sm:text-base">Loading...</div>
              </div>
            ) : (
              <div className="space-y-1 sm:space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm sm:text-base text-gray-800">Total Orders:</span>
                  <span className="text-lg sm:text-xl font-bold text-blue-700">{totalRevenue.total_orders}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm sm:text-base text-gray-800">Revenue:</span>
                  <span className="text-lg sm:text-xl font-bold text-green-700">₹{Number(totalRevenue.total_revenue).toFixed(2)}</span>
                </div>
                <div className="text-xs text-gray-500 mt-1 sm:mt-2">
                  Cumulative from all served orders
                </div>
              </div>
            )}
          </div>
        </div>

      
      <h2 className="text-xl font-bold mb-4 text-gray-900">Sales Report</h2>
      
      {/* Date Range Presets */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setDateRangePreset('today')}
          className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm"
        >
          Today
        </button>
        <button
          onClick={() => setDateRangePreset('thisWeek')}
          className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm"
        >
          This Week
        </button>
        <button
          onClick={() => setDateRangePreset('thisMonth')}
          className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm"
        >
          This Month
        </button>
        <button
          onClick={() => setDateRangePreset('lastMonth')}
          className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm"
        >
          Last Month
        </button>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-800 mb-1">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded text-gray-900 bg-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-800 mb-1">End Date</label>
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
        className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
      >
        Generate Report
      </button>

      {error && <div className="text-red-600 mt-4">{error}</div>}

      {salesReport && (
        <div className="mt-4">
          <h3 className="font-semibold text-gray-900 mb-3">Report Results:</h3>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <div className="text-sm font-medium text-red-800 mb-1">Total Orders</div>
                <div className="text-xl font-bold text-red-900">{salesReport.total_orders || 0}</div>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <div className="text-sm font-medium text-green-800 mb-1">Total Revenue</div>
                <div className="text-xl font-bold text-green-900">₹{Number(salesReport.total_revenue || 0).toFixed(2)}</div>
              </div>
            </div>
            
            {salesReport.daily_sales && salesReport.daily_sales.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">Daily Breakdown:</h4>
                  <div className="flex items-center gap-2">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="text-sm border border-gray-300 rounded px-2 py-1 text-gray-900 bg-white"
                    >
                      <option value="date">Date</option>
                      <option value="day">Day</option>
                      <option value="revenue">Revenue</option>
                    </select>
                    <button
                      onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                      className="text-sm text-gray-800 bg-gray-100 px-2 py-1 rounded hover:bg-gray-200"
                    >
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </button>
                  </div>
                </div>
                <div>
                  <div className="space-y-2">
                    {salesReport.daily_sales
                      .sort((a: any, b: any) => {
                        let aValue, bValue;
                        
                        if (sortBy === 'date') {
                          aValue = new Date(a.date).getTime();
                          bValue = new Date(b.date).getTime();
                        } else if (sortBy === 'day') {
                          aValue = new Date(a.date).toLocaleDateString('en-US', { weekday: 'long' });
                          bValue = new Date(b.date).toLocaleDateString('en-US', { weekday: 'long' });
                        } else {
                          aValue = a.revenue;
                          bValue = b.revenue;
                        }
                        
                        if (sortOrder === 'asc') {
                          return aValue > bValue ? 1 : -1;
                        } else {
                          return aValue < bValue ? 1 : -1;
                        }
                      })
                      .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                      .map((day: any) => (
                        <div
                          key={day.date}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100"
                          onClick={() => fetchDailyOrderDetails(day.date)}
                          title="Click to view order details"
                        >
                          <div className="flex items-center flex-1">
                            <span className="text-sm text-gray-800 min-w-[85px] mr-2">
                              {new Date(day.date).toLocaleDateString()}
                            </span>
                            <span className="text-sm font-medium text-gray-900 min-w-[70px] mr-3">
                              {new Date(day.date).toLocaleDateString('en-US', { weekday: 'long' })}
                            </span>
                          </div>
                          <span className="font-bold text-gray-900 ml-1">₹{day.revenue}</span>
                        </div>
                      ))}
                  </div>
                  
                  {/* Pagination Controls */}
                  {salesReport.daily_sales.length > itemsPerPage && (
                    <div className="flex items-center justify-between mt-4">
                      <div className="text-sm text-gray-600">
                        Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, salesReport.daily_sales.length)} of {salesReport.daily_sales.length} entries
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                          className="p-1 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-sm font-medium">
                          Page {currentPage} of {Math.ceil(salesReport.daily_sales.length / itemsPerPage)}
                        </span>
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(salesReport.daily_sales.length / itemsPerPage)))}
                          disabled={currentPage === Math.ceil(salesReport.daily_sales.length / itemsPerPage)}
                          className="p-1 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
                      {/* Popular Items Display */}
            {salesReport.top_items && salesReport.top_items.length > 0 && (
              <div className="bg-gradient-to-r from-red-50 to-orange-50 p-4 rounded-lg border border-red-200">
                <h4 className="font-semibold text-red-900 mb-3 text-center">🔥 Popular Items This Period</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {salesReport.top_items.slice(0, 4).map((item: any, index: number) => (
                    <div key={index} className="bg-white rounded-lg p-3 shadow-sm border border-red-100">
                      <div className="flex items-center justify-between">
                        <span className="break-words min-w-0 flex-1 text-sm font-medium text-red-900" title={item.name}>
                          {item.name}
                        </span>
                        <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                          {item.quantity}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        {index === 0 ? '🥇 Most Popular' : 
                         index === 1 ? '🥈 Runner-up' : 
                         index === 2 ? '🥉 Third Place' : 'Popular Choice'}
                      </div>
                    </div>
                  ))}
                </div>
                {salesReport.top_items[0] && (
                  <div className="mt-3 text-center">
                    <div className="text-sm font-bold text-red-800">
                      #1: {salesReport.top_items[0].name} ({salesReport.top_items[0].quantity} sold)
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {salesReport.top_items && salesReport.top_items.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Top Selling Items:</h4>
                <div className="space-y-2">
                  {salesReport.top_items.slice(0, 5).map((item: any, index: number) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-orange-50 rounded">
                      <span className="text-sm font-medium text-orange-900">{item.name}</span>
                      <span className="font-bold text-orange-900">{item.quantity} sold</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

  
          </div>
        </div>
      )}

      <button
        onClick={closeReportModal}
        className="mt-4 px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition-colors flex items-center gap-2"
      >
        <X className="w-4 h-4" />
        Close
      </button>

      {/* Order Details Modal */}
      {showOrderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              {/* <h3 className="text-xl font-bold text-gray-900">
                Order Details for {selectedDate}
              </h3> */}
 <h3 className="text-xl font-bold text-gray-900">
  Order Details for {
    selectedDate
      ? new Date(new Date(selectedDate).setDate(new Date(selectedDate).getDate() - 1)).toLocaleDateString()
      : ""
  }
</h3>
              <button
                onClick={closeOrderModal}
                className="p-2 hover:bg-gray-100 rounded text-gray-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {detailsLoading ? (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-red-600" />
                <p className="text-gray-600">Loading order details...</p>
              </div>
            ) : orderDetails ? (
              <div>
                {/* Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="bg-blue-50 p-4 rounded">
                    <div className="text-sm text-blue-800">Total Orders</div>
                    <div className="text-lg font-bold text-blue-900">{orderDetails.total_orders}</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded">
                    <div className="text-sm text-green-800">Total Revenue</div>
                    <div className="text-lg font-bold text-green-900">₹{Number(orderDetails.total_revenue).toFixed(2)}</div>
                  </div>
                </div>

                {/* Order Details Table */}
                {orderDetails.order_details && orderDetails.order_details.length > 0 ? (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Dish-wise Breakdown:</h4>
                    <div className="overflow-x-auto -mx-4 sm:mx-0">
                      <div className="inline-block min-w-full align-middle">
                        <table className="min-w-full border-collapse">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="border border-gray-300 px-4 py-2 text-left font-medium text-gray-900">Dish Name</th>
                            <th className="border border-gray-300 px-4 py-2 text-center font-medium text-gray-900">Quantity</th>
                            <th className="border border-gray-300 px-4 py-2 text-center font-medium text-gray-900">Price per Unit</th>
                            <th className="border border-gray-300 px-4 py-2 text-right font-medium text-gray-900">Revenue</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orderDetails.order_details.map((item: any, index: number) => (
                            <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="border border-gray-300 px-4 py-2 text-gray-900">{item.dish_name}</td>
                              <td className="border border-gray-300 px-4 py-2 text-center text-gray-900">{item.quantity}</td>
                              <td className="border border-gray-300 px-4 py-2 text-center text-gray-900">₹{Number(item.price_per_unit).toFixed(2)}</td>
                              <td className="border border-gray-300 px-4 py-2 text-right text-gray-900 font-medium">₹{Number(item.revenue).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-gray-100 font-bold">
                            <td className="border border-gray-300 px-4 py-2 text-gray-900" colSpan={3}>Total</td>
                            <td className="border border-gray-300 px-4 py-2 text-right text-gray-900">
                              ₹{Number(orderDetails.total_revenue).toFixed(2)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No order details available for this date.
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-red-600">
                Failed to load order details.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesReport;
