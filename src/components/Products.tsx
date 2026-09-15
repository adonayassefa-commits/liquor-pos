import { useEffect, useState } from 'react'
import Papa from 'papaparse'
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
  const [showImport, setShowImport] = useState(false)
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
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Products</h1>
        {canEdit && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowImport(true)}
              className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded font-semibold"
            >
              Import CSV
            </button>
            <button
              onClick={() => {
                setEditingProduct(null)
                setShowForm(true)
              }}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded font-semibold"
            >
              + Add Product
            </button>
          </div>
        )}
      </div>

      <input
        type="text"
        placeholder="Search by name, SKU, or barcode..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full mb-4 px-3 py-2 rounded bg-slate-800 text-white outline-none focus:ring-2 focus:ring-purple-500"
      />

      {loading ? (
        <p className="text-slate-400">Loading products...</p>
      ) : filtered.length === 0 ? (
        <p className="text-slate-400">No products found.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-700">
          <table className="w-full text-left text-white">
            <thead className="bg-slate-800 text-slate-300 text-sm uppercase">
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
                <tr key={p.id} className="border-t border-slate-700 hover:bg-slate-800/50">
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-slate-400">{p.sku ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-400">{categoryName(p.category_id)}</td>
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
                        className="text-purple-400 hover:underline"
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

      {showImport && (
        <ImportCSV
          categories={categories}
          onClose={() => setShowImport(false)}
          onImported={() => {
            setShowImport(false)
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
        className="bg-slate-800 p-6 rounded-lg w-full max-w-md space-y-3"
      >
        <h2 className="text-xl font-bold text-white mb-2">
          {product ? 'Edit Product' : 'Add Product'}
        </h2>

        <div>
          <label className="block text-sm text-slate-300 mb-1">Name *</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 rounded bg-slate-700 text-white"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-slate-300 mb-1">SKU</label>
            <input
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              className="w-full px-3 py-2 rounded bg-slate-700 text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">Barcode</label>
            <input
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              className="w-full px-3 py-2 rounded bg-slate-700 text-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-slate-300 mb-1">Category</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full px-3 py-2 rounded bg-slate-700 text-white"
          >
            <option value="">— None —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-slate-300 mb-1">Cost Price</label>
            <input
              type="number" step="0.01"
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value)}
              className="w-full px-3 py-2 rounded bg-slate-700 text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">Selling Price *</label>
            <input
              required type="number" step="0.01"
              value={sellingPrice}
              onChange={(e) => setSellingPrice(e.target.value)}
              className="w-full px-3 py-2 rounded bg-slate-700 text-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-slate-300 mb-1">Current Stock</label>
            <input
              type="number"
              value={currentStock}
              onChange={(e) => setCurrentStock(e.target.value)}
              className="w-full px-3 py-2 rounded bg-slate-700 text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">Reorder Level</label>
            <input
              type="number"
              value={reorderLevel}
              onChange={(e) => setReorderLevel(e.target.value)}
              className="w-full px-3 py-2 rounded bg-slate-700 text-white"
            />
          </div>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded text-slate-300 hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded bg-purple-600 hover:bg-purple-700 text-white font-semibold disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  )
}

function ImportCSV({
  categories, onClose, onImported,
}: { categories: Category[]; onClose: () => void; onImported: () => void }) {
  const [rows, setRows] = useState<any[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [importing, setImporting] = useState(false)
  const [fileName, setFileName] = useState('')

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsedRows = results.data as any[]
        const validationErrors: string[] = []

        parsedRows.forEach((row, i) => {
          if (!row['Product Name']?.trim()) {
            validationErrors.push(`Row ${i + 2}: Missing Product Name`)
          }
          if (row['Selling Price'] && isNaN(parseFloat(row['Selling Price']))) {
            validationErrors.push(`Row ${i + 2}: Invalid Selling Price`)
          }
          if (row['Cost Price'] && isNaN(parseFloat(row['Cost Price']))) {
            validationErrors.push(`Row ${i + 2}: Invalid Cost Price`)
          }
        })

        setRows(parsedRows)
        setErrors(validationErrors)
      },
    })
  }

  function findCategoryId(name: string | undefined) {
    if (!name) return null
    const match = categories.find((c) => c.name.toLowerCase() === name.trim().toLowerCase())
    return match?.id ?? null
  }

  async function handleImport() {
    setImporting(true)

    const payload = rows
      .filter((row) => row['Product Name']?.trim())
      .map((row) => ({
        name: row['Product Name'].trim(),
        sku: row['SKU']?.trim() || null,
        barcode: row['Barcode']?.trim() || null,
        brand: row['Brand']?.trim() || null,
        category_id: findCategoryId(row['Category']),
        size: row['Size']?.trim() || null,
        cost_price: parseFloat(row['Cost Price']) || 0,
        selling_price: parseFloat(row['Selling Price']) || 0,
        reorder_level: parseInt(row['Reorder Level']) || 5,
        current_stock: 0,
      }))

    const { error } = await supabase.from('products').insert(payload)

    if (error) {
      setErrors([error.message])
      setImporting(false)
    } else {
      onImported()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 p-6 rounded-lg w-full max-w-2xl max-h-[85vh] overflow-y-auto space-y-4">
        <h2 className="text-xl font-bold text-white">Import Products from CSV</h2>

        <p className="text-slate-400 text-sm">
          Expected columns: SKU, Barcode, Product Name, Brand, Category, Size, Cost Price, Selling Price, Reorder Level
        </p>

        <input
          type="file"
          accept=".csv"
          onChange={handleFile}
          className="text-white text-sm"
        />

        {fileName && <p className="text-slate-400 text-sm">Loaded: {fileName} ({rows.length} rows)</p>}

        {errors.length > 0 && (
          <div className="bg-red-900/30 border border-red-700 rounded p-3 max-h-40 overflow-y-auto">
            {errors.map((err, i) => (
              <p key={i} className="text-red-400 text-sm">{err}</p>
            ))}
          </div>
        )}

        {rows.length > 0 && (
          <div className="overflow-x-auto max-h-64 overflow-y-auto border border-slate-700 rounded">
            <table className="w-full text-white text-xs">
              <thead className="bg-slate-700 sticky top-0">
                <tr>
                  <th className="px-2 py-1 text-left">Name</th>
                  <th className="px-2 py-1 text-left">SKU</th>
                  <th className="px-2 py-1 text-left">Category</th>
                  <th className="px-2 py-1 text-left">Cost</th>
                  <th className="px-2 py-1 text-left">Price</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 20).map((row, i) => (
                  <tr key={i} className="border-t border-slate-700">
                    <td className="px-2 py-1">{row['Product Name']}</td>
                    <td className="px-2 py-1">{row['SKU']}</td>
                    <td className="px-2 py-1">{row['Category']}</td>
                    <td className="px-2 py-1">{row['Cost Price']}</td>
                    <td className="px-2 py-1">{row['Selling Price']}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 20 && (
              <p className="text-slate-500 text-xs p-2">...and {rows.length - 20} more rows</p>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded text-slate-300 hover:bg-slate-700">
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={rows.length === 0 || errors.length > 0 || importing}
            className="px-4 py-2 rounded bg-purple-600 hover:bg-purple-700 text-white font-semibold disabled:opacity-50"
          >
            {importing ? 'Importing...' : `Import ${rows.length} Products`}
          </button>
        </div>
      </div>
    </div>
  )
}