import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export function BusyMode() {
  const [settings, setSettings] = useState(null)
  const [showPopup, setShowPopup] = useState(false)
  const [pendingTime, setPendingTime] = useState(15)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('settings').select('*').eq('id', 'main').single()
      if (data) setSettings(data)
    }
    load()

    const channel = supabase
      .channel('settings-busy')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'settings' }, (payload) => {
        setSettings(payload.new)
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  async function save(updates) {
    setSaving(true)
    setSettings(prev => ({ ...prev, ...updates }))
    await supabase.from('settings').update(updates).eq('id', 'main')
    setSaving(false)
  }

  function handleToggle() {
    if (!settings) return
    if (settings.busy_mode) {
      save({ busy_mode: false })
    } else {
      setPendingTime(settings.wait_time)
      setShowPopup(true)
    }
  }

  async function handleConfirm() {
    await save({ busy_mode: true, wait_time: pendingTime })
    setShowPopup(false)
  }

  function handleCancel() {
    setShowPopup(false)
  }

  if (!settings) return null

  const { busy_mode, wait_time } = settings

  return (
    <>
      {/* Sidebar toggle row */}
      <div className="bg-[#141414] border border-white/[0.07] rounded-2xl px-4 py-3 mb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#f0f0f0] leading-tight">Busy Mode</p>
            {busy_mode ? (
              <p className="text-xs text-[#9333ea] mt-0.5 tabular-nums">{wait_time} min wait</p>
            ) : (
              <p className="text-xs text-[#555] mt-0.5">Off</p>
            )}
          </div>
          <button
            onClick={handleToggle}
            disabled={saving}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors duration-200 disabled:opacity-60 ${busy_mode ? 'bg-[#9333ea]' : 'bg-[#333]'}`}
            role="switch"
            aria-checked={busy_mode}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-200 ${busy_mode ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
      </div>

      {/* Wait time popup */}
      {showPopup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) handleCancel() }}
        >
          <div className="bg-[#141414] border border-white/[0.10] rounded-2xl p-6 w-72 shadow-2xl">
            <h3 className="text-[#f0f0f0] font-bold text-base mb-1">Set wait time</h3>
            <p className="text-xs text-[#555] mb-6">How long will customers wait for their order?</p>

            <div className="flex items-center justify-center gap-5 mb-6">
              <button
                onClick={() => setPendingTime(t => Math.max(5, t - 5))}
                className="w-10 h-10 rounded-xl bg-[#1c1c1c] border border-white/10 text-[#f0f0f0] flex items-center justify-center hover:bg-white/[0.08] transition-all text-xl font-bold"
              >
                −
              </button>
              <span className="text-3xl font-bold text-[#f0f0f0] tabular-nums w-24 text-center">
                {pendingTime} <span className="text-base font-normal text-[#555]">min</span>
              </span>
              <button
                onClick={() => setPendingTime(t => Math.min(120, t + 5))}
                className="w-10 h-10 rounded-xl bg-[#1c1c1c] border border-white/10 text-[#f0f0f0] flex items-center justify-center hover:bg-white/[0.08] transition-all text-xl font-bold"
              >
                +
              </button>
            </div>

            <button
              onClick={handleConfirm}
              disabled={saving}
              className="w-full py-3 rounded-xl bg-[#9333ea] hover:bg-[#7e22ce] text-white text-sm font-semibold transition-all disabled:opacity-50 mb-2 shadow-lg shadow-purple-900/30"
            >
              {saving ? 'Activating…' : 'Activate Busy Mode'}
            </button>
            <button
              onClick={handleCancel}
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
