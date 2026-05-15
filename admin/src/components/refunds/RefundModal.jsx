import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { useToast } from '../../context/ToastContext'
import { supabase } from '../../lib/supabase'
import { Spinner } from '../ui/Spinner'

export function RefundModal({ order, onClose, onSuccess }) {
  const [refundType, setRefundType] = useState('full')
  const [partialAmount, setPartialAmount] = useState('')
  const [reason, setReason] = useState('')
  const [processing, setProcessing] = useState(false)
  const { toast } = useToast()

  const orderTotal = Number(order.total) || 0
  const refundAmount = refundType === 'full' ? orderTotal : Number(partialAmount) || 0

  const isValid =
    reason.trim().length > 0 &&
    refundAmount > 0 &&
    refundAmount <= orderTotal &&
    (refundType === 'full' || partialAmount !== '')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!isValid) return

    setProcessing(true)
    try {
      // Insert refund record
      const { error: refundError } = await supabase.from('refunds').insert({
        order_id: order.id,
        amount: refundAmount,
        reason: reason.trim(),
        stripe_refund_id: null,
      })

      if (refundError) throw refundError

      // Update order status to refunded
      const { error: statusError } = await supabase
        .from('orders')
        .update({ order_status: 'refunded' })
        .eq('id', order.id)

      if (statusError) throw statusError

      toast.success(`Refund of £${refundAmount.toFixed(2)} recorded successfully.`)
      onSuccess()
    } catch (err) {
      console.error('Refund failed:', err)
      toast.error(err.message || 'Failed to process refund. Please try again.')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <Modal isOpen={true} onClose={onClose} title="Process Refund" size="md">
      {/* Order summary */}
      <div className="bg-[#1c1c1c] rounded-xl p-4 mb-5 border border-white/[0.07]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-[#555] uppercase tracking-widest mb-1">Order</p>
            <p className="text-[#f0f0f0] font-semibold font-mono">
              #{String(order.id).slice(-6).toUpperCase()}
            </p>
            <p className="text-[#a0a0a0] text-sm mt-0.5">{order.customer_name}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-[#555] uppercase tracking-widest mb-1">Order Total</p>
            <p className="text-[#f0f0f0] font-bold text-xl">£{orderTotal.toFixed(2)}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Refund type */}
        <div>
          <label className="block text-xs font-semibold text-[#555] uppercase tracking-widest mb-3">
            Refund Type
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setRefundType('full')}
              className={`py-3 rounded-xl text-sm font-semibold border transition-all ${
                refundType === 'full'
                  ? 'bg-[#9333ea]/20 text-[#c084fc] border-[#9333ea]/40'
                  : 'bg-[#1c1c1c] text-[#a0a0a0] border-white/10 hover:border-white/20'
              }`}
            >
              Full Refund
              <p className="text-xs font-normal text-[#555] mt-0.5">£{orderTotal.toFixed(2)}</p>
            </button>
            <button
              type="button"
              onClick={() => setRefundType('partial')}
              className={`py-3 rounded-xl text-sm font-semibold border transition-all ${
                refundType === 'partial'
                  ? 'bg-[#9333ea]/20 text-[#c084fc] border-[#9333ea]/40'
                  : 'bg-[#1c1c1c] text-[#a0a0a0] border-white/10 hover:border-white/20'
              }`}
            >
              Partial Refund
              <p className="text-xs font-normal text-[#555] mt-0.5">Custom amount</p>
            </button>
          </div>
        </div>

        {/* Partial amount */}
        {refundType === 'partial' && (
          <div>
            <label className="block text-xs font-semibold text-[#555] uppercase tracking-widest mb-2">
              Refund Amount (£)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#a0a0a0] font-medium">
                £
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={orderTotal}
                value={partialAmount}
                onChange={(e) => setPartialAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-[#1c1c1c] border border-white/10 rounded-xl pl-8 pr-4 py-3 text-[#f0f0f0] text-sm focus:border-[#9333ea]/50 focus:ring-1 focus:ring-[#9333ea]/20 transition-all"
                required={refundType === 'partial'}
              />
            </div>
            {Number(partialAmount) > orderTotal && (
              <p className="text-red-400 text-xs mt-1">
                Amount cannot exceed order total of £{orderTotal.toFixed(2)}
              </p>
            )}
          </div>
        )}

        {/* Reason */}
        <div>
          <label className="block text-xs font-semibold text-[#555] uppercase tracking-widest mb-2">
            Reason <span className="text-red-400">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Describe the reason for this refund…"
            rows={3}
            className="w-full bg-[#1c1c1c] border border-white/10 rounded-xl px-4 py-3 text-[#f0f0f0] text-sm resize-none focus:border-[#9333ea]/50 focus:ring-1 focus:ring-[#9333ea]/20 transition-all placeholder-[#555]"
            required
          />
        </div>

        {/* Refund summary */}
        {refundAmount > 0 && (
          <div className="bg-[#9333ea]/10 border border-[#9333ea]/20 rounded-xl p-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-[#a0a0a0]">Refund amount</span>
              <span className="text-lg font-bold text-[#c084fc]">£{refundAmount.toFixed(2)}</span>
            </div>
            <p className="text-xs text-[#555] mt-2">
              Note: Stripe refund will be processed via API. This record saves the refund details.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={processing}
            className="flex-1 py-3 rounded-xl border border-white/10 text-[#a0a0a0] hover:text-[#f0f0f0] hover:bg-white/[0.06] text-sm font-medium transition-all disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!isValid || processing}
            className="flex-1 py-3 rounded-xl bg-[#9333ea] hover:bg-[#7e22ce] text-white text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-purple-900/30"
          >
            {processing ? (
              <>
                <Spinner size="sm" />
                Processing…
              </>
            ) : (
              `Process Refund — £${refundAmount.toFixed(2)}`
            )}
          </button>
        </div>
      </form>
    </Modal>
  )
}
