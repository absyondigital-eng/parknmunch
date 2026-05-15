import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useOrders({ onNewOrder } = {}) {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const channelRef = useRef(null)
  const onNewOrderRef = useRef(onNewOrder)

  useEffect(() => {
    onNewOrderRef.current = onNewOrder
  }, [onNewOrder])

  const fetchOrders = useCallback(async () => {
    try {
      setError(null)
      const { data, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500)

      if (fetchError) throw fetchError
      setOrders(data || [])
    } catch (err) {
      console.error('Failed to fetch orders:', err)
      setError(err.message || 'Failed to load orders')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOrders()

    // Set up realtime subscription
    const channel = supabase
      .channel('orders-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          const newOrder = payload.new
          setOrders((prev) => [newOrder, ...prev])
          if (onNewOrderRef.current) {
            onNewOrderRef.current(newOrder)
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        (payload) => {
          const updatedOrder = payload.new
          setOrders((prev) =>
            prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o))
          )
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.error('Realtime channel error')
        }
      })

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [fetchOrders])

  const updateStatus = useCallback(async (orderId, status) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ order_status: status })
        .eq('id', orderId)

      if (error) throw error

      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, order_status: status } : o))
      )
      return { success: true }
    } catch (err) {
      console.error('Failed to update order status:', err)
      return { success: false, error: err.message }
    }
  }, [])

  const updateBayNumber = useCallback(async (orderId, bayNumber) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ bay_number: bayNumber })
        .eq('id', orderId)

      if (error) throw error

      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, bay_number: bayNumber } : o))
      )
      return { success: true }
    } catch (err) {
      console.error('Failed to update bay number:', err)
      return { success: false, error: err.message }
    }
  }, [])

  const updateNotes = useCallback(async (orderId, notes) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ notes })
        .eq('id', orderId)

      if (error) throw error

      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, notes } : o))
      )
      return { success: true }
    } catch (err) {
      console.error('Failed to update notes:', err)
      return { success: false, error: err.message }
    }
  }, [])

  const markPrinted = useCallback(async (orderId) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ printed: true })
        .eq('id', orderId)

      if (error) throw error

      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, printed: true } : o))
      )
      return { success: true }
    } catch (err) {
      console.error('Failed to mark order as printed:', err)
      return { success: false, error: err.message }
    }
  }, [])

  return {
    orders,
    loading,
    error,
    updateStatus,
    updateBayNumber,
    updateNotes,
    markPrinted,
    refetch: fetchOrders,
  }
}
