import { useState, useCallback, useRef, useMemo } from 'react'
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
import { tradingDate } from '../../lib/tradingDay'
import { useOrders } from '../../hooks/useOrders'
import { useToast } from '../../context/ToastContext'
import { OrderCard } from './OrderCard'
import { OrderDetailModal } from './OrderDetailModal'
import { RefundModal } from '../refunds/RefundModal'
import { Spinner } from '../ui/Spinner'

const FILTERS = [
  { key: 'new',       label: 'New' },
  { key: 'today',     label: 'Today' },
  { key: 'completed', label: 'Completed' },
  { key: 'all',       label: 'All' },
]

const FILTER_BADGE_COLOR = {
  new:       'bg-red-500 text-white',
  today:     'bg-blue-500 text-white',
  completed: 'bg-green-500 text-white',
  all:       'bg-[#9333ea] text-white',
}

// ─── Mini calendar (day picker for Completed history) ───────────────────────

function MiniCalendar({ month, selectedDay, orderDates, onSelectDay, onChangeMonth }) {
  const monthStart = startOfMonth(month)
  const calStart   = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calEnd     = endOfWeek(
    new Date(month.getFullYear(), month.getMonth() + 1, 0),
    { weekStartsOn: 1 }
  )
  const days = eachDayOfInterval({ start: calStart, end: calEnd })

  return (
    <div className="bg-[#141414] border border-white/[0.07] rounded-2xl p-4 w-full max-w-xs">
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

      <div className="grid grid-cols-7 mb-1">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <div key={i} className="text-center text-[10px] font-medium text-[#555] py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-0.5">
        {days.map((day) => {
          const dateStr   = format(day, 'yyyy-MM-dd')
          const inMonth   = isSameMonth(day, month)
          const selected  = selectedDay && isSameDay(day, selectedDay)
          const today     = isToday(day)
          const hasOrders = orderDates.has(dateStr)

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
                  ? 'bg-[#22c55e] text-white'
                  : today
                  ? 'ring-1 ring-[#22c55e]/60 text-[#f0f0f0] hover:bg-white/[0.06]'
                  : 'text-[#c0c0c0] hover:bg-white/[0.06]',
              ].join(' ')}
            >
              {format(day, 'd')}
              {hasOrders && inMonth && !selected && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#22c55e]" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function OrdersPage() {
  const [activeFilter, setActiveFilter] = useState('new')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [refundOrder,   setRefundOrder]   = useState(null)

  // Completed-tab date filter state
  const [completedView,  setCompletedView]  = useState('all') // 'all' | 'month' | 'day'
  const [completedMonth, setCompletedMonth] = useState(startOfMonth(new Date()))
  const [completedDay,   setCompletedDay]   = useState(null)

  const { toast } = useToast()
  const topRef = useRef(null)

  const handleNewOrder = useCallback(
    (order) => {
      toast.info(`New order received from ${order.customer_name || 'a customer'}!`)
      topRef.current?.scrollIntoView({ behavior: 'smooth' })
    },
    [toast]
  )

  const {
    orders,
    loading,
    error,
    updateStatus,
    updateBayNumber,
    updateNotes,
    refetch,
  } = useOrders({ onNewOrder: handleNewOrder })

  // Counts per status (tab badges use unfiltered counts)
  const countsByStatus = orders.reduce((acc, o) => {
    acc[o.order_status] = (acc[o.order_status] || 0) + 1
    return acc
  }, {})

  const todayCount = useMemo(() => {
    const nowTrading = tradingDate(new Date())
    return orders.filter((o) => isSameDay(tradingDate(o.created_at), nowTrading)).length
  }, [orders])

  // Dates that have at least one completed order (calendar dots use trading date)
  const completedOrderDates = useMemo(
    () =>
      new Set(
        orders
          .filter((o) => o.order_status === 'completed')
          .map((o) => format(tradingDate(o.created_at), 'yyyy-MM-dd'))
      ),
    [orders]
  )

  // Apply status + optional date filter (all date comparisons use trading date)
  const filteredOrders = useMemo(() => {
    const nowTrading = tradingDate(new Date())

    let base =
      activeFilter === 'all'
        ? orders
        : activeFilter === 'today'
        ? orders.filter((o) => isSameDay(tradingDate(o.created_at), nowTrading))
        : orders.filter((o) => o.order_status === activeFilter)

    if (activeFilter === 'completed') {
      if (completedView === 'day' && completedDay) {
        base = base.filter((o) => isSameDay(tradingDate(o.created_at), completedDay))
      } else if (completedView === 'month') {
        base = base.filter((o) => isSameMonth(tradingDate(o.created_at), completedMonth))
      }
    }
    return base
  }, [orders, activeFilter, completedView, completedDay, completedMonth])

  async function handleStatusChange(orderId, newStatus, bayOverride) {
    if (bayOverride !== undefined) {
      const bayResult = await updateBayNumber(orderId, bayOverride)
      return { success: bayResult.success, bayResult }
    }
    const result = await updateStatus(orderId, newStatus)
    if (result.success) {
      toast.success(`Order status updated to ${newStatus}`)
    }
    return result
  }

  function handleRefundSuccess() {
    setRefundOrder(null)
    refetch()
    toast.success('Refund recorded successfully.')
  }

  // Keep modal in sync with live order data
  const liveSelectedOrder = selectedOrder
    ? orders.find((o) => o.id === selectedOrder.id) || selectedOrder
    : null

  // Human-readable label for the current completed filter
  const completedPeriodLabel =
    completedView === 'day' && completedDay
      ? format(completedDay, 'EEE d MMM yyyy')
      : completedView === 'month'
      ? format(completedMonth, 'MMMM yyyy')
      : null

  // Empty-state copy
  function emptyTitle() {
    if (activeFilter === 'all') return 'No orders yet'
    if (activeFilter === 'new') return 'No new orders'
    if (activeFilter === 'today') return 'No orders today'
    if (completedView === 'day' && completedDay)
      return `No completed orders on ${format(completedDay, 'd MMM')}`
    if (completedView === 'month')
      return `No completed orders in ${format(completedMonth, 'MMMM')}`
    return 'No completed orders'
  }

  function emptySubtitle() {
    if (activeFilter === 'all') return 'Orders will appear here when customers place them.'
    if (activeFilter === 'new') return 'All caught up! New orders will appear here.'
    if (activeFilter === 'today') return "Today's orders will appear here as they come in."
    if (completedView === 'day' && completedDay) return 'Try a different day.'
    if (completedView === 'month') return 'Try a different month.'
    return 'Completed orders will appear here.'
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]" ref={topRef}>
      {/* ── Sticky header ────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 bg-[#0a0a0a]/90 backdrop-blur-md border-b border-white/[0.07]">
        <div className="px-4 sm:px-6 lg:px-8 pt-5 pb-3">

          {/* Title + refresh */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-[#f0f0f0]">Orders</h1>
              <p className="text-[#a0a0a0] text-sm mt-0.5">
                {loading
                  ? 'Loading…'
                  : completedPeriodLabel && activeFilter === 'completed'
                  ? `${filteredOrders.length} order${filteredOrders.length !== 1 ? 's' : ''} · ${completedPeriodLabel}`
                  : `${orders.length} order${orders.length !== 1 ? 's' : ''} total`}
              </p>
            </div>
            <button
              onClick={refetch}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 text-[#a0a0a0] hover:text-[#f0f0f0] hover:bg-white/[0.06] text-sm transition-all disabled:opacity-40"
              title="Refresh orders"
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

          {/* Status filter tabs */}
          <div className="flex gap-1 overflow-x-auto no-scrollbar pb-1">
            {FILTERS.map((f) => {
              const count    = f.key === 'all' ? orders.length : f.key === 'today' ? todayCount : (countsByStatus[f.key] || 0)
              const isActive = activeFilter === f.key
              const badgeColor = FILTER_BADGE_COLOR[f.key] || 'bg-[#555] text-white'

              return (
                <button
                  key={f.key}
                  onClick={() => setActiveFilter(f.key)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-[#9333ea]/20 text-[#c084fc] border border-[#9333ea]/30'
                      : 'text-[#a0a0a0] hover:text-[#f0f0f0] hover:bg-white/[0.06]'
                  }`}
                >
                  {f.label}
                  {count > 0 && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        isActive ? 'bg-[#9333ea] text-white' : badgeColor
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Date filter row — only shown on the Completed tab */}
          {activeFilter === 'completed' && (
            <div className="flex items-center gap-1 mt-2 overflow-x-auto no-scrollbar">
              {/* All Time */}
              <button
                onClick={() => { setCompletedView('all'); setCompletedDay(null) }}
                className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  completedView === 'all'
                    ? 'bg-white/[0.1] text-[#f0f0f0] border border-white/[0.12]'
                    : 'text-[#a0a0a0] hover:text-[#f0f0f0] hover:bg-white/[0.06]'
                }`}
              >
                All Time
              </button>

              {/* Month with prev/next arrows */}
              <div className="flex items-center flex-shrink-0">
                <button
                  onClick={() => {
                    setCompletedView('month')
                    setCompletedMonth((m) => startOfMonth(subMonths(m, 1)))
                    setCompletedDay(null)
                  }}
                  className="w-6 h-6 flex items-center justify-center text-[#a0a0a0] hover:text-[#f0f0f0] transition-colors rounded-lg hover:bg-white/[0.06]"
                >
                  ‹
                </button>
                <button
                  onClick={() => { setCompletedView('month'); setCompletedDay(null) }}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    completedView === 'month'
                      ? 'bg-white/[0.1] text-[#f0f0f0] border border-white/[0.12]'
                      : 'text-[#a0a0a0] hover:text-[#f0f0f0] hover:bg-white/[0.06]'
                  }`}
                >
                  {format(completedMonth, 'MMM yyyy')}
                </button>
                <button
                  onClick={() => {
                    setCompletedView('month')
                    setCompletedMonth((m) => startOfMonth(addMonths(m, 1)))
                    setCompletedDay(null)
                  }}
                  className="w-6 h-6 flex items-center justify-center text-[#a0a0a0] hover:text-[#f0f0f0] transition-colors rounded-lg hover:bg-white/[0.06]"
                >
                  ›
                </button>
              </div>

              {/* Day picker toggle */}
              <button
                onClick={() => setCompletedView('day')}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  completedView === 'day'
                    ? 'bg-white/[0.1] text-[#f0f0f0] border border-white/[0.12]'
                    : 'text-[#a0a0a0] hover:text-[#f0f0f0] hover:bg-white/[0.06]'
                }`}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {completedView === 'day' && completedDay
                  ? format(completedDay, 'd MMM yyyy')
                  : 'Pick Day'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────────────────── */}
      <div className="px-4 sm:px-6 lg:px-8 py-5">

        {/* Calendar (day picker) — shown when Day mode is active on Completed tab */}
        {activeFilter === 'completed' && completedView === 'day' && (
          <div className="mb-5">
            <MiniCalendar
              month={completedMonth}
              selectedDay={completedDay}
              orderDates={completedOrderDates}
              onSelectDay={(day) => {
                setCompletedDay(day)
                setCompletedMonth(startOfMonth(day))
              }}
              onChangeMonth={(m) => setCompletedMonth(startOfMonth(m))}
            />
            {!completedDay && (
              <p className="text-xs text-[#555] mt-2 ml-1">
                Green dots indicate days with completed orders. Tap a date to filter.
              </p>
            )}
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-2xl">
              ⚠
            </div>
            <p className="text-[#a0a0a0] text-center">{error}</p>
            <button
              onClick={refetch}
              className="px-4 py-2 bg-[#9333ea]/20 text-[#c084fc] border border-[#9333ea]/30 rounded-xl text-sm font-medium hover:bg-[#9333ea]/30 transition-all"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Loading skeletons */}
        {loading && !error && (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="bg-[#141414] border border-white/[0.07] rounded-2xl p-5 animate-pulse"
              >
                <div className="flex justify-between mb-3">
                  <div className="h-4 bg-white/[0.06] rounded w-32" />
                  <div className="h-5 bg-white/[0.06] rounded-full w-20" />
                </div>
                <div className="flex gap-4 mb-3">
                  <div className="h-3 bg-white/[0.06] rounded w-24" />
                  <div className="h-3 bg-white/[0.06] rounded w-20" />
                </div>
                <div className="space-y-2 mb-3">
                  <div className="h-3 bg-white/[0.06] rounded w-full" />
                  <div className="h-3 bg-white/[0.06] rounded w-3/4" />
                </div>
                <div className="flex gap-2 mt-4 pt-3 border-t border-white/[0.04]">
                  <div className="h-8 bg-white/[0.06] rounded-lg w-24" />
                  <div className="h-8 bg-white/[0.06] rounded-lg w-20 ml-auto" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && filteredOrders.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-20 h-20 rounded-2xl bg-[#141414] border border-white/[0.07] flex items-center justify-center text-4xl">
              {activeFilter === 'new' ? '🎉' : activeFilter === 'today' ? '📅' : activeFilter === 'completed' ? '✅' : '📋'}
            </div>
            <div className="text-center">
              <p className="text-[#f0f0f0] font-medium mb-1">{emptyTitle()}</p>
              <p className="text-[#555] text-sm">{emptySubtitle()}</p>
            </div>
          </div>
        )}

        {/* Orders list */}
        {!loading && !error && filteredOrders.length > 0 && (
          <div className="space-y-3">
            {filteredOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onViewDetails={setSelectedOrder}
                onStatusChange={handleStatusChange}
                onRefund={setRefundOrder}
              />
            ))}
          </div>
        )}
      </div>

      {/* Detail modal */}
      {liveSelectedOrder && (
        <OrderDetailModal
          order={liveSelectedOrder}
          onClose={() => setSelectedOrder(null)}
          onStatusChange={handleStatusChange}
          onRefund={(order) => {
            setSelectedOrder(null)
            setRefundOrder(order)
          }}
        />
      )}

      {/* Refund modal */}
      {refundOrder && (
        <RefundModal
          order={refundOrder}
          onClose={() => setRefundOrder(null)}
          onSuccess={handleRefundSuccess}
        />
      )}
    </div>
  )
}
