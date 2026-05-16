import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../context/ToastContext'
import { format } from 'date-fns'
import { Spinner } from '../ui/Spinner'

const REFUND_URL = import.meta.env.VITE_STRIPE_REFUND_URL

export default function RefundsPage() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [selections, setSelections] = useState({})
  const [reason, setReason] = useState('')
  const [processing, setProcessing] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('order_status', 'completed')
        .order('created_at', { ascending: false })
      if (!error) setOrders(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return orders
    return orders.filter(o =>
      (o.customer_name || '').toLowerCase().includes(q) ||
      (o.car_registration || '').toLowerCase().includes(q) ||
      String(o.id).slice(-6).toLowerCase().includes(q)
    )
  }, [orders, search])

  function selectOrder(order) {
    setSelectedOrder(order)
    setReason('')
    const items = Array.isArray(order.order_items) ? order.order_items : []
    const init = {}
    items.forEach((item, i) => { init[i] = Number(item.quantity) || 1 })
    setSelections(init)
  }

  const items = selectedOrder
    ? (Array.isArray(selectedOrder.order_items) ? selectedOrder.order_items : [])
    : []

  const refundTotal = items.reduce((sum, item, i) => {
    return sum + (selections[i] || 0) * Number(item.price)
  }, 0)

  function setQty(index, qty) {
    setSelections(prev => ({ ...prev, [index]: qty }))
  }

  async function handleProcess() {
    if (!selectedOrder || refundTotal <= 0 || !reason.trim()) return
    if (!REFUND_URL) {
      toast.error('Refund URL not configured — set VITE_STRIPE_REFUND_URL in Netlify env vars')
      return
    }

    setProcessing(true)
    try {
      const res = await fetch(REFUND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: selectedOrder.id,
          amount: Math.round(refundTotal * 100) / 100,
          reason: reason.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Refund failed')

      toast.success(`£${refundTotal.toFixed(2)} refunded successfully`)
      setOrders(prev => prev.filter(o => o.id !== selectedOrder.id))
      setSelectedOrder(null)
      setSelections({})
      setReason('')
    } catch (err) {
      toast.error(err.message || 'Refund failed')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <div className="sticky top-0 lg:top-0 z-10 bg-[#0a0a0a]/90 backdrop-blur-md border-b border-white/[0.07]">
        <div className="px-4 sm:px-6 lg:px-8 pt-5 pb-4">
          <h1 className="text-xl font-bold text-[#f0f0f0]">Refunds</h1>
          <p className="text-[#a0a0a0] text-sm mt-0.5">
            {loading ? 'Loading…' : `${orders.length} completed order${orders.length !== 1 ? 's' : ''} eligible for refund`}
          </p>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-5">
        <div className="flex flex-col lg:flex-row gap-5">

          {/* ── Left: order list ── */}
          <div className="w-full lg:w-96 flex-shrink-0 space-y-3">
            {/* Search */}
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="search"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or car reg…"
                className="w-full bg-[#1c1c1c] border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-[#f0f0f0] text-sm focus:border-[#9333ea]/50 focus:ring-1 focus:ring-[#9333ea]/20 transition-all placeholder-[#555]"
              />
            </div>

            {loading && (
              <div className="flex justify-center py-12">
                <Spinner />
              </div>
            )}

            {!loading && filtered.length === 0 && (
              <div className="text-center py-14">
                <p className="text-[#f0f0f0] font-medium mb-1">
                  {search ? 'No orders match' : 'No completed orders'}
                </p>
                <p className="text-[#555] text-sm">
                  {search ? `Nothing found for "${search}"` : 'Completed orders will appear here once marked as complete.'}
                </p>
              </div>
            )}

            {filtered.map(order => (
              <button
                key={order.id}
                onClick={() => selectOrder(order)}
                className={`w-full text-left bg-[#141414] border rounded-2xl p-4 transition-all hover:border-white/[0.15] ${
                  selectedOrder?.id === order.id
                    ? 'border-[#9333ea]/50 bg-[#9333ea]/[0.06]'
                    : 'border-white/[0.07]'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <span className="font-mono text-sm font-bold text-[#f0f0f0]">
                    #{String(order.id).slice(-6).toUpperCase()}
                  </span>
                  <span className="text-sm font-bold text-[#f0f0f0]">
                    £{Number(order.total).toFixed(2)}
                  </span>
                </div>
                <p className="text-sm text-[#a0a0a0] mb-1">{order.customer_name}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {order.car_registration && (
                    <span className="text-xs font-mono bg-[#1c1c1c] border border-white/10 px-1.5 py-0.5 rounded text-[#a0a0a0]">
                      {order.car_registration}
                    </span>
                  )}
                  <span className="text-xs text-[#555]">
                    {format(new Date(order.created_at), 'dd MMM · HH:mm')}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* ── Right: refund form ── */}
          {selectedOrder ? (
            <div className="flex-1">
              <div className="bg-[#141414] border border-white/[0.07] rounded-2xl p-5">
                {/* Order header */}
                <div className="flex items-start justify-between mb-5 pb-4 border-b border-white/[0.07]">
                  <div>
                    <p className="text-xs text-[#555] uppercase tracking-widest mb-1">Refunding</p>
                    <h2 className="text-[#f0f0f0] font-bold text-lg font-mono">
                      #{String(selectedOrder.id).slice(-6).toUpperCase()}
                    </h2>
                    <p className="text-[#a0a0a0] text-sm">{selectedOrder.customer_name}</p>
                    {selectedOrder.car_registration && (
                      <span className="text-xs font-mono bg-[#1c1c1c] border border-white/10 px-1.5 py-0.5 rounded text-[#a0a0a0] inline-block mt-1">
                        {selectedOrder.car_registration}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="p-1.5 rounded-lg text-[#555] hover:text-[#a0a0a0] hover:bg-white/[0.06] transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Item selection */}
                <p className="text-xs font-semibold text-[#555] uppercase tracking-widest mb-3">
                  Select items to refund
                </p>
                <div className="space-y-2 mb-5">
                  {items.map((item, i) => {
                    const qty = selections[i] ?? 0
                    const maxQty = Number(item.quantity) || 1
                    const lineTotal = qty * Number(item.price)
                    const selected = qty > 0

                    return (
                      <div
                        key={i}
                        className={`flex items-center gap-3 rounded-xl px-4 py-3 border transition-colors ${
                          selected
                            ? 'bg-[#9333ea]/[0.06] border-[#9333ea]/20'
                            : 'bg-[#1c1c1c] border-white/[0.07]'
                        }`}
                      >
                        {/* Qty stepper */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            onClick={() => setQty(i, Math.max(0, qty - 1))}
                            className="w-7 h-7 rounded-lg bg-[#141414] border border-white/10 text-[#f0f0f0] flex items-center justify-center hover:bg-white/[0.08] transition-all text-base font-bold leading-none"
                          >
                            −
                          </button>
                          <span className={`w-6 text-center text-sm font-bold tabular-nums ${selected ? 'text-[#f0f0f0]' : 'text-[#555]'}`}>
                            {qty}
                          </span>
                          <button
                            onClick={() => setQty(i, Math.min(maxQty, qty + 1))}
                            className="w-7 h-7 rounded-lg bg-[#141414] border border-white/10 text-[#f0f0f0] flex items-center justify-center hover:bg-white/[0.08] transition-all text-base font-bold leading-none"
                          >
                            +
                          </button>
                        </div>

                        {/* Item info */}
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${selected ? 'text-[#f0f0f0]' : 'text-[#555]'}`}>
                            {item.name}
                          </p>
                          <p className="text-xs text-[#555]">
                            £{Number(item.price).toFixed(2)} each
                            {maxQty > 1 && ` · ordered ${maxQty}`}
                          </p>
                        </div>

                        {/* Line total */}
                        <span className={`text-sm font-bold tabular-nums flex-shrink-0 ${selected ? 'text-[#c084fc]' : 'text-[#555]'}`}>
                          {selected ? `£${lineTotal.toFixed(2)}` : '—'}
                        </span>
                      </div>
                    )
                  })}
                </div>

                {/* Reason */}
                <p className="text-xs font-semibold text-[#555] uppercase tracking-widest mb-2">
                  Reason <span className="text-red-400">*</span>
                </p>
                <textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="Describe the reason for this refund…"
                  rows={2}
                  className="w-full bg-[#1c1c1c] border border-white/10 rounded-xl px-4 py-3 text-[#f0f0f0] text-sm resize-none focus:border-[#9333ea]/50 focus:ring-1 focus:ring-[#9333ea]/20 transition-all placeholder-[#555] mb-4"
                />

                {/* Refund total */}
                <div className="bg-[#9333ea]/10 border border-[#9333ea]/20 rounded-xl px-4 py-3 flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs text-[#555] mb-0.5">Refund total</p>
                    <p className="text-xs text-[#555]">
                      Order total: £{Number(selectedOrder.total).toFixed(2)}
                    </p>
                  </div>
                  <span className="text-2xl font-bold text-[#c084fc]">£{refundTotal.toFixed(2)}</span>
                </div>

                <button
                  onClick={handleProcess}
                  disabled={refundTotal <= 0 || !reason.trim() || processing}
                  className="w-full py-3 rounded-xl bg-[#9333ea] hover:bg-[#7e22ce] text-white text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-purple-900/30"
                >
                  {processing ? (
                    <><Spinner size="sm" />Processing…</>
                  ) : (
                    `Process Refund — £${refundTotal.toFixed(2)}`
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 hidden lg:flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-[#141414] border border-white/[0.07] flex items-center justify-center text-3xl mx-auto mb-4">
                  ↩
                </div>
                <p className="text-[#f0f0f0] font-medium mb-1">Select an order to refund</p>
                <p className="text-[#555] text-sm">Pick a completed order from the list on the left</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
