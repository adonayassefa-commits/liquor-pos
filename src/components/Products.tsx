import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

type Category = {
  id: string
  name: string
}

type Product = {
  id: string
  sku: string | null
  barcode: string | null
  name: string
  brand: string | null
  category_id: string | null
  size: string | null
  cost_price: number
  selling_price: number
  current_stock: number
  reorder_level: number
  is_active: boolean
}

type Props = {
  canEdit: boolean
}

export default function Products({ canEdit }: Props) {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

  useEffect(() => {
    loadCategories()
    loadProducts()
  }, [])

  async function loadCategories() {
    const { data } = await supabase
      .from('product_categories')
      .select('id, name')
      .order('name')
    setCategories(data ?? [])
  }

  async function loadProducts() {
    setLoading(true)
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('name')

    if (!error) setProducts(data ?? [])
    setLoading(false)
  }

  async function archiveProduct(id: string) {
    if (!confirm('Archive this product? It will be hidden but not deleted.')) return
    const { error } = await supabase
      .from('products')
      .update({ is_active: false })
      .eq('id', id)

    if (error) {
      alert('Failed to archive: ' + error.message)
    } else {
      loadProducts()
    }
  }

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku?.toLowerCase().includes(search.toLowerCase()) ||
    p.barcode?.toLowerCase().includes(search.toLowerCase())
  )

  function categoryName(id: string | null) {
    return categories.find((c) => c.id === id)?.name ?? '—'
  }

  return (
    <div className="min-h-screen bg-[#1c1815] p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#f2ece2]">Products</h1>
        {canEdit && (
          <button
            onClick={() => {
              setEditingProduct(null)
              setShowForm(true)
            }}
            className="bg-[#d4a24e] hover:bg-[#c69144] text-[#1c1815] px-4 py-2 rounded font-semibold"
          >
            + Add Product
          </button>
        )}
      </div>

      <input
        type="text"
        placeholder="Search by name, SKU, or barcode..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full mb-4 px-3 py-2 rounded bg-[#2c2419] text-[#f2ece2] outline-none focus:ring-2 focus:ring-[#d4a24e]"
      />

      {loading ? (
        <p className="text-[#8a8177]">Loading products...</p>
      ) : filtered.length === 0 ? (
        <p className="text-[#8a8177]">No products found.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[#33291f]">
          <table className="w-full text-left text-[#f2ece2]">
            <thead className="bg-[#2c2419] text-[#a89d8f] text-sm uppercase">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Cost</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Stock</th>
                {canEdit && <th className="px-4 py-3">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-t border-[#33291f] hover:bg-[#2c2419]/50">
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-[#8a8177]">{p.sku ?? '—'}</td>
                  <td className="px-4 py-3 text-[#8a8177]">{categoryName(p.category_id)}</td>
                  <td className="px-4 py-3">{canEdit ? p.cost_price.toFixed(2) : '—'}</td>
                  <td className="px-4 py-3">{p.selling_price.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className={p.current_stock <= p.reorder_level ? 'text-red-400 font-semibold' : ''}>
                      {p.current_stock}
                    </span>
                  </td>
                  {canEdit && (
                    <td className="px-4 py-3 space-x-2">
                      <button
                        onClick={() => {
                          setEditingProduct(p)
                          setShowForm(true)
                        }}
                        className="text-[#d4a24e] hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => archiveProduct(p.id)}
                        className="text-red-400 hover:underline"
                      >
                        Archive
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <ProductForm
          categories={categories}
          product={editingProduct}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false)
            loadProducts()
          }}
        />
      )}
    </div>
  )
}

function ProductForm({
  categories,
  product,
  onClose,
  onSaved,
}: {
  categories: Category[]
  product: Product | null
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(product?.name ?? '')
  const [sku, setSku] = useState(product?.sku ?? '')
  const [barcode, setBarcode] = useState(product?.barcode ?? '')
  const [categoryId, setCategoryId] = useState(product?.category_id ?? '')
  const [costPrice, setCostPrice] = useState(product?.cost_price?.toString() ?? '0')
  const [sellingPrice, setSellingPrice] = useState(product?.selling_price?.toString() ?? '0')
  const [currentStock, setCurrentStock] = useState(product?.current_stock?.toString() ?? '0')
  const [reorderLevel, setReorderLevel] = useState(product?.reorder_level?.toString() ?? '5')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const payload = {
      name,
      sku: sku || null,
      barcode: barcode || null,
      category_id: categoryId || null,
      cost_price: parseFloat(costPrice) || 0,
      selling_price: parseFloat(sellingPrice) || 0,
      current_stock: parseInt(currentStock) || 0,
      reorder_level: parseInt(reorderLevel) || 0,
      updated_at: new Date().toISOString(),
    }

    const { error } = product
      ? await supabase.from('products').update(payload).eq('id', product.id)
      : await supabase.from('products').insert(payload)

    if (error) {
      setError(error.message)
      setSaving(false)
    } else {
      onSaved()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <form
        onSubmit={handleSubmit}
        className="bg-[#2c2419] p-6 rounded-lg w-full max-w-md space-y-3"
      >
        <h2 className="text-xl font-bold text-[#f2ece2] mb-2">
          {product ? 'Edit Product' : 'Add Product'}
        </h2>

        <div>
          <label className="block text-sm text-[#a89d8f] mb-1">Name *</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 rounded bg-[#3a2f22] text-[#f2ece2]"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-[#a89d8f] mb-1">SKU</label>
            <input
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              className="w-full px-3 py-2 rounded bg-[#3a2f22] text-[#f2ece2]"
            />
          </div>
          <div>
            <label className="block text-sm text-[#a89d8f] mb-1">Barcode</label>
            <input
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              className="w-full px-3 py-2 rounded bg-[#3a2f22] text-[#f2ece2]"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-[#a89d8f] mb-1">Category</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full px-3 py-2 rounded bg-[#3a2f22] text-[#f2ece2]"
          >
            <option value="">— None —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-[#a89d8f] mb-1">Cost Price</label>
            <input
              type="number" step="0.01"
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value)}
              className="w-full px-3 py-2 rounded bg-[#3a2f22] text-[#f2ece2]"
            />
          </div>
          <div>
            <label className="block text-sm text-[#a89d8f] mb-1">Selling Price *</label>
            <input
              required type="number" step="0.01"
              value={sellingPrice}
              onChange={(e) => setSellingPrice(e.target.value)}
              className="w-full px-3 py-2 rounded bg-[#3a2f22] text-[#f2ece2]"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-[#a89d8f] mb-1">Current Stock</label>
            <input
              type="number"
              value={currentStock}
              onChange={(e) => setCurrentStock(e.target.value)}
              className="w-full px-3 py-2 rounded bg-[#3a2f22] text-[#f2ece2]"
            />
          </div>
          <div>
            <label className="block text-sm text-[#a89d8f] mb-1">Reorder Level</label>
            <input
              type="number"
              value={reorderLevel}
              onChange={(e) => setReorderLevel(e.target.value)}
              className="w-full px-3 py-2 rounded bg-[#3a2f22] text-[#f2ece2]"
            />
          </div>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded text-[#a89d8f] hover:bg-[#3a2f22]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded bg-[#d4a24e] hover:bg-[#c69144] text-[#1c1815] font-semibold disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  )
}