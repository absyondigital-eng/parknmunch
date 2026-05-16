import { useState, useCallback, useRef } from 'react'
import { useOrders } from '../../hooks/useOrders'
import { useToast } from '../../context/ToastContext'
import { playNotificationSound } from '../../lib/audio'
import { OrderCard } from './OrderCard'
import { OrderDetailModal } from './OrderDetailModal'
import { RefundModal } from '../refunds/RefundModal'
import { Spinner } from '../ui/Spinner'

const FILTERS = [
  { key: 'new',       label: 'New' },
  { key: 'completed', label: 'Completed' },
  { key: 'all',       label: 'All' },
]

const FILTER_BADGE_COLOR = {
  new:       'bg-red-500 text-white',
  completed: 'bg-green-500 text-white',
  all:       'bg-[#9333ea] text-white',
}

export default function OrdersPage() {
  const [activeFilter, setActiveFilter] = useState('new')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [refundOrder, setRefundOrder] = useState(null)
  const { toast } = useToast()
  const topRef = useRef(null)

  const handleNewOrder = useCallback(
    (order) => {
      playNotificationSound()
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

  // Counts per status
  const countsByStatus = orders.reduce((acc, o) => {
    acc[o.order_status] = (acc[o.order_status] || 0) + 1
    return acc
  }, {})

  const filteredOrders =
    activeFilter === 'all' ? orders : orders.filter((o) => o.order_status === activeFilter)

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

  // Sync selectedOrder with latest data
  const liveSelectedOrder = selectedOrder
    ? orders.find((o) => o.id === selectedOrder.id) || selectedOrder
    : null

  return (
    <div className="min-h-screen bg-[#0a0a0a]" ref={topRef}>
      {/* Page header */}
      <div className="sticky top-0 lg:top-0 z-10 bg-[#0a0a0a]/90 backdrop-blur-md border-b border-white/[0.07]">
        <div className="px-4 sm:px-6 lg:px-8 pt-5 pb-3">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-[#f0f0f0]">Orders</h1>
              <p className="text-[#a0a0a0] text-sm mt-0.5">
                {loading ? 'Loading…' : `${orders.length} order${orders.length !== 1 ? 's' : ''} total`}
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

          {/* Filter tabs */}
          <div className="flex gap-1 overflow-x-auto no-scrollbar pb-1">
            {FILTERS.map((f) => {
              const count = f.key === 'all' ? orders.length : (countsByStatus[f.key] || 0)
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
        </div>
      </div>

      {/* Content */}
      <div className="px-4 sm:px-6 lg:px-8 py-5">
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
              {activeFilter === 'new' ? '🎉' : activeFilter === 'completed' ? '✅' : '📋'}
            </div>
            <div className="text-center">
              <p className="text-[#f0f0f0] font-medium mb-1">
                {activeFilter === 'all'
                  ? 'No orders yet'
                  : activeFilter === 'new'
                  ? 'No new orders'
                  : `No ${activeFilter} orders`}
              </p>
              <p className="text-[#555] text-sm">
                {activeFilter === 'all'
                  ? 'Orders will appear here when customers place them.'
                  : activeFilter === 'new'
                  ? 'All caught up! New orders will appear here.'
                  : `No orders with status "${activeFilter}" at the moment.`}
              </p>
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
