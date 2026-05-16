import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export function BusyMode() {
  const [settings, setSettings] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase.from('settings').select('*').eq('id', 'main').single()
      if (data) setSettings(data)
    }
    fetch()

    const channel = supabase
      .channel('settings-busy')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'settings' }, (payload) => {
        setSettings(payload.new)
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  async function update(updates) {
    if (saving) return
    const optimistic = { ...settings, ...updates }
    setSettings(optimistic)
    setSaving(true)
    await supabase.from('settings').update(updates).eq('id', 'main')
    setSaving(false)
  }

  if (!settings) return null

  const { busy_mode, wait_time } = settings

  return (
    <div className="bg-[#141414] border border-white/[0.07] rounded-2xl p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-[#f0f0f0]">Busy Mode</p>
          <p className="text-xs text-[#555]">Show customers an estimated wait time</p>
        </div>
        <button
          onClick={() => update({ busy_mode: !busy_mode })}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${busy_mode ? 'bg-[#9333ea]' : 'bg-[#333]'}`}
          role="switch"
          aria-checked={busy_mode}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-200 ${busy_mode ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>

      <div className={`flex items-center gap-3 transition-opacity ${!busy_mode ? 'opacity-40 pointer-events-none' : ''}`}>
        <span className="text-xs text-[#555] flex-1">
          Wait time shown to customers
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => update({ wait_time: Math.max(5, wait_time - 5) })}
            className="w-7 h-7 rounded-lg bg-[#1c1c1c] border border-white/10 text-[#f0f0f0] flex items-center justify-center hover:bg-white/[0.08] transition-all text-base font-bold leading-none"
          >
            −
          </button>
          <span className="text-sm font-semibold text-[#f0f0f0] w-16 text-center tabular-nums">
            {wait_time} min
          </span>
          <button
            onClick={() => update({ wait_time: Math.min(120, wait_time + 5) })}
            className="w-7 h-7 rounded-lg bg-[#1c1c1c] border border-white/10 text-[#f0f0f0] flex items-center justify-center hover:bg-white/[0.08] transition-all text-base font-bold leading-none"
          >
            +
          </button>
        </div>
      </div>
    </div>
  )
}
