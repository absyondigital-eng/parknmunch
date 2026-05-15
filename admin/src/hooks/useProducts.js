import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

const ADMIN_CATEGORY_ORDER = ['burgers', 'box-deals', 'loaded-fries', 'wraps', 'milkshakes', 'cakes', 'sides', 'kids']

function sortProducts(list) {
  return [...list].sort((a, b) => {
    const ai = ADMIN_CATEGORY_ORDER.indexOf(a.category)
    const bi = ADMIN_CATEGORY_ORDER.indexOf(b.category)
    const catDiff = (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
    if (catDiff !== 0) return catDiff
    const sdiff = (a.sort_order || 0) - (b.sort_order || 0)
    if (sdiff !== 0) return sdiff
    return a.name.localeCompare(b.name)
  })
}

export function useProducts() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const channelRef = useRef(null)

  const fetchProducts = useCallback(async () => {
    try {
      setError(null)
      setLoading(true)
      const { data, error: fetchError } = await supabase
        .from('products')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('name',       { ascending: true })

      if (fetchError) throw fetchError
      setProducts(sortProducts(data || []))
    } catch (err) {
      console.error('Failed to fetch products:', err)
      setError(err.message || 'Failed to load products')
    } finally {
      setLoading(false)
    }
  }, [])

  // Realtime subscription — mirrors useOrders pattern
  useEffect(() => {
    fetchProducts()

    const channel = supabase
      .channel('products-admin')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'products' },
        (payload) => {
          setProducts((prev) => sortProducts([...prev, payload.new]))
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'products' },
        (payload) => {
          setProducts((prev) =>
            prev.map((p) => (p.id === payload.new.id ? payload.new : p))
          )
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'products' },
        (payload) => {
          setProducts((prev) => prev.filter((p) => p.id !== payload.old.id))
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [fetchProducts])

  const toggleActive = useCallback(async (productId, currentActive) => {
    const newActive = !currentActive
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, active: newActive } : p))
    )
    try {
      const { error } = await supabase
        .from('products')
        .update({ active: newActive })
        .eq('id', productId)
      if (error) throw error
      return { success: true }
    } catch (err) {
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, active: currentActive } : p))
      )
      return { success: false, error: err.message }
    }
  }, [])

  const togglePopular = useCallback(async (productId, currentPopular) => {
    const newPopular = !currentPopular
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, popular: newPopular } : p))
    )
    try {
      const { error } = await supabase
        .from('products')
        .update({ popular: newPopular })
        .eq('id', productId)
      if (error) throw error
      return { success: true }
    } catch (err) {
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, popular: currentPopular } : p))
      )
      return { success: false, error: err.message }
    }
  }, [])

  const toggleFeatured = useCallback(async (productId, currentFeatured) => {
    const newFeatured = !currentFeatured
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, featured: newFeatured } : p))
    )
    try {
      const { error } = await supabase
        .from('products')
        .update({ featured: newFeatured })
        .eq('id', productId)
      if (error) throw error
      return { success: true }
    } catch (err) {
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, featured: currentFeatured } : p))
      )
      return { success: false, error: err.message }
    }
  }, [])

  const updateProduct = useCallback(async (productId, updates) => {
    try {
      const { data, error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', productId)
        .select()
        .single()
      if (error) throw error
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, ...data } : p))
      )
      return { success: true, data }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }, [])

  const createProduct = useCallback(async (productData) => {
    try {
      const { data, error } = await supabase
        .from('products')
        .insert(productData)
        .select()
        .single()
      if (error) throw error
      return { success: true, data }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }, [])

  const deleteProduct = useCallback(async (productId) => {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId)
      if (error) throw error
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }, [])

  return {
    products,
    loading,
    error,
    toggleActive,
    togglePopular,
    toggleFeatured,
    updateProduct,
    createProduct,
    deleteProduct,
    refetch: fetchProducts,
  }
}
