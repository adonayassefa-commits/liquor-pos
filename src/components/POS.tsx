import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'

type Product = {
  id: string
  name: string
  sku: string | null
  barcode: string | null
  selling_price: number
  current_stock: number
}

type PaymentMethod = {
  id: string
  name: string
}

type CartItem = {
  product: Product
  quantity: number
}

export default function POS() {
  const [products, setProducts] = useState<Product[]>([])
  const [favorites, setFavorites] = useState<Product[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedPaymentId, setSelectedPaymentId] = useState('')
  const [amountPaid, setAmountPaid] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadProducts()
    loadFavorites()
    loadPaymentMethods()
    searchInputRef.current?.focus()
  }, [])

  async function loadProducts() {
    const { data } = await supabase
      .from('products')
      .select('id, name, sku, barcode, selling_price, current_stock')
      .eq('is_active', true)
      .order('name')
    setProducts(data ?? [])
  }

  async function loadFavorites() {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: items } = await supabase
      .from('sale_items')
      .select('quantity, product_id, products(id, name, sku, barcode, selling_price, current_stock), sales!inner(created_at)')
      .gte('sales.created_at', thirtyDaysAgo.toISOString())

    const totals: Record<string, { product: Product; qty: number }> = {}
    for (const item of (items as any) ?? []) {
      if (!item.products) continue
      if (!totals[item.product_id]) totals[item.product_id] = { product: item.products, qty: 0 }
      totals[item.product_id].qty += item.quantity
    }

    const top = Object.values(totals)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 8)
      .map((t) => t.product)

    if (top.length > 0) {
      setFavorites(top)
    } else {
      const { data: fallback } = await supabase
        .from('products')
        .select('id, name, sku, barcode, selling_price, current_stock')
        .eq('is_active', true)
        .order('name')
        .limit(8)
      setFavorites(fallback ?? [])
    }
  }

  async function loadPaymentMethods() {
    const { data } = await supabase
      .from('payment_methods')
      .select('id, name')
      .eq('is_active', true)
      .order('name')
    setPaymentMethods(data ?? [])
    if (data && data.length > 0) setSelectedPaymentId(data[0].id)
  }

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      const match = products.find(
        (p) => p.barcode === search.trim() || p.sku === search.trim()
      )
      if (match) {
        addToCart(match)
        setSearch('')
      }
    }
  }

  function addToCart(product: Product) {
    setError('')
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id)
      if (existing) {
        if (existing.quantity + 1 > product.current_stock) {
          setError(`Only ${product.current_stock} in stock for ${product.name}`)
          return prev
        }
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      if (product.current_stock < 1) {
        setError(`${product.name} is out of stock`)
        return prev
      }
      return [...prev, { product, quantity: 1 }]
    })
  }

  function updateQuantity(productId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id !== productId) return item
          const newQty = item.quantity + delta
          if (newQty > item.product.current_stock) {
            setError(`Only ${item.product.current_stock} in stock for ${item.product.name}`)
            return item
          }
          return { ...item, quantity: newQty }
        })
        .filter((item) => item.quantity > 0)
    )
  }

  function removeFromCart(productId: string) {
    setCart((prev) => prev.filter((item) => item.product.id !== productId))
  }

  const subtotal = cart.reduce((sum, item) => sum + item.product.selling_price * item.quantity, 0)
  const total = subtotal
  const paid = parseFloat(amountPaid) || 0
  const changeDue = paid - total

  async function handleCheckout() {
    setError('')
    if (cart.length === 0) {
      setError('Cart is empty')
      return
    }
    if (!selectedPaymentId) {
      setError('Select a payment method')
      return
    }
    if (paid < total) {
      setError('Amount paid is less than total')
      return
    }

    setProcessing(true)

    const items = cart.map((item) => ({
      product_id: item.product.id,
      quantity: item.quantity,
    }))

    const { data, error } = await supabase.rpc('create_sale', {
      p_items: items,
      p_payment_method_id: selectedPaymentId,
      p_amount_paid: paid,
      p_discount: 0,
      p_tax: 0,
    })

    if (error) {
      setError('Sale failed: ' + error.message)
      setProcessing(false)
      return
    }

    setSuccess(`Sale completed! ID: ${data}`)
    setCart([])
    setAmountPaid('')
    loadProducts()
    loadFavorites()
    setProcessing(false)
    searchInputRef.current?.focus()
  }

  const filtered = search
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.sku?.toLowerCase().includes(search.toLowerCase()) ||
          p.barcode?.toLowerCase().includes(search.toLowerCase())
      )
    : []

  return (
    <div className="h-full p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-2 flex flex-col min-h-0">
        <h1 className="text-xl font-semibold text-[var(--text-primary)] mb-4 shrink-0" style={{ fontFamily: 'Georgia, serif' }}>Point of Sale</h1>
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Scan barcode or search product..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          className="w-full mb-4 px-3 py-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] text-lg outline-none focus:ring-2 focus:ring-[#d4a24e] shrink-0"
        />

        <div className="flex-1 overflow-y-auto min-h-0">
          {search ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {filtered.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    addToCart(p)
                    setSearch('')
                    searchInputRef.current?.focus()
                  }}
                  className="bg-[var(--bg-card)] hover:bg-[var(--bg-input)] text-left p-3 rounded-lg border border-[var(--border)] shadow-sm"
                >
                  <p className="text-[var(--text-primary)] font-medium">{p.name}</p>
                  <p className="text-[var(--text-muted)] text-sm">
                    {p.selling_price.toFixed(2)} · Stock: {p.current_stock}
                  </p>
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="text-[var(--text-muted)] sm:col-span-2">No matching products</p>
              )}
            </div>
          ) : (
            <>
              <p className="text-[var(--text-muted)] text-xs uppercase font-semibold mb-2">Quick add</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {favorites.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    disabled={p.current_stock < 1}
                    className="bg-[var(--bg-card)] hover:bg-[var(--bg-input)] text-left p-3 rounded-lg border border-[var(--border)] shadow-sm disabled:opacity-40"
                  >
                    <p className="text-[var(--text-primary)] font-medium text-sm truncate">{p.name}</p>
                    <p className="text-[var(--text-muted)] text-xs">
                      {p.selling_price.toFixed(2)} · {p.current_stock} left
                    </p>
                  </button>
                ))}
                {favorites.length === 0 && (
                  <p className="text-[var(--text-muted)] col-span-full">No products yet</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4 flex flex-col shadow-sm min-h-0">
        <h2 className="text-[var(--text-primary)] font-semibold mb-3 shrink-0">Cart</h2>

        <div className="flex-1 overflow-y-auto space-y-2 mb-4 min-h-0">
          {cart.length === 0 && <p className="text-[var(--text-muted)] text-sm">Cart is empty</p>}
          {cart.map((item) => (
            <div key={item.product.id} className="flex items-center justify-between bg-[var(--bg-input)] p-2 rounded-lg">
              <div>
                <p className="text-[var(--text-primary)] text-sm font-medium">{item.product.name}</p>
                <p className="text-[var(--text-muted)] text-xs">{item.product.selling_price.toFixed(2)} each</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => updateQuantity(item.product.id, -1)} className="text-[var(--text-primary)] bg-[var(--border)] w-6 h-6 rounded">-</button>
                <span className="text-[var(--text-primary)] w-6 text-center">{item.quantity}</span>
                <button onClick={() => updateQuantity(item.product.id, 1)} className="text-[var(--text-primary)] bg-[var(--border)] w-6 h-6 rounded">+</button>
                <button onClick={() => removeFromCart(item.product.id)} className="text-[#8a332e] text-xs ml-1">✕</button>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-[var(--border)] pt-3 space-y-2 shrink-0">
          <div className="flex justify-between text-[var(--text-primary)] font-bold text-lg">
            <span>Total</span>
            <span>{total.toFixed(2)}</span>
          </div>

          <select
            value={selectedPaymentId}
            onChange={(e) => setSelectedPaymentId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)]"
          >
            {paymentMethods.map((pm) => (
              <option key={pm.id} value={pm.id}>{pm.name}</option>
            ))}
          </select>

          <input
            type="number"
            placeholder="Amount received"
            value={amountPaid}
            onChange={(e) => setAmountPaid(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)]"
          />

          {paid > 0 && (
            <p className={`text-sm ${changeDue < 0 ? 'text-[#8a332e]' : 'text-[#1f7a3d]'}`}>
              Change due: {changeDue.toFixed(2)}
            </p>
          )}

          {error && <p className="text-[#8a332e] text-sm">{error}</p>}
          {success && <p className="text-[#1f7a3d] text-sm">{success}</p>}

          <button
            onClick={handleCheckout}
            disabled={processing || cart.length === 0}
            className="w-full bg-gradient-to-br from-[#e8c568] to-[#d4a24e] hover:from-[#dcb95c] hover:to-[#c69144] text-[#5a4a1f] font-bold py-3 rounded-lg disabled:opacity-50"
          >
            {processing ? 'Processing...' : 'Complete Sale'}
          </button>
        </div>
      </div>
    </div>
  )
}