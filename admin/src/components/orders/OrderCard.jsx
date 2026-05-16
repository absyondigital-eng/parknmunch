import { useState } from 'react'
import { formatDistanceToNow, format } from 'date-fns'
import { StatusBadge } from '../ui/Badge'
import { useToast } from '../../context/ToastContext'

const STATUS_TRANSITIONS = {
  new: ['completed'],
  completed: [],
  refunded: [],
}

const TRANSITION_LABELS = {
  completed: { label: 'Mark Completed', color: 'green' },
}

const STATUS_BORDER_COLOR = {
  new: 'border-l-red-500',
  preparing: 'border-l-amber-500',
  ready: 'border-l-blue-500',
  completed: 'border-l-green-500',
  refunded: 'border-l-[#9333ea]',
}

const BTN_COLORS = {
  amber: 'bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 border-amber-500/30',
  blue: 'bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 border-blue-500/30',
  green: 'bg-green-500/15 text-green-400 hover:bg-green-500/25 border-green-500/30',
  red: 'bg-red-500/15 text-red-400 hover:bg-red-500/25 border-red-500/30',
}

export function OrderCard({ order, onViewDetails, onStatusChange, onRefund }) {
  const [editingBay, setEditingBay] = useState(false)
  const [bayValue, setBayValue] = useState(order.bay_number || '')
  const [savingBay, setSavingBay] = useState(false)
  const [changingStatus, setChangingStatus] = useState(null)
  const { toast } = useToast()

  const isNew = order.order_status === 'new'
  const borderColor = STATUS_BORDER_COLOR[order.order_status] || 'border-l-[#555]'
  const nextStatuses = STATUS_TRANSITIONS[order.order_status] || []

  const createdAt = new Date(order.created_at)
  const timeLabel = formatDistanceToNow(createdAt, { addSuffix: true })
  const clockTime = format(createdAt, 'HH:mm')

  const items = Array.isArray(order.order_items) ? order.order_items : []
  const displayItems = items.slice(0, 2)
  const extraCount = items.length - 2

  async function handleStatusChange(newStatus) {
    setChangingStatus(newStatus)
    const result = await onStatusChange(order.id, newStatus)
    setChangingStatus(null)
    if (!result?.success) {
      toast.error('Failed to update order status. Please try again.')
    }
  }

  async function saveBay() {
    if (bayValue === (order.bay_number || '')) {
      setEditingBay(false)
      return
    }
    setSavingBay(true)
    const result = await onStatusChange(order.id, null, bayValue)
    if (result?.bayResult) {
      toast.success('Bay number updated')
    }
    setSavingBay(false)
    setEditingBay(false)
  }

  function handlePrint() {
    const printArea = document.getElementById(`receipt-${order.id}`)
    if (printArea) {
      printArea.classList.add('print-receipt')
      window.print()
      setTimeout(() => printArea.classList.remove('print-receipt'), 500)
    } else {
      window.print()
    }
  }

  return (
    <div
      className={`relative bg-[#141414] border border-white/[0.07] rounded-2xl overflow-hidden border-l-4 ${borderColor} transition-all hover:border-white/[0.12] ${
        isNew ? 'animate-pulseRedGlow' : ''
      }`}
    >
      {/* Hidden print receipt */}
      <div id={`receipt-${order.id}`} className="hidden">
        <div style={{ fontFamily: 'monospace', padding: '20px', color: '#000' }}>
          <h2>Park N Munch</h2>
          <p>Order #{String(order.id).slice(-6).toUpperCase()}</p>
          <p>Time: {format(createdAt, 'dd/MM/yyyy HH:mm')}</p>
          <p>Customer: {order.customer_name}</p>
          <p>Phone: {order.customer_phone}</p>
          <p>Car Reg: {order.car_registration}</p>
          {order.bay_number && <p>Bay: {order.bay_number}</p>}
          <hr />
          {items.map((item, i) => (
            <p key={i}>{item.quantity}x {item.name} — £{(item.price * item.quantity).toFixed(2)}</p>
          ))}
          <hr />
          <p>Total: £{Number(order.total).toFixed(2)}</p>
          {order.notes && <p>Notes: {order.notes}</p>}
        </div>
      </div>

      <div className="p-4 sm:p-5">
        {/* Top row */}
        <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm font-bold text-[#f0f0f0]">
              #{String(order.id).slice(-6).toUpperCase()}
            </span>
            <span className="text-[#555] text-xs">·</span>
            <span className="text-[#a0a0a0] text-xs" title={format(createdAt, 'PPpp')}>
              {clockTime} · {timeLabel}
            </span>
          </div>
          <StatusBadge status={order.order_status} />
        </div>

        {/* Customer info */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3">
          <span className="text-sm text-[#f0f0f0]">
            <span className="mr-1">👤</span>
            {order.customer_name || 'Unknown'}
          </span>
          {order.customer_phone && (
            <span className="text-sm text-[#a0a0a0]">
              <span className="mr-1">📞</span>
              {order.customer_phone}
            </span>
          )}
          {order.car_registration && (
            <span className="text-sm text-[#a0a0a0]">
              <span className="mr-1">🚗</span>
              <span className="font-mono text-xs bg-[#1c1c1c] border border-white/10 px-1.5 py-0.5 rounded">
                {order.car_registration}
              </span>
            </span>
          )}
        </div>

        {/* Bay number */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs text-[#555]">Bay:</span>
          {editingBay ? (
            <input
              type="text"
              value={bayValue}
              onChange={(e) => setBayValue(e.target.value)}
              onBlur={saveBay}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveBay()
                if (e.key === 'Escape') {
                  setBayValue(order.bay_number || '')
                  setEditingBay(false)
                }
              }}
              className="bg-[#1c1c1c] border border-[#9333ea]/50 rounded-lg px-2 py-1 text-sm text-[#f0f0f0] w-24 focus:ring-1 focus:ring-[#9333ea]/30"
              autoFocus
              disabled={savingBay}
              placeholder="e.g. B12"
            />
          ) : (
            <button
              onClick={() => setEditingBay(true)}
              className="text-sm text-[#a0a0a0] hover:text-[#9333ea] transition-colors px-2 py-0.5 rounded-lg hover:bg-[#9333ea]/10 border border-transparent hover:border-[#9333ea]/20"
            >
              {order.bay_number || '— tap to set'}
            </button>
          )}
        </div>

        {/* Order items */}
        <div className="mb-3">
          <div className="space-y-0.5">
            {displayItems.map((item, i) => (
              <div key={i} className="flex justify-between text-xs">
                <span className="text-[#a0a0a0]">
                  <span className="text-[#f0f0f0] font-medium">{item.quantity}×</span> {item.name}
                </span>
                <span className="text-[#a0a0a0]">£{(Number(item.price) * Number(item.quantity)).toFixed(2)}</span>
              </div>
            ))}
            {extraCount > 0 && (
              <p className="text-xs text-[#555]">+{extraCount} more item{extraCount > 1 ? 's' : ''}</p>
            )}
          </div>
          <div className="flex justify-between items-center mt-2 pt-2 border-t border-white/[0.06]">
            <span className="text-xs text-[#555]">Total</span>
            <span className="text-base font-bold text-[#f0f0f0]">£{Number(order.total).toFixed(2)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-white/[0.06]">
          {/* Status transitions */}
          {nextStatuses.map((status) => {
            const cfg = TRANSITION_LABELS[status]
            const colorClass = BTN_COLORS[cfg?.color] || BTN_COLORS.red
            return (
              <button
                key={status}
                onClick={() => handleStatusChange(status)}
                disabled={changingStatus !== null}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all disabled:opacity-50 ${colorClass}`}
              >
                {changingStatus === status ? '…' : cfg?.label || status}
              </button>
            )
          })}

          {/* Details */}
          <button
            onClick={() => onViewDetails(order)}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-white/10 text-[#a0a0a0] hover:text-[#f0f0f0] hover:bg-white/[0.06] transition-all ml-auto"
          >
            Details
          </button>

          {/* Print */}
          <button
            onClick={handlePrint}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-white/10 text-[#a0a0a0] hover:text-[#f0f0f0] hover:bg-white/[0.06] transition-all"
          >
            🖨 Print
          </button>

          {/* Refund */}
          {order.order_status === 'completed' && (
            <button
              onClick={() => onRefund(order)}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#9333ea]/30 text-[#c084fc] hover:bg-[#9333ea]/15 transition-all"
            >
              Refund
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
