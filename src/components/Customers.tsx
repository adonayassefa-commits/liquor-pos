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
    <div className="min-h-screen bg-[var(--bg-page)] p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-[var(--text-primary)]" style={{ fontFamily: 'Georgia, serif' }}>Customers</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-gradient-to-br from-[#e8c568] to-[#d4a24e] hover:from-[#dcb95c] hover:to-[#c69144] text-[#5a4a1f] px-4 py-2 rounded-lg font-semibold shadow-sm"
        >
          + Add Customer
        </button>
      </div>

      <input
        type="text"
        placeholder="Search by name, phone, or email..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full mb-4 px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[#d4a24e]"
      />

      {loading ? (
        <p className="text-[var(--text-muted)]">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="text-[var(--text-muted)]">No customers yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <div key={c.id} className="bg-[var(--bg-card)] p-4 rounded-xl border border-[var(--border)] shadow-sm">
              <h3 className="text-[var(--text-primary)] font-semibold">{c.name}</h3>
              {c.phone && <p className="text-[var(--text-muted)] text-sm">{c.phone}</p>}
              {c.email && <p className="text-[var(--text-muted)] text-sm">{c.email}</p>}
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
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <form onSubmit={handleSubmit} className="bg-[var(--bg-card)] p-6 rounded-xl w-full max-w-md space-y-3 shadow-lg">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Add Customer</h2>

        <div>
          <label className="block text-sm text-[var(--text-secondary)] mb-1">Name *</label>
          <input required value={name} onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)]" />
        </div>
        <div>
          <label className="block text-sm text-[var(--text-secondary)] mb-1">Phone</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)]" />
        </div>
        <div>
          <label className="block text-sm text-[var(--text-secondary)] mb-1">Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)]" />
        </div>
        <div>
          <label className="block text-sm text-[var(--text-secondary)] mb-1">Address</label>
          <input value={address} onChange={(e) => setAddress(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)]" />
        </div>

        {error && <p className="text-[#8a332e] text-sm">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-input)]">
            Cancel
          </button>
          <button type="submit" disabled={saving}
            className="px-4 py-2 rounded-lg bg-gradient-to-br from-[#e8c568] to-[#d4a24e] text-[#5a4a1f] font-semibold disabled:opacity-50">
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  )
}