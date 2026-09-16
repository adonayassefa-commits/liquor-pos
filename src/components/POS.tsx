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
    <div className="min-h-screen bg-[#1c1815] p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-2">
        <h1 className="text-2xl font-bold text-[#f2ece2] mb-4">Point of Sale</h1>
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Scan barcode or search product..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          className="w-full mb-4 px-3 py-3 rounded bg-[#2c2419] text-[#f2ece2] text-lg outline-none focus:ring-2 focus:ring-[#d4a24e]"
        />

        {search && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {filtered.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  addToCart(p)
                  setSearch('')
                  searchInputRef.current?.focus()
                }}
                className="bg-[#2c2419] hover:bg-[#3a2f22] text-left p-3 rounded border border-[#33291f]"
              >
                <p className="text-[#f2ece2] font-medium">{p.name}</p>
                <p className="text-[#8a8177] text-sm">
                  {p.selling_price.toFixed(2)} · Stock: {p.current_stock}
                </p>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="text-[#8a8177] sm:col-span-2">No matching products</p>
            )}
          </div>
        )}
      </div>

      <div className="bg-[#2c2419] rounded-lg p-4 flex flex-col">
        <h2 className="text-[#f2ece2] font-bold mb-3">Cart</h2>

        <div className="flex-1 overflow-y-auto space-y-2 mb-4">
          {cart.length === 0 && <p className="text-[#8a8177] text-sm">Cart is empty</p>}
          {cart.map((item) => (
            <div key={item.product.id} className="flex items-center justify-between bg-[#3a2f22]/50 p-2 rounded">
              <div>
                <p className="text-[#f2ece2] text-sm font-medium">{item.product.name}</p>
                <p className="text-[#8a8177] text-xs">{item.product.selling_price.toFixed(2)} each</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => updateQuantity(item.product.id, -1)} className="text-[#f2ece2] bg-[#3a2f22] w-6 h-6 rounded">-</button>
                <span className="text-[#f2ece2] w-6 text-center">{item.quantity}</span>
                <button onClick={() => updateQuantity(item.product.id, 1)} className="text-[#f2ece2] bg-[#3a2f22] w-6 h-6 rounded">+</button>
                <button onClick={() => removeFromCart(item.product.id)} className="text-red-400 text-xs ml-1">✕</button>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-[#33291f] pt-3 space-y-2">
          <div className="flex justify-between text-[#f2ece2] font-bold text-lg">
            <span>Total</span>
            <span>{total.toFixed(2)}</span>
          </div>

          <select
            value={selectedPaymentId}
            onChange={(e) => setSelectedPaymentId(e.target.value)}
            className="w-full px-3 py-2 rounded bg-[#3a2f22] text-[#f2ece2]"
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
            className="w-full px-3 py-2 rounded bg-[#3a2f22] text-[#f2ece2]"
          />

          {paid > 0 && (
            <p className={`text-sm ${changeDue < 0 ? 'text-red-400' : 'text-green-400'}`}>
              Change due: {changeDue.toFixed(2)}
            </p>
          )}

          {error && <p className="text-red-400 text-sm">{error}</p>}
          {success && <p className="text-green-400 text-sm">{success}</p>}

          <button
            onClick={handleCheckout}
            disabled={processing || cart.length === 0}
            className="w-full bg-[#d4a24e] hover:bg-[#c69144] text-[#1c1815] font-bold py-3 rounded disabled:opacity-50"
          >
            {processing ? 'Processing...' : 'Complete Sale'}
          </button>
        </div>
      </div>
    </div>
  )
}