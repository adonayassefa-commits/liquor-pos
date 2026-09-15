import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

type Customer = {
  id: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
  notes: string | null
}

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('customers').select('*').order('name')
    setCustomers(data ?? [])
    setLoading(false)
  }

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search) ||
      c.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Customers</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded font-semibold"
        >
          + Add Customer
        </button>
      </div>

      <input
        type="text"
        placeholder="Search by name, phone, or email..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full mb-4 px-3 py-2 rounded bg-slate-800 text-white outline-none focus:ring-2 focus:ring-purple-500"
      />

      {loading ? (
        <p className="text-slate-400">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="text-slate-400">No customers yet.</p>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {filtered.map((c) => (
            <div key={c.id} className="bg-slate-800 p-4 rounded-lg border border-slate-700">
              <h3 className="text-white font-bold">{c.name}</h3>
              {c.phone && <p className="text-slate-400 text-sm">{c.phone}</p>}
              {c.email && <p className="text-slate-400 text-sm">{c.email}</p>}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <CustomerForm
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load() }}
        />
      )}
    </div>
  )
}

function CustomerForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const { error } = await supabase.from('customers').insert({
      name,
      phone: phone || null,
      email: email || null,
      address: address || null,
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
      <form onSubmit={handleSubmit} className="bg-slate-800 p-6 rounded-lg w-full max-w-md space-y-3">
        <h2 className="text-xl font-bold text-white mb-2">Add Customer</h2>

        <div>
          <label className="block text-sm text-slate-300 mb-1">Name *</label>
          <input required value={name} onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 rounded bg-slate-700 text-white" />
        </div>
        <div>
          <label className="block text-sm text-slate-300 mb-1">Phone</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)}
            className="w-full px-3 py-2 rounded bg-slate-700 text-white" />
        </div>
        <div>
          <label className="block text-sm text-slate-300 mb-1">Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 rounded bg-slate-700 text-white" />
        </div>
        <div>
          <label className="block text-sm text-slate-300 mb-1">Address</label>
          <input value={address} onChange={(e) => setAddress(e.target.value)}
            className="w-full px-3 py-2 rounded bg-slate-700 text-white" />
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded text-slate-300 hover:bg-slate-700">
            Cancel
          </button>
          <button type="submit" disabled={saving}
            className="px-4 py-2 rounded bg-purple-600 hover:bg-purple-700 text-white font-semibold disabled:opacity-50">
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  )
}