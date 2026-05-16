import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { useToast } from '../../context/ToastContext'
import { supabase } from '../../lib/supabase'
import { Spinner } from '../ui/Spinner'

const CATEGORY_OPTIONS = [
  { value: 'burgers',      label: '🍔 Burgers' },
  { value: 'wraps',        label: '🌯 Wraps' },
  { value: 'loaded-fries', label: '🍟 Loaded Fries' },
  { value: 'box-deals',    label: '📦 Munchboxes' },
  { value: 'sides',        label: '🍗 Sides' },
  { value: 'cakes',        label: '🍰 Cakes' },
  { value: 'milkshakes',   label: '🥤 Milkshakes' },
  { value: 'kids',         label: '🧒 Kids' },
]

function Toggle({ checked, onChange, label, sub }) {
  return (
    <div className="flex items-center justify-between bg-[#1c1c1c] rounded-xl px-4 py-3 border border-white/[0.07]">
      <div>
        <p className="text-sm text-[#f0f0f0] font-medium">{label}</p>
        {sub && <p className="text-xs text-[#555]">{sub}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${checked ? 'bg-[#9333ea]' : 'bg-[#333]'}`}
        role="switch"
        aria-checked={checked}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-200 ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  )
}

export function ProductEditModal({ product, onClose, onSave }) {
  const isEdit = Boolean(product?.id)
  const { toast } = useToast()

  const mods = product?.modifiers || {}

  const [form, setForm] = useState({
    name:        product?.name        || '',
    category:    product?.category    || '',
    price:       product?.price != null ? String(product.price) : '',
    description: product?.description || '',
    active:      product?.active  !== undefined ? product.active  : true,
    popular:     product?.popular !== undefined ? product.popular : false,
    hasStyle:    Boolean(mods.hasStyle),
  })
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: null }))
  }

  function validate() {
    const errs = {}
    if (!form.name.trim()) errs.name = 'Product name is required'
    if (!form.price || isNaN(Number(form.price)) || Number(form.price) < 0) {
      errs.price = 'A valid price is required'
    }
    return errs
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }

    setSaving(true)
    const payload = {
      name:        form.name.trim(),
      category:    form.category.trim(),
      price:       Number(Number(form.price).toFixed(2)),
      description: form.description.trim(),
      active:      form.active,
      popular:     form.popular,
      modifiers: {
        ...(product?.modifiers || {}),
        hasStyle: form.hasStyle,
      },
    }

    try {
      if (isEdit) {
        const { error } = await supabase.from('products').update(payload).eq('id', product.id)
        if (error) throw error
        toast.success(`"${payload.name}" updated`)
      } else {
        const { error } = await supabase.from('products').insert(payload)
        if (error) throw error
        toast.success(`"${payload.name}" added to menu`)
      }
      onSave()
      onClose()
    } catch (err) {
      toast.error(err.message || 'Failed to save product')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={isEdit ? `Edit: ${product.name}` : 'Add New Product'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Name */}
        <div>
          <label className="block text-xs font-semibold text-[#555] uppercase tracking-widest mb-1.5">
            Product Name <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="e.g. RS5"
            className={`w-full bg-[#1c1c1c] border rounded-xl px-4 py-2.5 text-[#f0f0f0] text-sm focus:ring-1 focus:ring-[#9333ea]/20 transition-all placeholder-[#555] ${errors.name ? 'border-red-500/50' : 'border-white/10 focus:border-[#9333ea]/50'}`}
          />
          {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
        </div>

        {/* Category + Price */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[#555] uppercase tracking-widest mb-1.5">
              Category
            </label>
            <select
              value={form.category}
              onChange={(e) => set('category', e.target.value)}
              className="w-full bg-[#1c1c1c] border border-white/10 rounded-xl px-4 py-2.5 text-[#f0f0f0] text-sm focus:border-[#9333ea]/50 focus:ring-1 focus:ring-[#9333ea]/20 transition-all"
            >
              <option value="">Select…</option>
              {CATEGORY_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#555] uppercase tracking-widest mb-1.5">
              Price (£) <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a0a0a0] text-sm">£</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.price}
                onChange={(e) => set('price', e.target.value)}
                placeholder="0.00"
                className={`w-full bg-[#1c1c1c] border rounded-xl pl-7 pr-3 py-2.5 text-[#f0f0f0] text-sm focus:ring-1 focus:ring-[#9333ea]/20 transition-all ${errors.price ? 'border-red-500/50' : 'border-white/10 focus:border-[#9333ea]/50'}`}
              />
            </div>
            {errors.price && <p className="text-red-400 text-xs mt-1">{errors.price}</p>}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-[#555] uppercase tracking-widest mb-1.5">
            Description
          </label>
          <textarea
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Brief description…"
            rows={2}
            className="w-full bg-[#1c1c1c] border border-white/10 rounded-xl px-4 py-2.5 text-[#f0f0f0] text-sm resize-none focus:border-[#9333ea]/50 focus:ring-1 focus:ring-[#9333ea]/20 transition-all placeholder-[#555]"
          />
        </div>

        {/* Status toggles */}
        <div className="space-y-2">
          <Toggle
            checked={form.active}
            onChange={(v) => set('active', v)}
            label="Active on Menu"
            sub="Customers can see and order this item"
          />
          <Toggle
            checked={form.popular}
            onChange={(v) => set('popular', v)}
            label="🔥 Popular"
            sub="Shows in the Popular tab on the customer website"
          />
        </div>

        {/* Modifier flags */}
        <div>
          <p className="text-xs font-semibold text-[#555] uppercase tracking-widest mb-2">Customisation Flags</p>
          <Toggle
            checked={form.hasStyle}
            onChange={(v) => set('hasStyle', v)}
            label="Normal / Spicy Choice"
            sub="Customer picks Normal or Spicy (e.g. RS3, RS5)"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 py-3 rounded-xl border border-white/10 text-[#a0a0a0] hover:text-[#f0f0f0] hover:bg-white/[0.06] text-sm font-medium transition-all disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-3 rounded-xl bg-[#9333ea] hover:bg-[#7e22ce] text-white text-sm font-semibold transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-purple-900/30"
          >
            {saving ? (
              <><Spinner size="sm" />{isEdit ? 'Saving…' : 'Adding…'}</>
            ) : isEdit ? 'Save Changes' : 'Add Product'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
