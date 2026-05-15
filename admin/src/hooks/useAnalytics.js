import { useCallback, useEffect, useState } from 'react'
import { format, isToday, subDays, startOfDay, endOfDay } from 'date-fns'
import { supabase } from '../lib/supabase'

export function useAnalytics() {
  const [stats, setStats] = useState(null)
  const [revenueByDay, setRevenueByDay] = useState([])
  const [topProducts, setTopProducts] = useState([])
  const [statusBreakdown, setStatusBreakdown] = useState({})
  const [loading, setLoading] = useState(true)

  const compute = useCallback(async () => {
    try {
      setLoading(true)

      // Fetch all orders
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })

      if (ordersError) throw ordersError

      // Fetch all refunds
      const { data: refunds, error: refundsError } = await supabase
        .from('refunds')
        .select('*')

      if (refundsError) throw refundsError

      const allOrders = orders || []
      const allRefunds = refunds || []

      // Today stats
      const todayOrders = allOrders.filter((o) => isToday(new Date(o.created_at)))
      const ordersToday = todayOrders.length
      const revenueToday = todayOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0)

      // Total revenue (non-cancelled, non-refunded)
      const totalRevenue = allOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0)

      // Avg order value
      const avgOrderValue = allOrders.length > 0 ? totalRevenue / allOrders.length : 0

      // Status counts
      const completedOrders = allOrders.filter((o) => o.order_status === 'completed').length

      // Refund total
      const refundTotal = allRefunds.reduce((sum, r) => sum + (Number(r.amount) || 0), 0)

      // Status breakdown
      const breakdown = {}
      allOrders.forEach((o) => {
        const status = o.order_status || 'unknown'
        breakdown[status] = (breakdown[status] || 0) + 1
      })

      // Revenue by day (last 7 days)
      const last7Days = []
      for (let i = 6; i >= 0; i--) {
        const day = subDays(new Date(), i)
        const dayStart = startOfDay(day)
        const dayEnd = endOfDay(day)

        const dayOrders = allOrders.filter((o) => {
          const d = new Date(o.created_at)
          return d >= dayStart && d <= dayEnd
        })

        last7Days.push({
          date: format(day, 'EEE dd'),
          revenue: dayOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0),
          count: dayOrders.length,
        })
      }

      // Top products — parse order_items JSONB
      const productCounts = {}
      allOrders.forEach((order) => {
        let items = order.order_items
        if (typeof items === 'string') {
          try {
            items = JSON.parse(items)
          } catch {
            items = []
          }
        }
        if (!Array.isArray(items)) return

        items.forEach((item) => {
          const name = item.name || 'Unknown'
          if (!productCounts[name]) {
            productCounts[name] = { name, count: 0, revenue: 0 }
          }
          const qty = Number(item.quantity) || 1
          const price = Number(item.price) || 0
          productCounts[name].count += qty
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
  }, [compute])

  return {
    stats,
    revenueByDay,
    topProducts,
    statusBreakdown,
    loading,
    refetch: compute,
  }
}
