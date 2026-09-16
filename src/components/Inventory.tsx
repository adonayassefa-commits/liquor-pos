import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

type Product = {
  id: string
  name: string
  current_stock: number
}

type Movement = {
  id: string
  movement_type: string
  quantity: number
  previous_quantity: number
  new_quantity: number
  reason: string | null
  created_at: string
  products: { name: string } | null
  profiles: { full_name: string | null; email: string } | null
}

const MOVEMENT_TYPES = [
  { value: 'damage', label: 'Damage' },
  { value: 'loss', label: 'Loss' },
  { value: 'correction', label: 'Correction' },
  { value: 'stock_count', label: 'Stock Count Adjustment' },
  { value: 'transfer', label: 'Transfer' },
]

export default function Inventory() {
  const [products, setProducts] = useState<Product[]>([])
  const [movements, setMovements] = useState<Movement[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    loadProducts()
    loadMovements()
  }, [])

  async function loadProducts() {
    const { data } = await supabase
      .from('products')
      .select('id, name, current_stock')
      .eq('is_active', true)
      .order('name')
    setProducts(data ?? [])
  }

  async function loadMovements() {
    setLoading(true)
    const { data } = await supabase
      .from('inventory_movements')
      .select('id, movement_type, quantity, previous_quantity, new_quantity, reason, created_at, products(name), profiles(full_name, email)')
      .order('created_at', { ascending: false })
      .limit(100)
    setMovements((data as any) ?? [])
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[var(--bg-page)] p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-[var(--text-primary)]" style={{ fontFamily: 'Georgia, serif' }}>Inventory Movements</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-gradient-to-br from-[#e8c568] to-[#d4a24e] hover:from-[#dcb95c] hover:to-[#c69144] text-[#5a4a1f] px-4 py-2 rounded-lg font-semibold shadow-sm"
        >
          + Adjust Stock
        </button>
      </div>

      {loading ? (
        <p className="text-[var(--text-muted)]">Loading...</p>
      ) : movements.length === 0 ? (
        <p className="text-[var(--text-muted)]">No movements recorded yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--bg-card)] shadow-sm">
          <table className="w-full text-left text-[var(--text-primary)] text-sm">
            <thead className="bg-[var(--bg-sidebar)] text-[var(--text-secondary)] uppercase">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Change</th>
                <th className="px-4 py-3">Before → After</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">User</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => (
                <tr key={m.id} className="border-t border-[var(--border)] hover:bg-[var(--bg-sidebar)]">
                  <td className="px-4 py-3 text-[var(--text-muted)]">{new Date(m.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3">{m.products?.name ?? '—'}</td>
                  <td className="px-4 py-3 capitalize">{m.movement_type}</td>
                  <td className={`px-4 py-3 font-semibold ${m.quantity < 0 ? 'text-[#8a332e]' : 'text-[#1f7a3d]'}`}>
                    {m.quantity > 0 ? '+' : ''}{m.quantity}
                  </td>
                  <td className="px-4 py-3 text-[var(--text-muted)]">{m.previous_quantity} → {m.new_quantity}</td>
                  <td className="px-4 py-3 text-[var(--text-muted)]">{m.reason ?? '—'}</td>
                  <td className="px-4 py-3 text-[var(--text-muted)]">{m.profiles?.full_name ?? m.profiles?.email ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <AdjustStockForm
          products={products}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false)
            loadProducts()
            loadMovements()
          }}
        />
      )}
    </div>
  )
}

function AdjustStockForm({
  products, onClose, onSaved,
}: { products: Product[]; onClose: () => void; onSaved: () => void }) {
  const [productId, setProductId] = useState('')
  const [movementType, setMovementType] = useState('damage')
  const [expectedQty, setExpectedQty] = useState<number | null>(null)
  const [actualQty, setActualQty] = useState('')
  const [quantityChange, setQuantityChange] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const isStockCount = movementType === 'stock_count'

  function handleProductChange(id: string) {
    setProductId(id)
    const p = products.find((p) => p.id === id)
    setExpectedQty(p ? p.current_stock : null)
  }

  const difference =
    isStockCount && expectedQty !== null && actualQty !== ''
      ? parseInt(actualQty) - expectedQty
      : null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!productId) {
      setError('Select a product')
      return
    }
    if (!reason.trim()) {
      setError('A reason is required for every stock adjustment')
      return
    }

    const change = isStockCount ? difference : parseInt(quantityChange)

    if (change === null || isNaN(change) || change === 0) {
      setError('Enter a valid quantity')
      return
    }

    setSaving(true)

    const { error } = await supabase.rpc('adjust_stock', {
      p_product_id: productId,
      p_quantity_change: change,
      p_movement_type: movementType,
      p_reason: reason,
    })

    if (error) {
      setError(error.message)
      setSaving(false)
    } else {
      onSaved()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <form onSubmit={handleSubmit} className="bg-[var(--bg-card)] p-6 rounded-xl w-full max-w-md space-y-3 shadow-lg">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Adjust Stock</h2>

        <div>
          <label className="block text-sm text-[var(--text-secondary)] mb-1">Product *</label>
          <select
            required value={productId}
            onChange={(e) => handleProductChange(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)]"
          >
            <option value="">— Select —</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name} (current: {p.current_stock})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-[var(--text-secondary)] mb-1">Adjustment Type *</label>
          <select
            value={movementType}
            onChange={(e) => setMovementType(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)]"
          >
            {MOVEMENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {isStockCount ? (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1">Expected</label>
              <input disabled value={expectedQty ?? ''} className="w-full px-3 py-2 rounded-lg bg-[var(--bg-page)] border border-[var(--border)] text-[var(--text-muted)]" />
            </div>
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1">Actual Count *</label>
              <input
                type="number" required
                value={actualQty}
                onChange={(e) => setActualQty(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)]"
              />
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-1">
              Quantity Change (use negative to remove stock, e.g. -3)
            </label>
            <input
              type="number" required
              value={quantityChange}
              onChange={(e) => setQuantityChange(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)]"
            />
          </div>
        )}

        {isStockCount && difference !== null && (
          <p className={`text-sm font-semibold ${difference === 0 ? 'text-[var(--text-muted)]' : difference < 0 ? 'text-[#8a332e]' : 'text-[#1f7a3d]'}`}>
            Difference: {difference > 0 ? '+' : ''}{difference}
          </p>
        )}

        <div>
          <label className="block text-sm text-[var(--text-secondary)] mb-1">Reason *</label>
          <textarea
            required value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)]"
            rows={2}
          />
        </div>

        {error && <p className="text-[#8a332e] text-sm">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-input)]">
            Cancel
          </button>
          <button type="submit" disabled={saving}
            className="px-4 py-2 rounded-lg bg-gradient-to-br from-[#e8c568] to-[#d4a24e] text-[#5a4a1f] font-semibold disabled:opacity-50">
            {saving ? 'Saving...' : 'Confirm Adjustment'}
          </button>
        </div>
      </form>
    </div>
  )
}