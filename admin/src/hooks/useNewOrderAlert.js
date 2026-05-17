import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

// Singleton AudioContext — reused across calls
let audioCtx = null

function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume()
  }
  return audioCtx
}

function playNote(ctx, freq, startTime, duration) {
  const osc  = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain)
  gain.connect(ctx.destination)

  osc.type = 'sine'
  osc.frequency.setValueAtTime(freq, startTime)

  gain.gain.setValueAtTime(0, startTime)
  gain.gain.linearRampToValueAtTime(0.45, startTime + 0.015)
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration)

  osc.start(startTime)
  osc.stop(startTime + duration)
}

function playOrderSound() {
  try {
    const ctx = getAudioCtx()
    const now = ctx.currentTime
    // Two-tone ascending ding: C5 → E5
    playNote(ctx, 523, now,        0.55)
    playNote(ctx, 659, now + 0.22, 0.55)
  } catch (err) {
    console.warn('Order notification sound failed:', err)
  }
}

export function useNewOrderAlert() {
  const [newOrderCount, setNewOrderCount] = useState(0)
  const channelRef = useRef(null)
  const mountedRef = useRef(false)

  // Unlock AudioContext on first user interaction (browser requirement)
  useEffect(() => {
    function unlock() {
      try { getAudioCtx() } catch {}
      window.removeEventListener('click',    unlock)
      window.removeEventListener('keydown',  unlock)
      window.removeEventListener('touchend', unlock)
    }
    window.addEventListener('click',    unlock, { once: true })
    window.addEventListener('keydown',  unlock, { once: true })
    window.addEventListener('touchend', unlock, { once: true })
    return () => {
      window.removeEventListener('click',    unlock)
      window.removeEventListener('keydown',  unlock)
      window.removeEventListener('touchend', unlock)
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true

    const channel = supabase
      .channel('new-order-alert')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        () => {
          if (!mountedRef.current) return
          playOrderSound()
          setNewOrderCount((n) => n + 1)
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      mountedRef.current = false
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [])

  const clearCount = useCallback(() => setNewOrderCount(0), [])

  return { newOrderCount, clearCount }
}
