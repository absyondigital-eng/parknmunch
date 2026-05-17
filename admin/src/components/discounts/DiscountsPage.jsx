import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../context/ToastContext'

const EMPTY_FORM = { code: '', percentage: '', max_uses: '' }

export default function DiscountsPage() {
  const [codes, setCodes] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(EMPTY_FORM)
  const [creating, setCreating] = useState(false)
  const [togglingId, setTogglingId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const { toast } = useToast()
  const channelRef = useRef(null)

  const fetchCodes = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('discount_codes')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) toast.error('Failed to load discount codes')
    else setCodes(data || [])
    setLoading(false)
  }, [toast])

  useEffect(() => {
    fetchCodes()

    // Realtime: keep uses count and active state in sync automatically
    const channel = supabase
      .channel('discounts-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'discount_codes' }, (payload) => {
        setCodes((prev) => [payload.new, ...prev])
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'discount_codes' }, (payload) => {
        setCodes((prev) => prev.map((c) => (c.id === payload.new.id ? payload.new : c)))
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'discount_codes' }, (payload) => {
        setCodes((prev) => prev.filter((c) => c.id !== payload.old.id))
      })
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [fetchCodes])

  async function handleCreate(e) {
    e.preventDefault()
    const code = form.code.trim().toUpperCase()
    const pct  = parseInt(form.percentage, 10)
    const max  = form.max_uses ? parseInt(form.max_uses, 10) : null

    if (!code || code.length < 2) return toast.error('Code must be at least 2 characters')
    if (isNaN(pct) || pct < 1 || pct > 100) return toast.error('Percentage must be 1–100')
    if (max !== null && (isNaN(max) || max < 1)) return toast.error('Max uses must be a positive number')

    setCreating(true)
    const { error } = await supabase.from('discount_codes').insert({
      code,
      percentage: pct,
      max_uses: max,
    })
    setCreating(false)

    if (error) {
      toast.error(error.code === '23505' ? 'That code already exists' : 'Failed to create code')
    } else {
      toast.success(`Code "${code}" created`)
      setForm(EMPTY_FORM)
      fetchCodes()
    }
  }

  async function toggleActive(dc) {
    setTogglingId(dc.id)
    const { error } = await supabase
      .from('discount_codes')
      .update({ active: !dc.active })
      .eq('id', dc.id)
    setTogglingId(null)
    if (error) toast.error('Failed to update code')
    else {
      toast.success(dc.active ? 'Code deactivated' : 'Code activated')
      setCodes(prev => prev.map(c => c.id === dc.id ? { ...c, active: !c.active } : c))
    }
  }

  async function deleteCode(dc) {
    if (!window.confirm(`Delete discount code "${dc.code}"? This cannot be undone.`)) return
    setDeletingId(dc.id)
    const { error } = await supabase.from('discount_codes').delete().eq('id', dc.id)
    setDeletingId(null)
    if (error) toast.error('Failed to delete code')
    else {
      toast.success(`Code "${dc.code}" deleted`)
      setCodes(prev => prev.filter(c => c.id !== dc.id))
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#f0f0f0]">Discount Codes</h1>
        <p className="text-sm text-[#a0a0a0] mt-1">Create and manage percentage-off codes for customers.</p>
      </div>

      {/* Create form */}
      <form onSubmit={handleCreate} className="bg-[#141414] border border-white/[0.07] rounded-2xl p-5 mb-8">
        <h2 className="text-sm font-semibold text-[#f0f0f0] mb-4">New Discount Code</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div>
            <label className="text-xs text-[#555] uppercase tracking-widest block mb-1.5">Code</label>
            <input
              type="text"
              value={form.code}
              onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
              placeholder="e.g. LAUNCH20"
              maxLength={20}
              className="w-full bg-[#1c1c1c] border border-white/10 rounded-xl px-3 py-2.5 text-[#f0f0f0] text-sm font-mono tracking-wider focus:border-[#9333ea]/50 focus:ring-1 focus:ring-[#9333ea]/20 transition-all placeholder-[#555]"
              required
            />
          </div>
          <div>
            <label className="text-xs text-[#555] uppercase tracking-widest block mb-1.5">% Off</label>
            <input
              type="number"
              value={form.percentage}
              onChange={e => setForm(f => ({ ...f, percentage: e.target.value }))}
              placeholder="e.g. 20"
              min={1}
              max={100}
              className="w-full bg-[#1c1c1c] border border-white/10 rounded-xl px-3 py-2.5 text-[#f0f0f0] text-sm focus:border-[#9333ea]/50 focus:ring-1 focus:ring-[#9333ea]/20 transition-all placeholder-[#555]"
              required
            />
          </div>
          <div>
            <label className="text-xs text-[#555] uppercase tracking-widest block mb-1.5">Max Uses <span className="normal-case text-[#444]">(blank = unlimited)</span></label>
            <input
              type="number"
              value={form.max_uses}
              onChange={e => setForm(f => ({ ...f, max_uses: e.target.value }))}
              placeholder="Unlimited"
              min={1}
              className="w-full bg-[#1c1c1c] border border-white/10 rounded-xl px-3 py-2.5 text-[#f0f0f0] text-sm focus:border-[#9333ea]/50 focus:ring-1 focus:ring-[#9333ea]/20 transition-all placeholder-[#555]"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={creating}
          className="px-5 py-2.5 bg-[#9333ea] text-white rounded-xl text-sm font-bold hover:bg-[#7e22ce] transition-colors disabled:opacity-50"
        >
          {creating ? 'Creating…' : '+ Create Code'}
        </button>
      </form>

      {/* Code list */}
      {loading ? (
        <div className="text-center text-[#555] py-12 text-sm">Loading codes…</div>
      ) : codes.length === 0 ? (
        <div className="text-center text-[#555] py-12 text-sm">No discount codes yet. Create one above.</div>
      ) : (
        <div className="space-y-3">
          {codes.map(dc => (
            <div
              key={dc.id}
              className={`flex items-center gap-4 bg-[#141414] border rounded-2xl px-5 py-4 transition-opacity ${
                dc.active ? 'border-white/[0.07]' : 'border-white/[0.03] opacity-60'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-mono font-bold text-[#f0f0f0] tracking-wider">{dc.code}</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#9333ea]/15 text-[#c084fc] border border-[#9333ea]/25">
                    {dc.percentage}% off
                  </span>
                  {dc.active ? (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/25">Active</span>
                  ) : (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/[0.06] text-[#555] border border-white/[0.06]">Inactive</span>
                  )}
                </div>
                <div className="text-xs text-[#555] mt-1.5">
                  Used {dc.uses} time{dc.uses !== 1 ? 's' : ''}
                  {dc.max_uses != null ? ` of ${dc.max_uses}` : ' (unlimited)'}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => toggleActive(dc)}
                  disabled={togglingId === dc.id}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all disabled:opacity-40 ${
                    dc.active
                      ? 'border-amber-500/30 text-amber-400 hover:bg-amber-500/10'
                      : 'border-green-500/30 text-green-400 hover:bg-green-500/10'
                  }`}
                >
                  {togglingId === dc.id ? '…' : dc.active ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  onClick={() => deleteCode(dc)}
                  disabled={deletingId === dc.id}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-red-500/20 text-red-400/70 hover:bg-red-500/10 hover:text-red-400 transition-all disabled:opacity-40"
                >
                  {deletingId === dc.id ? '…' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
