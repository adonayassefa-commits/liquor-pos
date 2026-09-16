import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

type Sale = {
  id: string
  receipt_number: string
  total: number
  amount_paid: number
  change_due: number
  status: string
  created_at: string
  profiles: { full_name: string | null; email: string } | null
}

type SaleItem = {
  id: string
  quantity: number
  unit_price: number
  unit_cost_at_sale: number
  line_total: number
  product_id: string
  products: { name: string } | null
}

export default function Sales() {
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
  const [saleItems, setSaleItems] = useState<SaleItem[]>([])
  const [showReturnForm, setShowReturnForm] = useState(false)

  useEffect(() => {
    loadSales()
  }, [])

  async function loadSales() {
    setLoading(true)
    const { data } = await supabase
      .from('sales')
      .select('id, receipt_number, total, amount_paid, change_due, status, created_at, profiles(full_name, email)')
      .order('created_at', { ascending: false })
      .limit(100)
    setSales((data as any) ?? [])
    setLoading(false)
  }

  async function viewSale(sale: Sale) {
    setSelectedSale(sale)
    setShowReturnForm(false)
    const { data } = await supabase
      .from('sale_items')
      .select('id, quantity, unit_price, unit_cost_at_sale, line_total, product_id, products(name)')
      .eq('sale_id', sale.id)
    setSaleItems((data as any) ?? [])
  }

  const filtered = sales.filter(
    (s) =>
      s.receipt_number.toLowerCase().includes(search.toLowerCase()) ||
      s.profiles?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.profiles?.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-[#fdfcfa] p-6">
      <h1 className="text-xl font-semibold text-[#1a1611] mb-6" style={{ fontFamily: 'Georgia, serif' }}>Sales History</h1>

      <input
        type="text"
        placeholder="Search by receipt number or cashier..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full mb-4 px-3 py-2 rounded-lg bg-white border border-[#ece6da] text-[#1a1611] outline-none focus:ring-2 focus:ring-[#d4a24e]"
      />

      {loading ? (
        <p className="text-[#6b6156]">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="text-[#6b6156]">No sales found.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#ece6da] bg-white shadow-sm">
          <table className="w-full text-left text-[#1a1611]">
            <thead className="bg-[#faf8f4] text-[#5c5448] text-sm uppercase">
              <tr>
                <th className="px-4 py-3">Receipt #</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Cashier</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-t border-[#ece6da] hover:bg-[#faf8f4]">
                  <td className="px-4 py-3 font-mono text-sm">{s.receipt_number}</td>
                  <td className="px-4 py-3 text-[#6b6156] text-sm">
                    {new Date(s.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">{s.profiles?.full_name ?? s.profiles?.email ?? '—'}</td>
                  <td className="px-4 py-3">{s.total.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        s.status === 'completed'
                          ? 'text-[#1f7a3d]'
                          : s.status === 'returned'
                          ? 'text-[#8a332e]'
                          : 'text-[#8a611a]'
                      }
                    >
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => viewSale(s)} className="text-[#a17a1f] hover:underline text-sm">
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedSale && !showReturnForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-lg shadow-lg">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-lg font-semibold text-[#1a1611]">{selectedSale.receipt_number}</h2>
                <p className="text-[#6b6156] text-sm">
                  {new Date(selectedSale.created_at).toLocaleString()} ·{' '}
                  {selectedSale.profiles?.full_name ?? selectedSale.profiles?.email}
                </p>
              </div>
              <button onClick={() => setSelectedSale(null)} className="text-[#6b6156] hover:text-[#1a1611] text-xl">
                ✕
              </button>
            </div>

            <table className="w-full text-[#1a1611] text-sm mb-4">
              <thead className="text-[#6b6156] text-left">
                <tr>
                  <th className="pb-2">Product</th>
                  <th className="pb-2">Qty</th>
                  <th className="pb-2">Price</th>
                  <th className="pb-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {saleItems.map((item) => (
                  <tr key={item.id} className="border-t border-[#ece6da]">
                    <td className="py-2">{item.products?.name}</td>
                    <td className="py-2">{item.quantity}</td>
                    <td className="py-2">{item.unit_price.toFixed(2)}</td>
                    <td className="py-2">{item.line_total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="border-t border-[#ece6da] pt-3 space-y-1 text-right mb-4">
              <p className="text-[#1a1611] font-bold text-lg">Total: {selectedSale.total.toFixed(2)}</p>
              <p className="text-[#6b6156] text-sm">Paid: {selectedSale.amount_paid.toFixed(2)}</p>
              <p className="text-[#6b6156] text-sm">Change: {selectedSale.change_due.toFixed(2)}</p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 bg-gradient-to-br from-[#e8c568] to-[#d4a24e] text-[#5a4a1f] py-2 rounded-lg font-semibold"
              >
                Print Receipt
              </button>
              {selectedSale.status === 'completed' && (
                <button
                  onClick={() => setShowReturnForm(true)}
                  className="flex-1 bg-[#a3413a] hover:bg-[#8a332e] text-white py-2 rounded-lg font-semibold"
                >
                  Process Return
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedSale && showReturnForm && (
        <ReturnForm
          sale={selectedSale}
          saleItems={saleItems}
          onClose={() => setShowReturnForm(false)}
          onDone={() => {
            setShowReturnForm(false)
            setSelectedSale(null)
            loadSales()
          }}
        />
      )}
    </div>
  )
}

function ReturnForm({
  sale, saleItems, onClose, onDone,
}: { sale: Sale; saleItems: SaleItem[]; onClose: () => void; onDone: () => void }) {
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function setQty(saleItemId: string, qty: number, max: number) {
    const clamped = Math.max(0, Math.min(qty, max))
    setQuantities((prev) => ({ ...prev, [saleItemId]: clamped }))
  }

  const itemsToReturn = saleItems
    .filter((item) => (quantities[item.id] ?? 0) > 0)
    .map((item) => {
      const qty = quantities[item.id]
      return {
        sale_item_id: item.id,
        product_id: item.product_id,
        quantity: qty,
        refund_amount: qty * item.unit_price,
      }
    })

  const totalRefund = itemsToReturn.reduce((sum, i) => sum + i.refund_amount, 0)

  async function handleSubmit() {
    setError('')
    if (itemsToReturn.length === 0) {
      setError('Select at least one item to return')
      return
    }
    if (!reason.trim()) {
      setError('A reason is required')
      return
    }

    setSaving(true)
    const { error } = await supabase.rpc('process_return', {
      p_sale_id: sale.id,
      p_items: itemsToReturn,
      p_reason: reason,
    })

    if (error) {
      setError(error.message)
      setSaving(false)
    } else {
      onDone()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white p-6 rounded-xl w-full max-w-lg space-y-3 shadow-lg">
        <h2 className="text-lg font-semibold text-[#1a1611]">Process Return — {sale.receipt_number}</h2>

        <table className="w-full text-[#1a1611] text-sm">
          <thead className="text-[#6b6156] text-left">
            <tr>
              <th className="pb-2">Product</th>
              <th className="pb-2">Purchased</th>
              <th className="pb-2">Return Qty</th>
            </tr>
          </thead>
          <tbody>
            {saleItems.map((item) => (
              <tr key={item.id} className="border-t border-[#ece6da]">
                <td className="py-2">{item.products?.name}</td>
                <td className="py-2">{item.quantity}</td>
                <td className="py-2">
                  <input
                    type="number"
                    min={0}
                    max={item.quantity}
                    value={quantities[item.id] ?? 0}
                    onChange={(e) => setQty(item.id, parseInt(e.target.value) || 0, item.quantity)}
                    className="w-16 px-2 py-1 rounded-lg bg-[#faf8f4] border border-[#ece6da] text-[#1a1611]"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div>
          <label className="block text-sm text-[#5c5448] mb-1">Reason *</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 rounded-lg bg-[#faf8f4] border border-[#ece6da] text-[#1a1611]"
          />
        </div>

        <p className="text-[#1a1611] font-bold text-right">Refund Total: {totalRefund.toFixed(2)}</p>

        {error && <p className="text-[#8a332e] text-sm">{error}</p>}

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-[#6b6156] hover:bg-[#faf8f4]">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-[#a3413a] hover:bg-[#8a332e] text-white font-semibold disabled:opacity-50"
          >
            {saving ? 'Processing...' : 'Confirm Return'}
          </button>
        </div>
      </div>
    </div>
  )
}