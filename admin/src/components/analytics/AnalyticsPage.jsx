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

function StatCard({ icon, label, value, sub, color = 'purple' }) {
  const colorMap = {
    purple: 'from-[#9333ea]/10 to-transparent border-[#9333ea]/20',
    green: 'from-green-500/10 to-transparent border-green-500/20',
    blue: 'from-blue-500/10 to-transparent border-blue-500/20',
    amber: 'from-amber-500/10 to-transparent border-amber-500/20',
    red: 'from-red-500/10 to-transparent border-red-500/20',
  }
  const gradient = colorMap[color] || colorMap.purple

  return (
    <div
      className={`bg-gradient-to-br ${gradient} bg-[#141414] border rounded-2xl p-5 flex flex-col gap-3`}
    >
      <div className="flex items-start justify-between">
        <span className="text-2xl leading-none">{icon}</span>
      </div>
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

const CustomTooltipRevenue = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1c1c1c] border border-white/10 rounded-xl px-4 py-3 shadow-xl text-sm">
      <p className="text-[#a0a0a0] mb-1">{label}</p>
      <p className="text-[#f0f0f0] font-bold">£{Number(payload[0]?.value || 0).toFixed(2)}</p>
      {payload[1] && (
        <p className="text-[#555]">{payload[1].value} orders</p>
      )}
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

export default function AnalyticsPage() {
  const { stats, revenueByDay, topProducts, statusBreakdown, loading, refetch } = useAnalytics()

  const pieData = Object.entries(statusBreakdown).map(([status, count]) => ({
    name: STATUS_LABELS[status] || status,
    value: count,
    color: STATUS_COLORS[status] || '#555',
  }))

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <div className="px-4 sm:px-6 lg:px-8 pt-6 pb-4 border-b border-white/[0.07]">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[#f0f0f0]">Analytics</h1>
            <p className="text-[#a0a0a0] text-sm mt-0.5">Business performance overview</p>
          </div>
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

      <div className="px-4 sm:px-6 lg:px-8 py-5 space-y-6">
        {/* Stats Grid */}
        <section>
          <h2 className="text-xs font-semibold text-[#555] uppercase tracking-widest mb-3">
            Key Metrics
          </h2>
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {[...Array(6)].map((_, i) => (
                <StatCardSkeleton key={i} />
              ))}
            </div>
          ) : stats ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              <StatCard
                icon="📦"
                label="Orders Today"
                value={stats.ordersToday}
                sub={`${stats.totalOrders} total all time`}
                color="blue"
              />
              <StatCard
                icon="💷"
                label="Revenue Today"
                value={`£${stats.revenueToday.toFixed(2)}`}
                color="green"
              />
              <StatCard
                icon="💰"
                label="Total Revenue"
                value={`£${stats.totalRevenue.toFixed(2)}`}
                sub="All time"
                color="purple"
              />
              <StatCard
                icon="📊"
                label="Avg Order Value"
                value={`£${stats.avgOrderValue.toFixed(2)}`}
                color="amber"
              />
              <StatCard
                icon="✅"
                label="Completed Orders"
                value={stats.completedOrders}
                sub={`${stats.cancelledOrders} cancelled`}
                color="green"
              />
              <StatCard
                icon="↩"
                label="Total Refunds"
                value={`£${stats.refundTotal.toFixed(2)}`}
                color="red"
              />
            </div>
          ) : null}
        </section>

        {/* Revenue Chart */}
        <section>
          <div className="bg-[#141414] border border-white/[0.07] rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-[#f0f0f0] mb-1">Revenue — Last 7 Days</h2>
            <p className="text-xs text-[#555] mb-5">Daily revenue trend</p>

            {loading ? (
              <div className="h-64 flex items-center justify-center">
                <Spinner size="lg" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={revenueByDay} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
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

        {/* Bottom row: Top Products + Pie chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Top products bar chart */}
          <div className="lg:col-span-2 bg-[#141414] border border-white/[0.07] rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-[#f0f0f0] mb-1">Top Products</h2>
            <p className="text-xs text-[#555] mb-5">By units sold (top 8)</p>

            {loading ? (
              <div className="h-64 flex items-center justify-center">
                <Spinner size="lg" />
              </div>
            ) : topProducts.length === 0 ? (
              <div className="h-64 flex items-center justify-center">
                <p className="text-[#555] text-sm">No product data yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  layout="vertical"
                  data={topProducts}
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
                  <Bar dataKey="count" fill="#9333ea" radius={[0, 4, 4, 0]}>
                    {topProducts.map((_, i) => (
                      <Cell
                        key={i}
                        fill={`rgba(147,51,234,${1 - i * 0.1})`}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Order status pie chart */}
          <div className="bg-[#141414] border border-white/[0.07] rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-[#f0f0f0] mb-1">Order Status</h2>
            <p className="text-xs text-[#555] mb-3">All time breakdown</p>

            {loading ? (
              <div className="h-64 flex items-center justify-center">
                <Spinner size="lg" />
              </div>
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

        {/* Orders by day table */}
        <section>
          <div className="bg-[#141414] border border-white/[0.07] rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/[0.07]">
              <h2 className="text-sm font-semibold text-[#f0f0f0]">Daily Breakdown</h2>
              <p className="text-xs text-[#555] mt-0.5">Last 7 days performance</p>
            </div>
            {loading ? (
              <div className="p-5 space-y-3">
                {[...Array(7)].map((_, i) => (
                  <div key={i} className="flex gap-4 animate-pulse">
                    <div className="h-4 bg-white/[0.06] rounded w-16" />
                    <div className="h-4 bg-white/[0.06] rounded w-24" />
                    <div className="h-4 bg-white/[0.06] rounded w-12" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.04]">
                      <th className="text-left text-[#555] font-medium px-5 py-3 text-xs uppercase tracking-wider">
                        Day
                      </th>
                      <th className="text-right text-[#555] font-medium px-5 py-3 text-xs uppercase tracking-wider">
                        Orders
                      </th>
                      <th className="text-right text-[#555] font-medium px-5 py-3 text-xs uppercase tracking-wider">
                        Revenue
                      </th>
                      <th className="text-right text-[#555] font-medium px-5 py-3 text-xs uppercase tracking-wider">
                        Avg
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {revenueByDay.map((day, i) => (
                      <tr
                        key={i}
                        className="border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="text-[#f0f0f0] px-5 py-3">{day.date}</td>
                        <td className="text-[#a0a0a0] text-right px-5 py-3">{day.count}</td>
                        <td className="text-[#f0f0f0] font-medium text-right px-5 py-3">
                          £{day.revenue.toFixed(2)}
                        </td>
                        <td className="text-[#555] text-right px-5 py-3">
                          {day.count > 0
                            ? `£${(day.revenue / day.count).toFixed(2)}`
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-white/[0.07] bg-white/[0.02]">
                      <td className="text-[#a0a0a0] font-semibold px-5 py-3 text-xs uppercase tracking-wider">
                        7-Day Total
                      </td>
                      <td className="text-[#f0f0f0] font-bold text-right px-5 py-3">
                        {revenueByDay.reduce((s, d) => s + d.count, 0)}
                      </td>
                      <td className="text-[#f0f0f0] font-bold text-right px-5 py-3">
                        £{revenueByDay.reduce((s, d) => s + d.revenue, 0).toFixed(2)}
                      </td>
                      <td className="px-5 py-3" />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
