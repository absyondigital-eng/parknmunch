import { useState, useMemo } from 'react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import {
  format,
  startOfMonth,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
} from 'date-fns'
import { useAnalytics } from '../../hooks/useAnalytics'
import { Spinner } from '../ui/Spinner'

const STATUS_COLORS = {
  new: '#ef4444',
  preparing: '#f59e0b',
  ready: '#3b82f6',
  completed: '#22c55e',
  cancelled: '#555555',
  refunded: '#9333ea',
}

const STATUS_LABELS = {
  new: 'New',
  preparing: 'Preparing',
  ready: 'Ready',
  completed: 'Completed',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
}

// ─── MiniCalendar ───────────────────────────────────────────────────────────

function MiniCalendar({ month, selectedDay, orderDates, onSelectDay, onChangeMonth }) {
  const monthStart = startOfMonth(month)
  const calStart   = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calEnd     = endOfWeek(
    new Date(month.getFullYear(), month.getMonth() + 1, 0),
    { weekStartsOn: 1 }
  )
  const days = eachDayOfInterval({ start: calStart, end: calEnd })

  return (
    <div className="bg-[#141414] border border-white/[0.07] rounded-2xl p-4">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => onChangeMonth(subMonths(month, 1))}
          className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-white/[0.06] text-[#a0a0a0] hover:text-[#f0f0f0] transition-colors"
        >
          ‹
        </button>
        <span className="text-sm font-semibold text-[#f0f0f0]">
          {format(month, 'MMMM yyyy')}
        </span>
        <button
          onClick={() => onChangeMonth(addMonths(month, 1))}
          className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-white/[0.06] text-[#a0a0a0] hover:text-[#f0f0f0] transition-colors"
        >
          ›
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-1">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <div key={i} className="text-center text-[10px] font-medium text-[#555] py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {days.map((day) => {
          const dateStr    = format(day, 'yyyy-MM-dd')
          const inMonth    = isSameMonth(day, month)
          const selected   = selectedDay && isSameDay(day, selectedDay)
          const today      = isToday(day)
          const hasOrders  = orderDates.has(dateStr)

          return (
            <button
              key={dateStr}
              onClick={() => inMonth && onSelectDay(day)}
              disabled={!inMonth}
              className={[
                'relative flex flex-col items-center justify-center h-9 w-full rounded-xl text-xs font-medium transition-all',
                !inMonth
                  ? 'text-[#2a2a2a] cursor-default'
                  : selected
                  ? 'bg-[#9333ea] text-white'
                  : today
                  ? 'ring-1 ring-[#9333ea]/60 text-[#f0f0f0] hover:bg-white/[0.06]'
                  : 'text-[#c0c0c0] hover:bg-white/[0.06]',
              ].join(' ')}
            >
              {format(day, 'd')}
              {hasOrders && inMonth && !selected && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#9333ea]" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Stat cards ─────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, sub, color = 'purple' }) {
  const colorMap = {
    purple: 'from-[#9333ea]/10 to-transparent border-[#9333ea]/20',
    green:  'from-green-500/10 to-transparent border-green-500/20',
    blue:   'from-blue-500/10 to-transparent border-blue-500/20',
    amber:  'from-amber-500/10 to-transparent border-amber-500/20',
    red:    'from-red-500/10 to-transparent border-red-500/20',
  }
  return (
    <div className={`bg-gradient-to-br ${colorMap[color] || colorMap.purple} bg-[#141414] border rounded-2xl p-5 flex flex-col gap-3`}>
      <span className="text-2xl leading-none">{icon}</span>
      <div>
        <p className="text-2xl sm:text-3xl font-bold text-[#f0f0f0] leading-tight">{value}</p>
        <p className="text-sm text-[#a0a0a0] mt-1">{label}</p>
        {sub && <p className="text-xs text-[#555] mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function StatCardSkeleton() {
  return (
    <div className="bg-[#141414] border border-white/[0.07] rounded-2xl p-5 animate-pulse">
      <div className="h-8 w-8 bg-white/[0.06] rounded mb-3" />
      <div className="h-8 bg-white/[0.06] rounded w-24 mb-2" />
      <div className="h-3 bg-white/[0.06] rounded w-32" />
    </div>
  )
}

// ─── Tooltips ────────────────────────────────────────────────────────────────

const CustomTooltipRevenue = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1c1c1c] border border-white/10 rounded-xl px-4 py-3 shadow-xl text-sm">
      <p className="text-[#a0a0a0] mb-1">{label}</p>
      <p className="text-[#f0f0f0] font-bold">£{Number(payload[0]?.value || 0).toFixed(2)}</p>
      {payload[1] && <p className="text-[#555]">{payload[1].value} orders</p>}
    </div>
  )
}

const CustomTooltipBar = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1c1c1c] border border-white/10 rounded-xl px-4 py-3 shadow-xl text-sm">
      <p className="text-[#a0a0a0] mb-1">{label}</p>
      <p className="text-[#f0f0f0] font-bold">{payload[0]?.value} sold</p>
    </div>
  )
}

// ─── Analytics Order Card (read-only, shown in day view) ────────────────────

function parseOrderItems(raw) {
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string') { try { return JSON.parse(raw) } catch {} }
  return []
}

function AnalyticsOrderCard({ order }) {
  const items     = parseOrderItems(order.order_items)
  const createdAt = new Date(order.created_at)
  const timeStr   = format(createdAt, 'HH:mm')
  // Orders placed after midnight but before 4pm belong to the previous trading day
  const isNextDay = createdAt.getHours() < 16
  const statusColor = STATUS_COLORS[order.order_status] || '#555'
  const statusLabel = STATUS_LABELS[order.order_status] || order.order_status

  return (
    <div className="bg-[#0f0f0f] border border-white/[0.07] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between px-5 py-4 border-b border-white/[0.05]">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[#f0f0f0] font-semibold text-sm">
              {order.customer_name || 'Unknown'}
            </span>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: statusColor + '28', color: statusColor }}
            >
              {statusLabel}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[11px] text-[#444] font-mono">
              #{String(order.id).slice(0, 8).toUpperCase()}
            </span>
            <span className="text-[#333]">·</span>
            <span className="text-[11px] text-[#a0a0a0]">{timeStr}</span>
            {isNextDay && (
              <span className="text-[10px] text-[#555] bg-white/[0.05] border border-white/[0.06] px-1.5 py-0.5 rounded-md leading-none">
                +1 day
              </span>
            )}
          </div>
        </div>
        <div className="text-right shrink-0 ml-4">
          <div className="text-[#f0f0f0] font-bold text-base">
            £{Number(order.total || 0).toFixed(2)}
          </div>
          {order.subtotal && Number(order.subtotal) !== Number(order.total) && (
            <div className="text-[11px] text-[#555]">sub £{Number(order.subtotal).toFixed(2)}</div>
          )}
        </div>
      </div>

      {/* Items */}
      {items.length > 0 && (
        <div className="px-5 py-3 border-b border-white/[0.05] space-y-1.5">
          {items.map((item, i) => (
            <div key={i} className="flex items-start justify-between gap-4">
              <span className="text-sm text-[#d0d0d0] leading-snug">
                <span className="text-[#666]">{item.quantity}×</span> {item.name}
              </span>
              <span className="text-sm text-[#555] shrink-0">
                £{Number(item.price || 0).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Customer + meta */}
      <div className="px-5 py-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {order.car_registration && (
          <span className="text-xs text-[#888]">🚗 {order.car_registration}</span>
        )}
        {order.bay_number && (
          <span className="text-xs text-[#888]">📍 Bay {order.bay_number}</span>
        )}
        {order.customer_phone && (
          <span className="text-xs text-[#888]">📞 {order.customer_phone}</span>
        )}
        {order.customer_email && (
          <span className="text-xs text-[#888]">✉ {order.customer_email}</span>
        )}
        {order.notes && (
          <span className="text-xs text-[#888] w-full">📝 {order.notes}</span>
        )}
        {order.discount_code && (
          <span className="text-xs text-[#888]">🏷 {order.discount_code}</span>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [mode,          setMode]          = useState('month') // 'day' | 'month'
  const [selectedMonth, setSelectedMonth] = useState(startOfMonth(new Date()))
  const [selectedDay,   setSelectedDay]   = useState(null)

  const { stats, dailyData, orderDates, activeOrders, loading, refetch } = useAnalytics({
    mode,
    selectedMonth,
    selectedDay,
  })

  const pieData = useMemo(
    () =>
      Object.entries(stats.statusBreakdown || {}).map(([status, count]) => ({
        name:  STATUS_LABELS[status] || status,
        value: count,
        color: STATUS_COLORS[status] || '#555',
      })),
    [stats.statusBreakdown]
  )

  // Only show days that have orders in the monthly table
  const activeDailyData = useMemo(
    () => dailyData.filter((d) => d.count > 0),
    [dailyData]
  )

  function handleSelectDay(day) {
    setSelectedDay(day)
    setMode('day')
  }

  function handleChangeMonth(newMonth) {
    setSelectedMonth(startOfMonth(newMonth))
    setSelectedDay(null)
    setMode('month')
  }

  const periodLabel =
    mode === 'day' && selectedDay
      ? format(selectedDay, 'EEEE, d MMMM yyyy')
      : format(selectedMonth, 'MMMM yyyy')

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <div className="px-4 sm:px-6 lg:px-8 pt-6 pb-4 border-b border-white/[0.07]">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[#f0f0f0]">Analytics</h1>
            <p className="text-[#a0a0a0] text-sm mt-0.5">{periodLabel}</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Mode toggle */}
            <div className="flex rounded-xl border border-white/[0.08] overflow-hidden text-sm">
              <button
                onClick={() => { setMode('month'); setSelectedDay(null) }}
                className={`px-3 py-1.5 font-medium transition-colors ${
                  mode === 'month'
                    ? 'bg-[#9333ea] text-white'
                    : 'text-[#a0a0a0] hover:text-[#f0f0f0] hover:bg-white/[0.06]'
                }`}
              >
                Month
              </button>
              <button
                onClick={() => setMode('day')}
                className={`px-3 py-1.5 font-medium transition-colors ${
                  mode === 'day'
                    ? 'bg-[#9333ea] text-white'
                    : 'text-[#a0a0a0] hover:text-[#f0f0f0] hover:bg-white/[0.06]'
                }`}
              >
                Day
              </button>
            </div>

            {/* Refresh */}
            <button
              onClick={refetch}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 text-[#a0a0a0] hover:text-[#f0f0f0] hover:bg-white/[0.06] text-sm transition-all disabled:opacity-40"
            >
              <svg
                className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-5 space-y-6">

        {/* Calendar + Stats side-by-side on larger screens */}
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
          {/* Calendar */}
          <MiniCalendar
            month={selectedMonth}
            selectedDay={mode === 'day' ? selectedDay : null}
            orderDates={orderDates}
            onSelectDay={handleSelectDay}
            onChangeMonth={handleChangeMonth}
          />

          {/* Stats Grid */}
          <section>
            <h2 className="text-xs font-semibold text-[#555] uppercase tracking-widest mb-3">
              Key Metrics
            </h2>
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[...Array(6)].map((_, i) => <StatCardSkeleton key={i} />)}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <StatCard
                  icon="📦"
                  label="Total Orders"
                  value={stats.totalOrders}
                  color="blue"
                />
                <StatCard
                  icon="💷"
                  label="Revenue"
                  value={`£${(stats.totalRevenue || 0).toFixed(2)}`}
                  color="green"
                />
                <StatCard
                  icon="📊"
                  label="Avg Order Value"
                  value={`£${(stats.avgOrderValue || 0).toFixed(2)}`}
                  color="amber"
                />
                <StatCard
                  icon="✅"
                  label="Completed"
                  value={stats.completedOrders}
                  color="green"
                />
                <StatCard
                  icon="↩"
                  label="Refunded"
                  value={stats.refundedOrders}
                  sub={`£${(stats.refundTotal || 0).toFixed(2)}`}
                  color="red"
                />
                <StatCard
                  icon="💰"
                  label="Net Revenue"
                  value={`£${((stats.totalRevenue || 0) - (stats.refundTotal || 0)).toFixed(2)}`}
                  color="purple"
                />
              </div>
            )}
          </section>
        </div>

        {/* Month mode: Revenue area chart */}
        {mode === 'month' && (
          <section>
            <div className="bg-[#141414] border border-white/[0.07] rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-[#f0f0f0] mb-1">Daily Revenue</h2>
              <p className="text-xs text-[#555] mb-5">{format(selectedMonth, 'MMMM yyyy')}</p>
              {loading ? (
                <div className="h-64 flex items-center justify-center">
                  <Spinner size="lg" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={dailyData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#9333ea" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#9333ea" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: '#555', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      interval={Math.floor(dailyData.length / 8)}
                    />
                    <YAxis
                      tick={{ fill: '#555', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `£${v}`}
                      width={50}
                    />
                    <Tooltip content={<CustomTooltipRevenue />} />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#9333ea"
                      strokeWidth={2}
                      fill="url(#revenueGradient)"
                      dot={{ fill: '#9333ea', strokeWidth: 0, r: 3 }}
                      activeDot={{ fill: '#c084fc', r: 5, strokeWidth: 0 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </section>
        )}

        {/* Bottom row: Top Products + Pie chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Top products */}
          <div className="lg:col-span-2 bg-[#141414] border border-white/[0.07] rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-[#f0f0f0] mb-1">Top Products</h2>
            <p className="text-xs text-[#555] mb-5">By units sold (top 8)</p>
            {loading ? (
              <div className="h-64 flex items-center justify-center"><Spinner size="lg" /></div>
            ) : stats.topProducts?.length === 0 ? (
              <div className="h-64 flex items-center justify-center">
                <p className="text-[#555] text-sm">No product data yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  layout="vertical"
                  data={stats.topProducts || []}
                  margin={{ top: 0, right: 16, bottom: 0, left: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fill: '#555', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fill: '#a0a0a0', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={110}
                  />
                  <Tooltip content={<CustomTooltipBar />} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {(stats.topProducts || []).map((_, i) => (
                      <Cell key={i} fill={`rgba(147,51,234,${1 - i * 0.1})`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Order status pie */}
          <div className="bg-[#141414] border border-white/[0.07] rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-[#f0f0f0] mb-1">Order Status</h2>
            <p className="text-xs text-[#555] mb-3">Breakdown</p>
            {loading ? (
              <div className="h-64 flex items-center justify-center"><Spinner size="lg" /></div>
            ) : pieData.length === 0 ? (
              <div className="h-64 flex items-center justify-center">
                <p className="text-[#555] text-sm">No data yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="45%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [value, name]}
                    contentStyle={{
                      background: '#1c1c1c',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      fontSize: '12px',
                      color: '#f0f0f0',
                    }}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    formatter={(value) => (
                      <span style={{ color: '#a0a0a0', fontSize: '11px' }}>{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Day mode: full order list for the selected trading day */}
        {mode === 'day' && selectedDay && (
          <section>
            <div className="bg-[#141414] border border-white/[0.07] rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.07] flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-[#f0f0f0]">Orders</h2>
                  <p className="text-xs text-[#555] mt-0.5">
                    {format(selectedDay, 'EEE d MMM yyyy')} · 4pm – close
                    {activeOrders.length > 0 && ` · ${activeOrders.length} order${activeOrders.length !== 1 ? 's' : ''}`}
                  </p>
                </div>
              </div>

              {loading ? (
                <div className="p-4 space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-28 bg-white/[0.04] rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : activeOrders.length === 0 ? (
                <div className="p-10 text-center">
                  <div className="text-3xl mb-3">📋</div>
                  <p className="text-[#555] text-sm">No orders on this day</p>
                </div>
              ) : (
                <div className="p-4 space-y-3">
                  {[...activeOrders]
                    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
                    .map((order) => (
                      <AnalyticsOrderCard key={order.id} order={order} />
                    ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Month mode: daily breakdown table */}
        {mode === 'month' && (
          <section>
            <div className="bg-[#141414] border border-white/[0.07] rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.07]">
                <h2 className="text-sm font-semibold text-[#f0f0f0]">Daily Breakdown</h2>
                <p className="text-xs text-[#555] mt-0.5">{format(selectedMonth, 'MMMM yyyy')} — days with orders only</p>
              </div>
              {loading ? (
                <div className="p-5 space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex gap-4 animate-pulse">
                      <div className="h-4 bg-white/[0.06] rounded w-16" />
                      <div className="h-4 bg-white/[0.06] rounded w-24" />
                      <div className="h-4 bg-white/[0.06] rounded w-12" />
                    </div>
                  ))}
                </div>
              ) : activeDailyData.length === 0 ? (
                <div className="p-8 text-center text-[#555] text-sm">No orders this month</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/[0.04]">
                        <th className="text-left text-[#555] font-medium px-5 py-3 text-xs uppercase tracking-wider">Date</th>
                        <th className="text-right text-[#555] font-medium px-5 py-3 text-xs uppercase tracking-wider">Orders</th>
                        <th className="text-right text-[#555] font-medium px-5 py-3 text-xs uppercase tracking-wider">Revenue</th>
                        <th className="text-right text-[#555] font-medium px-5 py-3 text-xs uppercase tracking-wider">Avg</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeDailyData.map((day, i) => (
                        <tr
                          key={i}
                          onClick={() => handleSelectDay(new Date(day.fullDate))}
                          className="border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors cursor-pointer"
                        >
                          <td className="text-[#f0f0f0] px-5 py-3">
                            {format(new Date(day.fullDate), 'EEE d MMM')}
                          </td>
                          <td className="text-[#a0a0a0] text-right px-5 py-3">{day.count}</td>
                          <td className="text-[#f0f0f0] font-medium text-right px-5 py-3">
                            £{day.revenue.toFixed(2)}
                          </td>
                          <td className="text-[#555] text-right px-5 py-3">
                            £{(day.revenue / day.count).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-white/[0.07] bg-white/[0.02]">
                        <td className="text-[#a0a0a0] font-semibold px-5 py-3 text-xs uppercase tracking-wider">
                          Month Total
                        </td>
                        <td className="text-[#f0f0f0] font-bold text-right px-5 py-3">
                          {activeDailyData.reduce((s, d) => s + d.count, 0)}
                        </td>
                        <td className="text-[#f0f0f0] font-bold text-right px-5 py-3">
                          £{activeDailyData.reduce((s, d) => s + d.revenue, 0).toFixed(2)}
                        </td>
                        <td className="px-5 py-3" />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
