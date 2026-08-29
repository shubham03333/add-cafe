'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { IndianRupee, ShoppingBag, TrendingUp, UtensilsCrossed } from 'lucide-react';

const COLORS = ['#b91c1c', '#0f766e', '#d97706', '#1d4ed8', '#7c3aed', '#be185d'];

const formatINR = (value: number) =>
  `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-zinc-200 bg-white/95 px-3 py-2 shadow-lg backdrop-blur-sm">
      {label && <div className="mb-1 text-xs font-medium text-zinc-500">{label}</div>}
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="text-sm font-semibold text-zinc-900">
          {entry.name}: {entry.dataKey?.toString().toLowerCase().includes('revenue') || entry.name === 'Revenue'
            ? formatINR(entry.value)
            : entry.value?.toLocaleString('en-IN')}
        </div>
      ))}
    </div>
  );
};

interface AdminOverviewProps {
  todaysSales: {
    total_orders: number;
    total_revenue: number;
    payment_breakdown?: {
      cash: { orders: number; revenue: number };
      online: { orders: number; revenue: number };
    };
  };
  totalRevenue: { total_orders: number; total_revenue: number };
  salesLoading: boolean;
  onResetTodaysSales: () => void;
}

export default function AdminOverview({
  todaysSales,
  totalRevenue,
  salesLoading,
  onResetTodaysSales,
}: AdminOverviewProps) {
  const [rangeDays, setRangeDays] = useState(7);
  const [trend, setTrend] = useState<any[]>([]);
  const [dishes, setDishes] = useState<any[]>([]);
  const [chartsLoading, setChartsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setChartsLoading(true);
      try {
        const [analyticsRes, demandRes] = await Promise.all([
          fetch(`/api/orders/analytics?period=daily&days=${rangeDays}`),
          fetch(`/api/orders/demand?days=${rangeDays}`),
        ]);
        const analytics = analyticsRes.ok ? await analyticsRes.json() : { data: [] };
        const demand = demandRes.ok ? await demandRes.json() : [];
        if (cancelled) return;

        const rows = [...(analytics.data || [])]
          .reverse()
          .map((row: any) => {
            const raw = String(row.time_period || '');
            const date = new Date(raw.includes('T') ? raw : `${raw}T00:00:00`);
            return {
              label: Number.isNaN(date.getTime())
                ? raw.slice(5)
                : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
              orders: Number(row.order_count) || 0,
              revenue: Number(row.total_revenue) || 0,
            };
          });
        setTrend(rows);
        setDishes(
          (Array.isArray(demand) ? demand : [])
            .sort((a: any, b: any) => b.totalQuantity - a.totalQuantity)
            .slice(0, 8)
            .map((d: any) => ({
              name: d.dishName?.length > 18 ? `${d.dishName.slice(0, 16)}…` : d.dishName,
              fullName: d.dishName,
              qty: d.totalQuantity,
              revenue: d.totalRevenue,
            }))
        );
      } catch {
        if (!cancelled) {
          setTrend([]);
          setDishes([]);
        }
      } finally {
        if (!cancelled) setChartsLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [rangeDays]);

  const paymentData = useMemo(() => {
    const cash = Number(todaysSales.payment_breakdown?.cash?.revenue) || 0;
    const online = Number(todaysSales.payment_breakdown?.online?.revenue) || 0;
    return [
      { name: 'Cash', value: cash, orders: todaysSales.payment_breakdown?.cash?.orders || 0 },
      { name: 'Online', value: online, orders: todaysSales.payment_breakdown?.online?.orders || 0 },
    ].filter((d) => d.value > 0 || d.orders > 0);
  }, [todaysSales]);

  const avgTicket =
    Number(todaysSales.total_orders) > 0
      ? Number(todaysSales.total_revenue) / Number(todaysSales.total_orders)
      : 0;

  const kpis = [
    {
      label: "Today's revenue",
      value: formatINR(todaysSales.total_revenue),
      hint: `${todaysSales.total_orders || 0} paid orders`,
      icon: IndianRupee,
      tone: 'from-red-50 to-rose-100 text-red-800',
    },
    {
      label: "Today's orders",
      value: String(todaysSales.total_orders || 0),
      hint: 'Paid today',
      icon: ShoppingBag,
      tone: 'from-teal-50 to-emerald-100 text-teal-800',
    },
    {
      label: 'Avg ticket today',
      value: formatINR(avgTicket),
      hint: 'Revenue / paid orders',
      icon: TrendingUp,
      tone: 'from-amber-50 to-orange-100 text-amber-900',
    },
    {
      label: 'Lifetime served',
      value: formatINR(totalRevenue.total_revenue),
      hint: `${totalRevenue.total_orders || 0} served orders`,
      icon: UtensilsCrossed,
      tone: 'from-slate-50 to-zinc-100 text-zinc-800',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">Overview</h2>
          <p className="mt-1 text-sm text-zinc-500">Live cafe performance — same data as reports, easier to scan.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setRangeDays(d)}
              className={`min-h-[40px] rounded-full px-3 text-sm font-medium transition-colors ${
                rangeDays === d
                  ? 'bg-zinc-900 text-white'
                  : 'bg-white text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-50'
              }`}
            >
              {d}d
            </button>
          ))}
          <button
            type="button"
            onClick={onResetTodaysSales}
            disabled={salesLoading}
            className="min-h-[40px] rounded-full bg-white px-3 text-sm font-medium text-red-700 ring-1 ring-red-200 hover:bg-red-50 disabled:opacity-50"
          >
            Reset today
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className={`rounded-2xl bg-gradient-to-br ${kpi.tone} p-4 shadow-sm ring-1 ring-black/5`}
            >
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-white/70">
                <Icon className="h-4 w-4" />
              </div>
              <div className="text-xs font-medium uppercase tracking-wide opacity-70">{kpi.label}</div>
              <div className="mt-1 text-xl font-semibold tabular-nums sm:text-2xl">
                {salesLoading ? '—' : kpi.value}
              </div>
              <div className="mt-1 text-xs opacity-70">{kpi.hint}</div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200/80 lg:col-span-3">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-zinc-900">Revenue trend</h3>
            <p className="text-xs text-zinc-500">Daily totals for the last {rangeDays} days</p>
          </div>
          <div className="h-64">
            {chartsLoading ? (
              <div className="flex h-full items-center justify-center text-sm text-zinc-400">Loading chart…</div>
            ) : trend.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-zinc-400">No order data in this range</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
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
                    fill="url(#revenueFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200/80 lg:col-span-2">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-zinc-900">Today’s payment mix</h3>
            <p className="text-xs text-zinc-500">Paid orders only</p>
          </div>
          <div className="h-64">
            {paymentData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-zinc-400">No paid sales yet today</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={58}
                    outerRadius={84}
                    paddingAngle={3}
                    stroke="none"
                  >
                    {paymentData.map((entry, index) => (
                      <Cell key={entry.name} fill={index === 0 ? '#0f766e' : '#1d4ed8'} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [formatINR(Number(value) || 0), '']}
                    contentStyle={{ borderRadius: 12, border: '1px solid #e4e4e7' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="mt-1 flex justify-center gap-4 text-xs text-zinc-600">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-teal-700" /> Cash {formatINR(todaysSales.payment_breakdown?.cash?.revenue || 0)}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-blue-700" /> Online {formatINR(todaysSales.payment_breakdown?.online?.revenue || 0)}
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200/80">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-zinc-900">Orders per day</h3>
            <p className="text-xs text-zinc-500">Volume, not revenue</p>
          </div>
          <div className="h-60">
            {chartsLoading || trend.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-zinc-400">
                {chartsLoading ? 'Loading chart…' : 'No order data'}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#71717a' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#71717a' }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="orders" name="Orders" fill="#0f766e" radius={[6, 6, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200/80">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-zinc-900">Top dishes</h3>
            <p className="text-xs text-zinc-500">Quantity sold in the last {rangeDays} days</p>
          </div>
          <div className="h-60">
            {chartsLoading || dishes.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-zinc-400">
                {chartsLoading ? 'Loading chart…' : 'No dish data'}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dishes} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#71717a' }} axisLine={false} tickLine={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={92}
                    tick={{ fontSize: 11, fill: '#3f3f46' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value, _n, item) => [Number(value) || 0, (item as any)?.payload?.fullName || 'Qty']}
                    contentStyle={{ borderRadius: 12, border: '1px solid #e4e4e7' }}
                  />
                  <Bar dataKey="qty" name="Sold" radius={[0, 6, 6, 0]} maxBarSize={18}>
                    {dishes.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
