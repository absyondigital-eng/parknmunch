import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

const alertAudio = new Audio('/new-order-sound.mp3')
alertAudio.volume = 1.0

function playOrderSound() {
  try {
    alertAudio.currentTime = 0
    alertAudio.play().catch((err) => console.warn('Order sound blocked:', err))
  } catch (err) {
    console.warn('Order notification sound failed:', err)
  }
}

export function useNewOrderAlert() {
  const [newOrderCount, setNewOrderCount] = useState(0)
  const channelRef = useRef(null)
  const mountedRef = useRef(false)

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
