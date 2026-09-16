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
    <div className="min-h-screen bg-[#1c1815] p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#f2ece2]">Inventory Movements</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-[#d4a24e] hover:bg-[#c69144] text-[#1c1815] px-4 py-2 rounded font-semibold"
        >
          + Adjust Stock
        </button>
      </div>

      {loading ? (
        <p className="text-[#8a8177]">Loading...</p>
      ) : movements.length === 0 ? (
        <p className="text-[#8a8177]">No movements recorded yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[#33291f]">
          <table className="w-full text-left text-[#f2ece2] text-sm">
            <thead className="bg-[#2c2419] text-[#a89d8f] uppercase">
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
                <tr key={m.id} className="border-t border-[#33291f] hover:bg-[#2c2419]/50">
                  <td className="px-4 py-3 text-[#8a8177]">{new Date(m.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3">{m.products?.name ?? '—'}</td>
                  <td className="px-4 py-3 capitalize">{m.movement_type}</td>
                  <td className={`px-4 py-3 font-semibold ${m.quantity < 0 ? 'text-red-400' : 'text-green-400'}`}>
                    {m.quantity > 0 ? '+' : ''}{m.quantity}
                  </td>
                  <td className="px-4 py-3 text-[#8a8177]">{m.previous_quantity} → {m.new_quantity}</td>
                  <td className="px-4 py-3 text-[#8a8177]">{m.reason ?? '—'}</td>
                  <td className="px-4 py-3 text-[#8a8177]">{m.profiles?.full_name ?? m.profiles?.email ?? '—'}</td>
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
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <form onSubmit={handleSubmit} className="bg-[#2c2419] p-6 rounded-lg w-full max-w-md space-y-3">
        <h2 className="text-xl font-bold text-[#f2ece2] mb-2">Adjust Stock</h2>

        <div>
          <label className="block text-sm text-[#a89d8f] mb-1">Product *</label>
          <select
            required value={productId}
            onChange={(e) => handleProductChange(e.target.value)}
            className="w-full px-3 py-2 rounded bg-[#3a2f22] text-[#f2ece2]"
          >
            <option value="">— Select —</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name} (current: {p.current_stock})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-[#a89d8f] mb-1">Adjustment Type *</label>
          <select
            value={movementType}
            onChange={(e) => setMovementType(e.target.value)}
            className="w-full px-3 py-2 rounded bg-[#3a2f22] text-[#f2ece2]"
          >
            {MOVEMENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {isStockCount ? (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-[#a89d8f] mb-1">Expected</label>
              <input disabled value={expectedQty ?? ''} className="w-full px-3 py-2 rounded bg-[#3a2f22] text-[#8a8177]" />
            </div>
            <div>
              <label className="block text-sm text-[#a89d8f] mb-1">Actual Count *</label>
              <input
                type="number" required
                value={actualQty}
                onChange={(e) => setActualQty(e.target.value)}
                className="w-full px-3 py-2 rounded bg-[#3a2f22] text-[#f2ece2]"
              />
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-sm text-[#a89d8f] mb-1">
              Quantity Change (use negative to remove stock, e.g. -3)
            </label>
            <input
              type="number" required
              value={quantityChange}
              onChange={(e) => setQuantityChange(e.target.value)}
              className="w-full px-3 py-2 rounded bg-[#3a2f22] text-[#f2ece2]"
            />
          </div>
        )}

        {isStockCount && difference !== null && (
          <p className={`text-sm font-semibold ${difference === 0 ? 'text-[#8a8177]' : difference < 0 ? 'text-red-400' : 'text-green-400'}`}>
            Difference: {difference > 0 ? '+' : ''}{difference}
          </p>
        )}

        <div>
          <label className="block text-sm text-[#a89d8f] mb-1">Reason *</label>
          <textarea
            required value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-3 py-2 rounded bg-[#3a2f22] text-[#f2ece2]"
            rows={2}
          />
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded text-[#a89d8f] hover:bg-[#3a2f22]">
            Cancel
          </button>
          <button type="submit" disabled={saving}
            className="px-4 py-2 rounded bg-[#d4a24e] hover:bg-[#c69144] text-[#1c1815] font-semibold disabled:opacity-50">
            {saving ? 'Saving...' : 'Confirm Adjustment'}
          </button>
        </div>
      </form>
    </div>
  )
}