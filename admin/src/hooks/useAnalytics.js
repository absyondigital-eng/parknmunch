import { useCallback, useEffect, useRef, useState } from 'react'
import { format, isToday, subDays, startOfDay, endOfDay } from 'date-fns'
import { supabase } from '../lib/supabase'

export function useAnalytics() {
  const [stats, setStats] = useState(null)
  const [revenueByDay, setRevenueByDay] = useState([])
  const [topProducts, setTopProducts] = useState([])
  const [statusBreakdown, setStatusBreakdown] = useState({})
  const [loading, setLoading] = useState(true)
  const channelRef = useRef(null)

  const compute = useCallback(async () => {
    try {
      setLoading(true)

      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })

      if (ordersError) throw ordersError

      const { data: refunds, error: refundsError } = await supabase
        .from('refunds')
        .select('*')

      if (refundsError) throw refundsError

      const allOrders = orders || []
      const allRefunds = refunds || []

      // Exclude refunded orders from all revenue calculations
      const revenueOrders = allOrders.filter((o) => o.order_status !== 'refunded')

      // Today stats (refunded orders don't count toward revenue)
      const todayOrders = revenueOrders.filter((o) => isToday(new Date(o.created_at)))
      const ordersToday = todayOrders.length
      const revenueToday = todayOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0)

      // Total revenue (refunded orders removed)
      const totalRevenue = revenueOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0)

      // Avg order value over non-refunded orders
      const avgOrderValue = revenueOrders.length > 0 ? totalRevenue / revenueOrders.length : 0

      // Status counts
      const completedOrders = allOrders.filter((o) => o.order_status === 'completed').length
      const refundedOrders  = allOrders.filter((o) => o.order_status === 'refunded').length

      // Total amount refunded
      const refundTotal = allRefunds.reduce((sum, r) => sum + (Number(r.amount) || 0), 0)

      // Status breakdown for pie chart
      const breakdown = {}
      allOrders.forEach((o) => {
        const status = o.order_status || 'unknown'
        breakdown[status] = (breakdown[status] || 0) + 1
      })

      // Revenue by day (last 7 days, refunded orders excluded)
      const last7Days = []
      for (let i = 6; i >= 0; i--) {
        const day      = subDays(new Date(), i)
        const dayStart = startOfDay(day)
        const dayEnd   = endOfDay(day)

        const dayOrders = revenueOrders.filter((o) => {
          const d = new Date(o.created_at)
          return d >= dayStart && d <= dayEnd
        })

        last7Days.push({
          date:    format(day, 'EEE dd'),
          revenue: dayOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0),
          count:   dayOrders.length,
        })
      }

      // Top products by units sold
      const productCounts = {}
      allOrders.forEach((order) => {
        let items = order.order_items
        if (typeof items === 'string') {
          try { items = JSON.parse(items) } catch { items = [] }
        }
        if (!Array.isArray(items)) return
        items.forEach((item) => {
          const name = item.name || 'Unknown'
          if (!productCounts[name]) productCounts[name] = { name, count: 0, revenue: 0 }
          const qty   = Number(item.quantity) || 1
          const price = Number(item.price) || 0
          productCounts[name].count   += qty
          productCounts[name].revenue += qty * price
        })
      })

      const topProds = Object.values(productCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 8)

      setStats({
        ordersToday,
        revenueToday,
        totalRevenue,
        avgOrderValue,
        completedOrders,
        refundedOrders,
        refundTotal,
        totalOrders: allOrders.length,
      })
      setRevenueByDay(last7Days)
      setTopProducts(topProds)
      setStatusBreakdown(breakdown)
    } catch (err) {
      console.error('Analytics computation failed:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    compute()

    // Auto-refresh whenever orders or refunds change in Supabase
    const channel = supabase
      .channel('analytics-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => compute())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'refunds' }, () => compute())
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [compute])

  return { stats, revenueByDay, topProducts, statusBreakdown, loading, refetch: compute }
}
