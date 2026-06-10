import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'

export function SiteClosed() {
  const [siteClosed, setSiteClosed] = useState(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [saving, setSaving]   = useState(false)
  const channelName = useRef('settings-site-' + Math.random().toString(36).slice(2)).current

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('settings').select('*').eq('id', 'main').single()
      if (data) setSiteClosed(!!data.site_closed)
    }
    load()

    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'settings' }, (payload) => {
        if (payload.new && payload.new.site_closed != null) {
          setSiteClosed(!!payload.new.site_closed)
        }
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  async function save(closed) {
    setSaving(true)
    setSiteClosed(closed)
    await supabase.from('settings').update({ site_closed: closed }).eq('id', 'main')
    setSaving(false)
  }

  function handleToggle() {
    if (siteClosed === null) return
    if (!siteClosed) {
      setShowConfirm(true)
    } else {
      save(false)
    }
  }

  async function handleConfirmClose() {
    await save(true)
    setShowConfirm(false)
  }

  if (siteClosed === null) return null

  return (
    <>
      <div className={`border rounded-2xl px-4 py-3 mb-1 transition-colors duration-200 ${
        siteClosed
          ? 'bg-red-500/10 border-red-500/30'
          : 'bg-[#141414] border-white/[0.07]'
      }`}>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className={`text-sm font-semibold leading-tight ${siteClosed ? 'text-red-400' : 'text-[#f0f0f0]'}`}>
              {siteClosed ? 'Site Closed' : 'Site Open'}
            </p>
            <p className={`text-xs mt-0.5 ${siteClosed ? 'text-red-500/70' : 'text-[#555]'}`}>
              {siteClosed ? 'Customers cannot order' : 'Orders are accepted'}
            </p>
          </div>
          <button
            onClick={handleToggle}
            disabled={saving}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors duration-200 disabled:opacity-60 ${
              siteClosed ? 'bg-red-500' : 'bg-[#333]'
            }`}
            role="switch"
            aria-checked={siteClosed}
            aria-label="Toggle site open/closed"
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-200 ${
              siteClosed ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>
      </div>

      {showConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setShowConfirm(false) }}
        >
          <div className="bg-[#141414] border border-white/[0.10] rounded-2xl p-6 w-72 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <h3 className="text-[#f0f0f0] font-bold text-base mb-1 text-center">Close the site?</h3>
            <p className="text-xs text-[#555] mb-6 text-center leading-relaxed">
              Customers will see a "Garage is closed" message and won't be able to place orders.
            </p>
            <button
              onClick={handleConfirmClose}
              disabled={saving}
              className="w-full py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-all disabled:opacity-50 mb-2 shadow-lg shadow-red-900/30"
            >
              {saving ? 'Closing…' : 'Close Site'}
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              className="w-full py-2.5 rounded-xl text-[#555] hover:text-[#a0a0a0] text-sm font-medium transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  )
}
