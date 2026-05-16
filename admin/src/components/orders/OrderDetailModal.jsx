import { useState } from 'react'
import { format } from 'date-fns'
import { Modal } from '../ui/Modal'
import { StatusBadge } from '../ui/Badge'
import { useToast } from '../../context/ToastContext'
import { supabase } from '../../lib/supabase'

const STATUS_TRANSITIONS = {
  new: ['completed'],
  completed: [],
  refunded: [],
}

const TRANSITION_STYLES = {
  completed: 'bg-green-500/15 text-green-400 border-green-500/30 hover:bg-green-500/25',
}

const TRANSITION_LABELS = {
  completed: 'Mark as Completed',
}

export function OrderDetailModal({ order, onClose, onStatusChange, onRefund }) {
  const [bayNumber, setBayNumber] = useState(order.bay_number || '')
  const [notes, setNotes] = useState(order.notes || '')
  const [savingBay, setSavingBay] = useState(false)
  const [savingNotes, setSavingNotes] = useState(false)
  const [changingStatus, setChangingStatus] = useState(null)
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

  const items = Array.isArray(order.order_items) ? order.order_items : []
  const nextStatuses = STATUS_TRANSITIONS[order.order_status] || []
  const createdAt = new Date(order.created_at)

  async function handleBaySave() {
    if (bayNumber === (order.bay_number || '')) return
    setSavingBay(true)
    try {
      const { error } = await supabase
        .from('orders')
        .update({ bay_number: bayNumber })
        .eq('id', order.id)
      if (error) throw error
      toast.success('Bay number updated')
    } catch {
      toast.error('Failed to update bay number')
    } finally {
      setSavingBay(false)
    }
  }

  async function handleNotesSave() {
    if (notes === (order.notes || '')) return
    setSavingNotes(true)
    try {
      const { error } = await supabase
        .from('orders')
        .update({ notes })
        .eq('id', order.id)
      if (error) throw error
      toast.success('Notes saved')
    } catch {
      toast.error('Failed to save notes')
    } finally {
      setSavingNotes(false)
    }
  }

  async function handleStatusChange(newStatus) {
    setChangingStatus(newStatus)
    const result = await onStatusChange(order.id, newStatus)
    setChangingStatus(null)
    if (result?.success) {
      toast.success(`Order marked as ${newStatus}`)
    } else {
      toast.error('Failed to update status')
    }
  }

  function copyStripeId() {
    if (order.stripe_session_id) {
      navigator.clipboard.writeText(order.stripe_session_id).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
    }
  }

  function handlePrint() {
    window.print()
  }

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`Order #${String(order.id).slice(-6).toUpperCase()}`}
      size="xl"
    >
      {/* Status bar */}
      <div className="flex flex-wrap items-center gap-3 mb-6 pb-4 border-b border-white/[0.07]">
        <StatusBadge status={order.order_status} />
        <span className="text-[#555] text-sm">·</span>
        <span className="text-[#a0a0a0] text-sm">{format(createdAt, 'PPpp')}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* LEFT COLUMN */}
        <div className="space-y-5">
          {/* Customer info */}
          <section>
            <h3 className="text-xs font-semibold text-[#555] uppercase tracking-widest mb-3">
              Customer
            </h3>
            <div className="bg-[#1c1c1c] rounded-xl p-4 space-y-2.5">
              <InfoRow icon="👤" label="Name" value={order.customer_name || 'N/A'} />
              <InfoRow icon="📞" label="Phone" value={order.customer_phone || 'N/A'} />
              <InfoRow
                icon="🚗"
                label="Car Reg"
                value={
                  <span className="font-mono bg-[#141414] border border-white/10 px-2 py-0.5 rounded text-xs">
                    {order.car_registration || 'N/A'}
                  </span>
                }
              />
            </div>
          </section>

          {/* Bay number */}
          <section>
            <h3 className="text-xs font-semibold text-[#555] uppercase tracking-widest mb-3">
              Bay Number
            </h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={bayNumber}
                onChange={(e) => setBayNumber(e.target.value)}
                onBlur={handleBaySave}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleBaySave()
                  if (e.key === 'Escape') setBayNumber(order.bay_number || '')
                }}
                placeholder="e.g. B12"
                className="flex-1 bg-[#1c1c1c] border border-white/10 rounded-xl px-4 py-2.5 text-[#f0f0f0] text-sm focus:border-[#9333ea]/50 focus:ring-1 focus:ring-[#9333ea]/20 transition-all"
                disabled={savingBay}
              />
              <button
                onClick={handleBaySave}
                disabled={savingBay || bayNumber === (order.bay_number || '')}
                className="px-4 py-2.5 bg-[#9333ea]/15 text-[#c084fc] border border-[#9333ea]/30 rounded-xl text-sm font-medium hover:bg-[#9333ea]/25 transition-all disabled:opacity-40"
              >
                {savingBay ? '…' : 'Save'}
              </button>
            </div>
          </section>

          {/* Notes */}
          <section>
            <h3 className="text-xs font-semibold text-[#555] uppercase tracking-widest mb-3">
              Order Notes
            </h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={handleNotesSave}
              placeholder="Add notes about this order…"
              rows={3}
              className="w-full bg-[#1c1c1c] border border-white/10 rounded-xl px-4 py-3 text-[#f0f0f0] text-sm resize-none focus:border-[#9333ea]/50 focus:ring-1 focus:ring-[#9333ea]/20 transition-all placeholder-[#555]"
              disabled={savingNotes}
            />
            {savingNotes && (
              <p className="text-[#555] text-xs mt-1">Saving notes…</p>
            )}
          </section>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-5">
          {/* Order items */}
          <section>
            <h3 className="text-xs font-semibold text-[#555] uppercase tracking-widest mb-3">
              Items
            </h3>
            <div className="bg-[#1c1c1c] rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.07]">
                    <th className="text-left text-[#555] font-medium px-4 py-2.5 text-xs">Item</th>
                    <th className="text-center text-[#555] font-medium px-2 py-2.5 text-xs">Qty</th>
                    <th className="text-right text-[#555] font-medium px-4 py-2.5 text-xs">Price</th>
                    <th className="text-right text-[#555] font-medium px-4 py-2.5 text-xs">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => (
                    <tr key={i} className="border-b border-white/[0.04] last:border-0">
                      <td className="text-[#f0f0f0] px-4 py-2.5">{item.name}</td>
                      <td className="text-[#a0a0a0] text-center px-2 py-2.5">{item.quantity}</td>
                      <td className="text-[#a0a0a0] text-right px-4 py-2.5">
                        £{Number(item.price).toFixed(2)}
                      </td>
                      <td className="text-[#f0f0f0] font-medium text-right px-4 py-2.5">
                        £{(Number(item.price) * Number(item.quantity)).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Subtotal / Total */}
              <div className="border-t border-white/[0.07] px-4 py-3 space-y-1">
                <div className="flex justify-between text-sm text-[#a0a0a0]">
                  <span>Subtotal</span>
                  <span>£{Number(order.subtotal || order.total).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-base font-bold text-[#f0f0f0]">
                  <span>Total</span>
                  <span>£{Number(order.total).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </section>

          {/* Payment info */}
          <section>
            <h3 className="text-xs font-semibold text-[#555] uppercase tracking-widest mb-3">
              Payment
            </h3>
            <div className="bg-[#1c1c1c] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#a0a0a0]">Status</span>
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                    order.payment_status === 'paid'
                      ? 'bg-green-500/15 text-green-400 border-green-500/30'
                      : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                  }`}
                >
                  {order.payment_status || 'unknown'}
                </span>
              </div>

              {order.stripe_session_id && (
                <div>
                  <span className="text-xs text-[#a0a0a0] block mb-1">Stripe Session</span>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-[10px] font-mono text-[#555] truncate bg-[#141414] rounded-lg px-2 py-1">
                      {order.stripe_session_id}
                    </code>
                    <button
                      onClick={copyStripeId}
                      className="text-[10px] text-[#9333ea] hover:text-[#c084fc] transition-colors flex-shrink-0"
                    >
                      {copied ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Status actions */}
      {nextStatuses.length > 0 && (
        <div className="mt-6 pt-5 border-t border-white/[0.07]">
          <h3 className="text-xs font-semibold text-[#555] uppercase tracking-widest mb-3">
            Update Status
          </h3>
          <div className="flex flex-wrap gap-2">
            {nextStatuses.map((status) => (
              <button
                key={status}
                onClick={() => handleStatusChange(status)}
                disabled={changingStatus !== null}
                className={`text-sm font-semibold px-4 py-2 rounded-xl border transition-all disabled:opacity-50 ${
                  TRANSITION_STYLES[status] || ''
                }`}
              >
                {changingStatus === status ? 'Updating…' : TRANSITION_LABELS[status] || status}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bottom actions */}
      <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t border-white/[0.07]">
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl border border-white/10 text-[#a0a0a0] hover:text-[#f0f0f0] hover:bg-white/[0.06] transition-all"
        >
          🖨 Print Receipt
        </button>

        {order.order_status === 'completed' && (
          <button
            onClick={() => {
              onClose()
              onRefund(order)
            }}
            className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl border border-[#9333ea]/30 text-[#c084fc] hover:bg-[#9333ea]/15 transition-all"
          >
            ↩ Process Refund
          </button>
        )}
      </div>
    </Modal>
  )
}

function InfoRow({ icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-base leading-none mt-0.5">{icon}</span>
      <div className="flex-1 flex items-start justify-between gap-2">
        <span className="text-xs text-[#555] flex-shrink-0 mt-0.5">{label}</span>
        <span className="text-sm text-[#f0f0f0] text-right">{value}</span>
      </div>
    </div>
  )
}
