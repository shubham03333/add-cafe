'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ChevronLeft,
  ChevronRight,
  IndianRupee,
  Loader2,
  RefreshCw,
  ShoppingBag,
  X,
} from 'lucide-react';

const formatINR = (value: number) =>
  `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const toYmd = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-zinc-200 bg-white/95 px-3 py-2 shadow-lg">
      {label && <div className="mb-1 text-xs font-medium text-zinc-500">{label}</div>}
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="text-sm font-semibold text-zinc-900">
          {entry.name}: {entry.dataKey === 'revenue' ? formatINR(entry.value) : entry.value}
        </div>
      ))}
    </div>
  );
};

const SalesReport = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [salesReport, setSalesReport] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

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

  useEffect(() => {
    const tick = () => setCurrentTime(new Date().toLocaleTimeString('en-IN'));
    tick();
    const intervalId = setInterval(tick, 30000);
    return () => clearInterval(intervalId);
  }, []);

  const generateSalesReport = async () => {
    if (!startDate || !endDate) {
      setError('Choose both start and end dates');
      return;
    }
    if (startDate > endDate) {
      setError('Start date must be on or before end date');
      return;
    }
    setReportLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/sales-report?startDate=${startDate}&endDate=${endDate}`);
      if (!response.ok) throw new Error('Failed to generate sales report');
      const data = await response.json();
      setSalesReport(data);
      setCurrentPage(1);
    } catch (err) {
      setError('Failed to generate sales report');
      console.error(err);
    } finally {
      setReportLoading(false);
    }
  };

  useEffect(() => {
    fetchTodaysSales();
    fetchTotalRevenue();
    const intervalId = setInterval(() => {
      fetchTodaysSales();
      fetchTotalRevenue();
    }, 30000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [sortBy, sortOrder]);

  const closeReportModal = () => {
    setSalesReport(null);
    setError(null);
  };

  const fetchTodaysSales = async () => {
    setSalesLoading(true);
    try {
      const response = await fetch('/api/daily-sales/today');
      if (!response.ok) throw new Error("Failed to fetch today's sales");
      const data = await response.json();
      setTodaysSales(data);
    } catch (err) {
      setError("Failed to load today's sales");
      console.error(err);
    } finally {
      setSalesLoading(false);
    }
  };

  const resetTodaysSales = async () => {
    if (!confirm("Are you sure you want to reset today's sales? This action cannot be undone.")) return;

    setSalesLoading(true);
    try {
      const response = await fetch('/api/daily-sales/reset?resetToday=true', {
        method: 'POST',
      });
      if (!response.ok) throw new Error("Failed to reset today's sales");
      await fetchTodaysSales();
    } catch (err) {
      setError("Failed to reset today's sales");
      console.error(err);
    } finally {
      setSalesLoading(false);
    }
  };

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

  const fetchDailyOrderDetails = async (date: string) => {
    setDetailsLoading(true);
    const inputDate = new Date(date);
    inputDate.setDate(inputDate.getDate() + 1);
    const nextDay = inputDate.toISOString().split('T')[0];
    setSelectedDate(nextDay);

    try {
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

  const setDateRangePreset = (preset: string) => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);

    switch (preset) {
      case 'today':
        setStartDate(toYmd(today));
        setEndDate(toYmd(today));
        break;
      case 'thisWeek':
        setStartDate(toYmd(startOfWeek));
        setEndDate(toYmd(today));
        break;
      case 'thisMonth':
        setStartDate(toYmd(startOfMonth));
        setEndDate(toYmd(today));
        break;
      case 'lastMonth':
        setStartDate(toYmd(startOfLastMonth));
        setEndDate(toYmd(endOfLastMonth));
        break;
    }
  };

  const chartRows = useMemo(() => {
    const days = salesReport?.daily_sales;
    if (!Array.isArray(days) || days.length === 0) return [];
    return [...days]
      .sort((a: any, b: any) => String(a.date).localeCompare(String(b.date)))
      .map((day: any) => ({
        label: new Date(`${day.date}T00:00:00`).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
        }),
        revenue: Number(day.revenue) || 0,
        orders: Number(day.orders) || 0,
      }));
  }, [salesReport]);

  const sortedDays = useMemo(() => {
    const days = salesReport?.daily_sales;
    if (!Array.isArray(days)) return [];
    return [...days].sort((a: any, b: any) => {
      let aValue: string | number;
      let bValue: string | number;
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
      if (sortOrder === 'asc') return aValue > bValue ? 1 : -1;
      return aValue < bValue ? 1 : -1;
    });
  }, [salesReport, sortBy, sortOrder]);

  const pageDays = sortedDays.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const pageCount = Math.max(1, Math.ceil(sortedDays.length / itemsPerPage));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">Reports</h2>
        <p className="mt-1 text-sm text-zinc-500">Paid sales by day. Tap a row for dish-level detail.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-gradient-to-br from-red-50 to-rose-100 p-4 text-red-800 shadow-sm ring-1 ring-black/5">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/70">
              <IndianRupee className="h-4 w-4" />
            </div>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={fetchTodaysSales}
                disabled={salesLoading}
                className="rounded-lg bg-white/80 p-2 text-red-700 hover:bg-white disabled:opacity-50"
                title="Refresh today's sales"
              >
                <RefreshCw className={`h-4 w-4 ${salesLoading ? 'animate-spin' : ''}`} />
              </button>
              <button
                type="button"
                onClick={resetTodaysSales}
                disabled={salesLoading}
                className="rounded-lg bg-white/80 px-2 py-1 text-xs font-medium text-red-700 hover:bg-white disabled:opacity-50"
              >
                Reset
              </button>
            </div>
          </div>
          <div className="text-xs font-medium uppercase tracking-wide opacity-70">Today</div>
          <div className="mt-1 text-xl font-semibold tabular-nums sm:text-2xl">
            {salesLoading ? '—' : formatINR(todaysSales.total_revenue)}
          </div>
          <div className="mt-1 text-xs opacity-70">
            {todaysSales.total_orders || 0} orders · {currentTime || '—'}
          </div>
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-teal-50 to-emerald-100 p-4 text-teal-800 shadow-sm ring-1 ring-black/5">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/70">
              <ShoppingBag className="h-4 w-4" />
            </div>
            <button
              type="button"
              onClick={fetchTotalRevenue}
              disabled={salesLoading}
              className="rounded-lg bg-white/80 p-2 text-teal-800 hover:bg-white disabled:opacity-50"
              title="Refresh lifetime revenue"
            >
              <RefreshCw className={`h-4 w-4 ${salesLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <div className="text-xs font-medium uppercase tracking-wide opacity-70">Lifetime</div>
          <div className="mt-1 text-xl font-semibold tabular-nums sm:text-2xl">
            {salesLoading ? '—' : formatINR(totalRevenue.total_revenue)}
          </div>
          <div className="mt-1 text-xs opacity-70">{totalRevenue.total_orders || 0} served orders</div>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200/80">
        <h3 className="text-base font-semibold text-zinc-900">Date range</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            ['today', 'Today'],
            ['thisWeek', 'This week'],
            ['thisMonth', 'This month'],
            ['lastMonth', 'Last month'],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setDateRangePreset(id)}
              className="min-h-[40px] rounded-full bg-zinc-50 px-3 text-sm font-medium text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-100"
            >
              {label}
            </button>
          ))}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <label className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            From
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 min-h-[44px] w-full rounded-xl border-0 bg-zinc-50 px-3 text-sm text-zinc-900 ring-1 ring-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900"
            />
          </label>
          <label className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            To
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 min-h-[44px] w-full rounded-xl border-0 bg-zinc-50 px-3 text-sm text-zinc-900 ring-1 ring-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900"
            />
          </label>
          <button
            type="button"
            onClick={generateSalesReport}
            disabled={reportLoading}
            className="min-h-[44px] rounded-xl bg-zinc-900 px-5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 sm:self-end"
          >
            {reportLoading ? 'Generating…' : 'Generate'}
          </button>
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>

      {salesReport && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-200/80">
              <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">Orders</div>
              <div className="mt-1 text-2xl font-semibold tabular-nums text-zinc-900">
                {salesReport.total_orders || 0}
              </div>
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-200/80">
              <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">Revenue</div>
              <div className="mt-1 text-2xl font-semibold tabular-nums text-zinc-900">
                {formatINR(salesReport.total_revenue || 0)}
              </div>
            </div>
          </div>

          {chartRows.length > 0 && (
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200/80">
              <h3 className="text-base font-semibold text-zinc-900">Daily revenue</h3>
              <p className="text-xs text-zinc-500">Paid orders in the selected range</p>
              <div className="mt-4 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartRows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="reportRevenueFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#b91c1c" stopOpacity={0.28} />
                        <stop offset="100%" stopColor="#b91c1c" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#71717a' }} axisLine={false} tickLine={false} />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#71717a' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
                      width={40}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      name="Revenue"
                      stroke="#b91c1c"
                      strokeWidth={2.5}
                      fill="url(#reportRevenueFill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {sortedDays.length > 0 && (
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200/80">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-base font-semibold text-zinc-900">Daily breakdown</h3>
                <div className="flex items-center gap-2">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="rounded-lg bg-zinc-50 px-2 py-1.5 text-sm text-zinc-900 ring-1 ring-zinc-200"
                  >
                    <option value="date">Date</option>
                    <option value="day">Day</option>
                    <option value="revenue">Revenue</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="rounded-lg bg-zinc-50 px-2 py-1.5 text-sm text-zinc-700 ring-1 ring-zinc-200"
                  >
                    {sortOrder === 'asc' ? '↑' : '↓'}
                  </button>
                </div>
              </div>
              <div className="divide-y divide-zinc-100">
                {pageDays.map((day: any) => (
                  <button
                    key={day.date}
                    type="button"
                    onClick={() => fetchDailyOrderDetails(day.date)}
                    className="flex w-full items-center justify-between py-3 text-left hover:bg-zinc-50"
                    title="Click to view order details"
                  >
                    <div>
                      <div className="text-sm font-medium text-zinc-900">
                        {new Date(day.date).toLocaleDateString('en-IN')}
                      </div>
                      <div className="text-xs text-zinc-500">
                        {new Date(day.date).toLocaleDateString('en-US', { weekday: 'long' })}
                        {day.orders != null ? ` · ${day.orders} orders` : ''}
                      </div>
                    </div>
                    <span className="font-semibold tabular-nums text-zinc-900">
                      {formatINR(Number(day.revenue) || 0)}
                    </span>
                  </button>
                ))}
              </div>
              {sortedDays.length > itemsPerPage && (
                <div className="mt-4 flex items-center justify-between text-sm text-zinc-600">
                  <span>
                    {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, sortedDays.length)} of{' '}
                    {sortedDays.length}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="rounded-lg p-1 ring-1 ring-zinc-200 disabled:opacity-50"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span>
                      {currentPage} / {pageCount}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCurrentPage((prev) => Math.min(prev + 1, pageCount))}
                      disabled={currentPage === pageCount}
                      className="rounded-lg p-1 ring-1 ring-zinc-200 disabled:opacity-50"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {salesReport.top_items && salesReport.top_items.length > 0 && (
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200/80">
              <h3 className="text-base font-semibold text-zinc-900">Top items</h3>
              <p className="text-xs text-zinc-500">Served dishes in this range</p>
              <ol className="mt-4 space-y-2">
                {salesReport.top_items.slice(0, 8).map((item: any, index: number) => (
                  <li key={`${item.name}-${index}`} className="flex items-center justify-between rounded-xl bg-zinc-50 px-3 py-2">
                    <span className="min-w-0 truncate text-sm font-medium text-zinc-900" title={item.name}>
                      {index + 1}. {item.name}
                    </span>
                    <span className="ml-3 rounded-full bg-zinc-900 px-2 py-0.5 text-xs font-semibold text-white">
                      {item.quantity}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <button
            type="button"
            onClick={closeReportModal}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-full bg-zinc-100 px-4 text-sm font-medium text-zinc-700 hover:bg-zinc-200"
          >
            <X className="h-4 w-4" />
            Clear report
          </button>
        </div>
      )}

      {showOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[80vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-zinc-900">
                Order details for{' '}
                {selectedDate
                  ? new Date(new Date(selectedDate).setDate(new Date(selectedDate).getDate() - 1)).toLocaleDateString(
                      'en-IN'
                    )
                  : ''}
              </h3>
              <button type="button" onClick={closeOrderModal} className="rounded-lg p-2 hover:bg-zinc-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            {detailsLoading ? (
              <div className="py-8 text-center">
                <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-red-600" />
                <p className="text-zinc-600">Loading order details...</p>
              </div>
            ) : orderDetails ? (
              <div>
                <div className="mb-6 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-zinc-50 p-4">
                    <div className="text-xs text-zinc-500">Total orders</div>
                    <div className="text-lg font-semibold text-zinc-900">{orderDetails.total_orders}</div>
                  </div>
                  <div className="rounded-xl bg-zinc-50 p-4">
                    <div className="text-xs text-zinc-500">Total revenue</div>
                    <div className="text-lg font-semibold text-zinc-900">
                      {formatINR(Number(orderDetails.total_revenue) || 0)}
                    </div>
                  </div>
                </div>

                {orderDetails.order_details && orderDetails.order_details.length > 0 ? (
                  <div className="-mx-4 overflow-x-auto sm:mx-0">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b border-zinc-200 text-left text-zinc-500">
                          <th className="px-3 py-2 font-medium">Dish</th>
                          <th className="px-3 py-2 text-center font-medium">Qty</th>
                          <th className="px-3 py-2 text-center font-medium">Unit</th>
                          <th className="px-3 py-2 text-right font-medium">Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orderDetails.order_details.map((item: any, index: number) => (
                          <tr key={index} className="border-b border-zinc-100">
                            <td className="px-3 py-2 text-zinc-900">{item.dish_name}</td>
                            <td className="px-3 py-2 text-center text-zinc-900">{item.quantity}</td>
                            <td className="px-3 py-2 text-center text-zinc-900">
                              ₹{Number(item.price_per_unit).toFixed(2)}
                            </td>
                            <td className="px-3 py-2 text-right font-medium text-zinc-900">
                              ₹{Number(item.revenue).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="font-semibold">
                          <td className="px-3 py-2" colSpan={3}>
                            Total
                          </td>
                          <td className="px-3 py-2 text-right">
                            ₹{Number(orderDetails.total_revenue).toFixed(2)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : (
                  <div className="py-8 text-center text-zinc-500">No order details available for this date.</div>
                )}
              </div>
            ) : (
              <div className="py-8 text-center text-red-600">Failed to load order details.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesReport;
