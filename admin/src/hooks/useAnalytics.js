import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { format, isSameDay, startOfMonth, endOfMonth, addMonths, eachDayOfInterval } from 'date-fns'
import { supabase } from '../lib/supabase'
import { tradingDate } from '../lib/tradingDay'

function computeStats(orders, refunds) {
  const revenueOrders = orders.filter(o => o.order_status !== 'refunded')
  const totalRevenue  = revenueOrders.reduce((s, o) => s + (Number(o.total) || 0), 0)
  const avgOrderValue = revenueOrders.length > 0 ? totalRevenue / revenueOrders.length : 0

  const completedOrders = orders.filter(o => o.order_status === 'completed').length
  const refundedOrders  = orders.filter(o => o.order_status === 'refunded').length
  const refundTotal     = refunds.reduce((s, r) => s + (Number(r.amount) || 0), 0)

  const statusBreakdown = {}
  orders.forEach(o => {
    const s = o.order_status || 'unknown'
    statusBreakdown[s] = (statusBreakdown[s] || 0) + 1
  })

  const productMap = {}
  orders.forEach(order => {
    let items = order.order_items
    if (typeof items === 'string') { try { items = JSON.parse(items) } catch { items = [] } }
    if (!Array.isArray(items)) return
    items.forEach(item => {
      const name = item.name || 'Unknown'
      if (!productMap[name]) productMap[name] = { name, count: 0 }
      productMap[name].count += Number(item.quantity) || 1
    })
  })
  const topProducts = Object.values(productMap).sort((a, b) => b.count - a.count).slice(0, 8)

  return { totalOrders: orders.length, totalRevenue, avgOrderValue, completedOrders, refundedOrders, refundTotal, statusBreakdown, topProducts }
}

// mode          — 'day' | 'month'
// selectedMonth — first-of-month Date; drives which month is fetched
// selectedDay   — Date (trading day); used when mode === 'day'
//
// Trading day: sessions run 4pm–close (1am/2am next calendar day).
// We subtract 16 hours from every timestamp to get its trading date so that
// e.g. Wednesday 00:30 counts as Tuesday's sales, not Wednesday's.
export function useAnalytics({ mode, selectedMonth, selectedDay }) {
  const [monthOrders,  setMonthOrders]  = useState([])
  const [monthRefunds, setMonthRefunds] = useState([])
  const [loading,      setLoading]      = useState(true)
  const channelRef = useRef(null)

  // Calendar month boundaries — used for day iteration and channel naming
  const calMonthStart = useMemo(() => startOfMonth(selectedMonth), [selectedMonth])
  const calMonthEnd   = useMemo(() => endOfMonth(selectedMonth),   [selectedMonth])

  // Supabase fetch bounds shifted for the 4pm business day:
  //   "June trading month" = timestamps from June 1 16:00 to July 1 15:59:59
  //   (because June 1 session starts at 16:00 and June 30 session ends ~July 1 02:00)
  const fetchStart = useMemo(() => {
    const d = startOfMonth(selectedMonth)
    return new Date(d.getFullYear(), d.getMonth(), 1, 16, 0, 0, 0)
  }, [selectedMonth])

  const fetchEnd = useMemo(() => {
    const d = startOfMonth(addMonths(selectedMonth, 1))
    return new Date(d.getFullYear(), d.getMonth(), 1, 15, 59, 59, 999)
  }, [selectedMonth])

  const fetchMonth = useCallback(async () => {
    setLoading(true)
    try {
      const [{ data: orders, error: oErr }, { data: refunds, error: rErr }] = await Promise.all([
        supabase.from('orders')
          .select('*')
          .gte('created_at', fetchStart.toISOString())
          .lte('created_at', fetchEnd.toISOString())
          .order('created_at', { ascending: false }),
        supabase.from('refunds')
          .select('*')
          .gte('created_at', fetchStart.toISOString())
          .lte('created_at', fetchEnd.toISOString()),
      ])
      if (oErr) throw oErr
      if (rErr) throw rErr
      setMonthOrders(orders   || [])
      setMonthRefunds(refunds || [])
    } catch (err) {
      console.error('Analytics fetch failed:', err)
    } finally {
      setLoading(false)
    }
  }, [fetchStart, fetchEnd])

  useEffect(() => {
    fetchMonth()

    const channelName = 'analytics-' + format(calMonthStart, 'yyyy-MM')
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders'  }, fetchMonth)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'refunds' }, fetchMonth)
      .subscribe()

    channelRef.current = channel
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [fetchMonth, calMonthStart])

  // Filter to the selected trading day when in day mode
  const activeOrders = useMemo(() => {
    if (mode === 'day' && selectedDay) {
      return monthOrders.filter(o => isSameDay(tradingDate(o.created_at), selectedDay))
    }
    return monthOrders
  }, [monthOrders, mode, selectedDay])

  const activeRefunds = useMemo(() => {
    if (mode === 'day' && selectedDay) {
      return monthRefunds.filter(r => isSameDay(tradingDate(r.created_at), selectedDay))
    }
    return monthRefunds
  }, [monthRefunds, mode, selectedDay])

  const stats = useMemo(
    () => computeStats(activeOrders, activeRefunds),
    [activeOrders, activeRefunds]
  )

  // Per-trading-day totals across the whole month (for the revenue chart + calendar dots)
  const dailyData = useMemo(() => {
    const days = eachDayOfInterval({ start: calMonthStart, end: calMonthEnd })
    return days.map(day => {
      const dayRevOrders = monthOrders.filter(
        o => isSameDay(tradingDate(o.created_at), day) && o.order_status !== 'refunded'
      )
      const allDayOrders = monthOrders.filter(o => isSameDay(tradingDate(o.created_at), day))
      return {
        date:     format(day, 'd'),
        fullDate: format(day, 'yyyy-MM-dd'),
        revenue:  dayRevOrders.reduce((s, o) => s + (Number(o.total) || 0), 0),
        count:    allDayOrders.length,
      }
    })
  }, [monthOrders, calMonthStart, calMonthEnd])

  // Set of 'yyyy-MM-dd' trading-date strings for days that have at least one order
  const orderDates = useMemo(
    () => new Set(monthOrders.map(o => format(tradingDate(o.created_at), 'yyyy-MM-dd'))),
    [monthOrders]
  )

  return { stats, dailyData, orderDates, loading, refetch: fetchMonth }
}
