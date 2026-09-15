import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

type Supplier = { id: string; name: string }
type Product = { id: string; name: string; cost_price: number }

type Purchase = {
  id: string
  invoice_number: string | null
  purchase_date: string
  grand_total: number
  status: 'draft' | 'received' | 'cancelled'
  payment_status: string
  suppliers: { name: string } | null
}

type LineItem = {
  product_id: string
  product_name: string
  quantity: number
  unit_cost: number
}

export default function Purchases() {
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [receivingId, setReceivingId] = useState<string | null>(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('purchases')
      .select('id, invoice_number, purchase_date, grand_total, status, payment_status, suppliers(name)')
      .order('created_at', { ascending: false })
    setPurchases((data as any) ?? [])
    setLoading(false)
  }

  async function handleReceive(id: string) {
    if (!confirm('Mark this purchase as received? This will increase inventory for all items.')) return
    setReceivingId(id)
    const { error } = await supabase.rpc('receive_purchase', { p_purchase_id: id })
    if (error) {
      alert('Failed to receive: ' + error.message)
    } else {
      load()
    }
    setReceivingId(null)
  }

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Purchases</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded font-semibold"
        >
          + New Purchase
        </button>
      </div>

      {loading ? (
        <p className="text-slate-400">Loading...</p>
      ) : purchases.length === 0 ? (
        <p className="text-slate-400">No purchases yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-700">
          <table className="w-full text-left text-white">
            <thead className="bg-slate-800 text-slate-300 text-sm uppercase">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3">Invoice #</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((p) => (
                <tr key={p.id} className="border-t border-slate-700 hover:bg-slate-800/50">
                  <td className="px-4 py-3">{p.purchase_date}</td>
                  <td className="px-4 py-3">{p.suppliers?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-400">{p.invoice_number ?? '—'}</td>
                  <td className="px-4 py-3">{p.grand_total.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className={p.status === 'received' ? 'text-green-400' : 'text-yellow-400'}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {p.status === 'draft' && (
                      <button
                        onClick={() => handleReceive(p.id)}
                        disabled={receivingId === p.id}
                        className="text-purple-400 hover:underline disabled:opacity-50"
                      >
                        {receivingId === p.id ? 'Receiving...' : 'Mark Received'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <NewPurchaseForm
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load() }}
        />
      )}
    </div>
  )
}

function NewPurchaseForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [supplierId, setSupplierId] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [items, setItems] = useState<LineItem[]>([])
  const [selectedProductId, setSelectedProductId] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [unitCost, setUnitCost] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.from('suppliers').select('id, name').eq('is_active', true).order('name')
      .then(({ data }) => setSuppliers(data ?? []))
    supabase.from('products').select('id, name, cost_price').eq('is_active', true).order('name')
      .then(({ data }) => setProducts(data ?? []))
  }, [])

  function addLineItem() {
    const product = products.find((p) => p.id === selectedProductId)
    if (!product || !quantity || !unitCost) {
      setError('Select a product, quantity, and unit cost')
      return
    }
    setError('')
    setItems((prev) => [
      ...prev,
      {
        product_id: product.id,
        product_name: product.name,
        quantity: parseInt(quantity),
        unit_cost: parseFloat(unitCost),
      },
    ])
    setSelectedProductId('')
    setQuantity('1')
    setUnitCost('')
  }

  function removeLineItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const total = items.reduce((sum, item) => sum + item.quantity * item.unit_cost, 0)

  async function handleSubmit() {
    if (!supplierId) {
      setError('Select a supplier')
      return
    }
    if (items.length === 0) {
      setError('Add at least one product')
      return
    }
    setSaving(true)
    setError('')

    const { error } = await supabase.rpc('create_purchase', {
      p_supplier_id: supplierId,
      p_invoice_number: invoiceNumber || null,
      p_items: items.map((i) => ({
        product_id: i.product_id,
        quantity: i.quantity,
        unit_cost: i.unit_cost,
      })),
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
      <div className="bg-slate-800 p-6 rounded-lg w-full max-w-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-white">New Purchase</h2>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-slate-300 mb-1">Supplier *</label>
            <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}
              className="w-full px-3 py-2 rounded bg-slate-700 text-white">
              <option value="">— Select —</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">Invoice Number</label>
            <input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)}
              className="w-full px-3 py-2 rounded bg-slate-700 text-white" />
          </div>
        </div>

        <div className="border-t border-slate-700 pt-3">
          <h3 className="text-white font-semibold mb-2">Add Products</h3>
          <div className="grid grid-cols-4 gap-2">
            <select value={selectedProductId} onChange={(e) => {
              setSelectedProductId(e.target.value)
              const p = products.find((p) => p.id === e.target.value)
              if (p) setUnitCost(p.cost_price.toString())
            }} className="col-span-2 px-3 py-2 rounded bg-slate-700 text-white">
              <option value="">— Select product —</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input type="number" placeholder="Qty" value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="px-3 py-2 rounded bg-slate-700 text-white" />
            <input type="number" step="0.01" placeholder="Unit cost" value={unitCost}
              onChange={(e) => setUnitCost(e.target.value)}
              className="px-3 py-2 rounded bg-slate-700 text-white" />
          </div>
          <button onClick={addLineItem} type="button"
            className="mt-2 text-purple-400 text-sm hover:underline">
            + Add to purchase
          </button>
        </div>

        {items.length > 0 && (
          <div className="border-t border-slate-700 pt-3">
            <table className="w-full text-white text-sm">
              <thead className="text-slate-400 text-left">
                <tr><th>Product</th><th>Qty</th><th>Unit Cost</th><th>Total</th><th></th></tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={i} className="border-t border-slate-700">
                    <td className="py-1">{item.product_name}</td>
                    <td>{item.quantity}</td>
                    <td>{item.unit_cost.toFixed(2)}</td>
                    <td>{(item.quantity * item.unit_cost).toFixed(2)}</td>
                    <td>
                      <button onClick={() => removeLineItem(i)} className="text-red-400">✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-white font-bold text-right mt-2">Total: {total.toFixed(2)}</p>
          </div>
        )}

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} type="button" className="px-4 py-2 rounded text-slate-300 hover:bg-slate-700">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="px-4 py-2 rounded bg-purple-600 hover:bg-purple-700 text-white font-semibold disabled:opacity-50">
            {saving ? 'Saving...' : 'Save as Draft'}
          </button>
        </div>
      </div>
    </div>
  )
}