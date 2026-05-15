import { useState, useMemo } from 'react'
import { useProducts } from '../../hooks/useProducts'
import { useToast } from '../../context/ToastContext'
import { Badge } from '../ui/Badge'
import { ProductEditModal } from './ProductEditModal'
import { resolveImageUrl } from '../../lib/imageUrl'

const CATEGORY_CONFIG = {
  burgers:       { emoji: '🍔', label: 'Burgers' },
  wraps:         { emoji: '🌯', label: 'Wraps' },
  'loaded-fries':{ emoji: '🍟', label: 'Loaded Fries' },
  'box-deals':   { emoji: '📦', label: 'Munchboxes' },
  sides:         { emoji: '🍗', label: 'Sides' },
  cakes:         { emoji: '🍰', label: 'Cakes' },
  milkshakes:    { emoji: '🥤', label: 'Milkshakes' },
  kids:          { emoji: '🧒', label: 'Kids' },
}

function getCatEmoji(cat) {
  return (CATEGORY_CONFIG[(cat || '').toLowerCase()] || {}).emoji || '🍽️'
}

function ProductCard({ product, onEdit, onToggleActive, onTogglePopular }) {
  const isActive  = product.active
  const isPopular = product.popular

  return (
    <div
      className={`bg-[#141414] border border-white/[0.07] rounded-2xl overflow-hidden flex flex-col transition-all hover:border-white/[0.12] ${
        !isActive ? 'opacity-55' : ''
      }`}
    >
      {/* Image */}
      <div className="relative h-36 bg-[#1c1c1c] overflow-hidden flex-shrink-0">
        {product.image_url ? (
          <img
            src={resolveImageUrl(product.image_url)}
            alt={product.name}
            className="w-full h-full object-cover"
            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }}
          />
        ) : null}
        <div className={`${product.image_url ? 'hidden' : 'flex'} absolute inset-0 items-center justify-center text-5xl`}>
          {product.emoji || getCatEmoji(product.category)}
        </div>

        {/* Badges */}
        <div className="absolute top-2 left-2 flex gap-1">
          {!isActive && (
            <span className="text-[10px] font-bold bg-black/70 text-[#a0a0a0] px-2 py-0.5 rounded-full">
              OFF
            </span>
          )}
          {isPopular && (
            <span className="text-[10px] font-bold bg-[#9333ea]/80 text-white px-2 py-0.5 rounded-full">
              🔥 Popular
            </span>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 p-3">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="text-sm font-semibold text-[#f0f0f0] leading-snug">{product.name}</h3>
          <span className="text-sm font-bold text-[#f0f0f0] flex-shrink-0">
            £{Number(product.price).toFixed(2)}
          </span>
        </div>
        {product.category && (
          <Badge color="purple">{getCatEmoji(product.category)} {product.category}</Badge>
        )}
        {product.description && (
          <p className="text-xs text-[#555] line-clamp-2 mt-1.5">{product.description}</p>
        )}
      </div>

      {/* Actions */}
      <div className="px-3 pb-3 space-y-2">
        {/* Active + Popular toggles */}
        <div className="flex items-center gap-3">
          {/* Active toggle */}
          <button
            onClick={() => onToggleActive(product.id, product.active)}
            title={isActive ? 'Deactivate' : 'Activate'}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 flex-shrink-0 ${
              isActive ? 'bg-[#9333ea]' : 'bg-[#333]'
            }`}
            role="switch"
            aria-checked={isActive}
          >
            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200 ${isActive ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
          </button>
          <span className="text-xs text-[#555] flex-1">{isActive ? 'Active' : 'Inactive'}</span>

          {/* Popular toggle */}
          <button
            onClick={() => onTogglePopular(product.id, product.popular)}
            title={isPopular ? 'Remove from Popular' : 'Add to Popular'}
            className={`text-xs px-2 py-0.5 rounded-full border transition-all ${
              isPopular
                ? 'bg-[#9333ea]/20 text-[#c084fc] border-[#9333ea]/40'
                : 'bg-transparent text-[#555] border-[#333] hover:border-[#9333ea]/30 hover:text-[#9333ea]'
            }`}
          >
            🔥
          </button>
        </div>

        {/* Edit button */}
        <button
          onClick={() => onEdit(product)}
          className="w-full px-3 py-1.5 rounded-lg border border-white/10 text-[#a0a0a0] hover:text-[#f0f0f0] hover:bg-white/[0.06] text-xs font-medium transition-all text-center"
        >
          Edit Product
        </button>
      </div>
    </div>
  )
}

export default function MenuPage() {
  const { products, loading, error, toggleActive, togglePopular, refetch } = useProducts()
  const { toast } = useToast()

  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [showInactive, setShowInactive] = useState(true)
  const [editProduct, setEditProduct] = useState(undefined)

  const categories = useMemo(() => {
    return [...new Set(products.map((p) => p.category).filter(Boolean))].sort()
  }, [products])

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (!showInactive && !p.active) return false
      const matchesCat  = categoryFilter === 'all' || p.category === categoryFilter
      const matchesText = !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.category || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.description || '').toLowerCase().includes(search.toLowerCase())
      return matchesCat && matchesText
    })
  }, [products, categoryFilter, search, showInactive])

  const activeCount   = products.filter(p => p.active).length
  const popularCount  = products.filter(p => p.popular).length

  async function handleToggleActive(productId, current) {
    const result = await toggleActive(productId, current)
    if (result.success) {
      toast.success(current ? 'Product hidden from menu' : 'Product now live on menu')
    } else {
      toast.error('Failed to update product')
    }
  }

  async function handleTogglePopular(productId, current) {
    const result = await togglePopular(productId, current)
    if (result.success) {
      toast.success(current ? 'Removed from Popular' : 'Added to Popular 🔥')
    } else {
      toast.error('Failed to update popular status')
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <div className="sticky top-0 lg:top-0 z-10 bg-[#0a0a0a]/90 backdrop-blur-md border-b border-white/[0.07]">
        <div className="px-4 sm:px-6 lg:px-8 pt-5 pb-3">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-xl font-bold text-[#f0f0f0]">Menu</h1>
              <p className="text-[#a0a0a0] text-sm mt-0.5">
                {loading ? 'Loading…' : `${activeCount} active · ${popularCount} popular`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={refetch}
                disabled={loading}
                title="Refresh"
                className="p-2 rounded-xl border border-white/10 text-[#555] hover:text-[#a0a0a0] hover:bg-white/[0.06] transition-all disabled:opacity-40"
              >
                <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <button
                onClick={() => setEditProduct(null)}
                className="flex items-center gap-2 px-4 py-2 bg-[#9333ea] hover:bg-[#7e22ce] text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-purple-900/30"
              >
                <span className="text-lg leading-none">+</span>
                <span className="hidden sm:inline">Add Product</span>
              </button>
            </div>
          </div>

          {/* Search + show-inactive toggle */}
          <div className="flex gap-2 mb-3">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products…"
                className="w-full bg-[#1c1c1c] border border-white/10 rounded-xl pl-9 pr-4 py-2 text-[#f0f0f0] text-sm focus:border-[#9333ea]/50 focus:ring-1 focus:ring-[#9333ea]/20 transition-all placeholder-[#555]"
              />
            </div>
            <button
              onClick={() => setShowInactive(v => !v)}
              className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                showInactive
                  ? 'bg-white/[0.06] border-white/10 text-[#a0a0a0]'
                  : 'bg-[#9333ea]/15 border-[#9333ea]/30 text-[#c084fc]'
              }`}
            >
              {showInactive ? 'Hide inactive' : 'Show all'}
            </button>
          </div>

          {/* Category filters */}
          <div className="flex gap-1 overflow-x-auto no-scrollbar pb-1">
            <button
              onClick={() => setCategoryFilter('all')}
              className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
                categoryFilter === 'all'
                  ? 'bg-[#9333ea]/20 text-[#c084fc] border border-[#9333ea]/30'
                  : 'text-[#a0a0a0] hover:text-[#f0f0f0] hover:bg-white/[0.06]'
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
                  categoryFilter === cat
                    ? 'bg-[#9333ea]/20 text-[#c084fc] border border-[#9333ea]/30'
                    : 'text-[#a0a0a0] hover:text-[#f0f0f0] hover:bg-white/[0.06]'
                }`}
              >
                {getCatEmoji(cat)} {(CATEGORY_CONFIG[cat] || {}).label || cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 sm:px-6 lg:px-8 py-5">
        {error && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <p className="text-red-400">{error}</p>
            <button onClick={refetch} className="px-4 py-2 bg-[#9333ea]/20 text-[#c084fc] border border-[#9333ea]/30 rounded-xl text-sm font-medium hover:bg-[#9333ea]/30 transition-all">
              Try Again
            </button>
          </div>
        )}

        {loading && !error && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="bg-[#141414] border border-white/[0.07] rounded-2xl overflow-hidden animate-pulse">
                <div className="h-36 bg-white/[0.04]" />
                <div className="p-3">
                  <div className="flex justify-between mb-2">
                    <div className="h-4 bg-white/[0.06] rounded w-3/4" />
                    <div className="h-4 bg-white/[0.06] rounded w-10" />
                  </div>
                  <div className="h-3 bg-white/[0.06] rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-20 h-20 rounded-2xl bg-[#141414] border border-white/[0.07] flex items-center justify-center text-4xl">🍽️</div>
            <div className="text-center">
              <p className="text-[#f0f0f0] font-medium mb-1">
                {search || categoryFilter !== 'all' ? 'No products found' : 'No products yet'}
              </p>
              <p className="text-[#555] text-sm">
                {search ? `No match for "${search}"` : 'Add your first product to get started.'}
              </p>
            </div>
            {!search && categoryFilter === 'all' && (
              <button onClick={() => setEditProduct(null)} className="px-4 py-2 bg-[#9333ea]/20 text-[#c084fc] border border-[#9333ea]/30 rounded-xl text-sm font-medium hover:bg-[#9333ea]/30 transition-all">
                Add First Product
              </button>
            )}
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {filtered.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onEdit={setEditProduct}
                onToggleActive={handleToggleActive}
                onTogglePopular={handleTogglePopular}
              />
            ))}
          </div>
        )}
      </div>

      {editProduct !== undefined && (
        <ProductEditModal
          product={editProduct}
          onClose={() => setEditProduct(undefined)}
          onSave={() => { refetch(); setEditProduct(undefined) }}
        />
      )}
    </div>
  )
}
