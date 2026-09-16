import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

type Supplier = {
  id: string
  name: string
  contact_person: string | null
  phone: string | null
  email: string | null
  address: string | null
  payment_terms: string | null
  is_active: boolean
}

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Supplier | null>(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('suppliers')
      .select('*')
      .eq('is_active', true)
      .order('name')
    setSuppliers(data ?? [])
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#1c1815] p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#f2ece2]">Suppliers</h1>
        <button
          onClick={() => { setEditing(null); setShowForm(true) }}
          className="bg-[#d4a24e] hover:bg-[#c69144] text-[#1c1815] px-4 py-2 rounded font-semibold"
        >
          + Add Supplier
        </button>
      </div>

      {loading ? (
        <p className="text-[#8a8177]">Loading...</p>
      ) : suppliers.length === 0 ? (
        <p className="text-[#8a8177]">No suppliers yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {suppliers.map((s) => (
            <div key={s.id} className="bg-[#2c2419] p-4 rounded-lg border border-[#33291f]">
              <div className="flex justify-between items-start">
                <h3 className="text-[#f2ece2] font-bold">{s.name}</h3>
                <button
                  onClick={() => { setEditing(s); setShowForm(true) }}
                  className="text-[#d4a24e] text-sm hover:underline"
                >
                  Edit
                </button>
              </div>
              {s.contact_person && <p className="text-[#8a8177] text-sm">Contact: {s.contact_person}</p>}
              {s.phone && <p className="text-[#8a8177] text-sm">Phone: {s.phone}</p>}
              {s.email && <p className="text-[#8a8177] text-sm">Email: {s.email}</p>}
              {s.payment_terms && <p className="text-[#8a8177] text-sm">Terms: {s.payment_terms}</p>}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <SupplierForm
          supplier={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load() }}
        />
      )}
    </div>
  )
}

function SupplierForm({
  supplier, onClose, onSaved,
}: { supplier: Supplier | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(supplier?.name ?? '')
  const [contactPerson, setContactPerson] = useState(supplier?.contact_person ?? '')
  const [phone, setPhone] = useState(supplier?.phone ?? '')
  const [email, setEmail] = useState(supplier?.email ?? '')
  const [address, setAddress] = useState(supplier?.address ?? '')
  const [paymentTerms, setPaymentTerms] = useState(supplier?.payment_terms ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const payload = {
      name,
      contact_person: contactPerson || null,
      phone: phone || null,
      email: email || null,
      address: address || null,
      payment_terms: paymentTerms || null,
    }

    const { error } = supplier
      ? await supabase.from('suppliers').update(payload).eq('id', supplier.id)
      : await supabase.from('suppliers').insert(payload)

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
        <h2 className="text-xl font-bold text-[#f2ece2] mb-2">
          {supplier ? 'Edit Supplier' : 'Add Supplier'}
        </h2>

        <div>
          <label className="block text-sm text-[#a89d8f] mb-1">Name *</label>
          <input required value={name} onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 rounded bg-[#3a2f22] text-[#f2ece2]" />
        </div>
        <div>
          <label className="block text-sm text-[#a89d8f] mb-1">Contact Person</label>
          <input value={contactPerson} onChange={(e) => setContactPerson(e.target.value)}
            className="w-full px-3 py-2 rounded bg-[#3a2f22] text-[#f2ece2]" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-[#a89d8f] mb-1">Phone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 rounded bg-[#3a2f22] text-[#f2ece2]" />
          </div>
          <div>
            <label className="block text-sm text-[#a89d8f] mb-1">Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded bg-[#3a2f22] text-[#f2ece2]" />
          </div>
        </div>
        <div>
          <label className="block text-sm text-[#a89d8f] mb-1">Address</label>
          <input value={address} onChange={(e) => setAddress(e.target.value)}
            className="w-full px-3 py-2 rounded bg-[#3a2f22] text-[#f2ece2]" />
        </div>
        <div>
          <label className="block text-sm text-[#a89d8f] mb-1">Payment Terms</label>
          <input value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)}
            placeholder="e.g. Net 30"
            className="w-full px-3 py-2 rounded bg-[#3a2f22] text-[#f2ece2]" />
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded text-[#a89d8f] hover:bg-[#3a2f22]">
            Cancel
          </button>
          <button type="submit" disabled={saving}
            className="px-4 py-2 rounded bg-[#d4a24e] hover:bg-[#c69144] text-[#1c1815] font-semibold disabled:opacity-50">
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  )
}