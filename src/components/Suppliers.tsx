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
    <div className="min-h-screen bg-[#fdfcfa] p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-[#1a1611]" style={{ fontFamily: 'Georgia, serif' }}>Suppliers</h1>
        <button
          onClick={() => { setEditing(null); setShowForm(true) }}
          className="bg-gradient-to-br from-[#e8c568] to-[#d4a24e] hover:from-[#dcb95c] hover:to-[#c69144] text-[#5a4a1f] px-4 py-2 rounded-lg font-semibold shadow-sm"
        >
          + Add Supplier
        </button>
      </div>

      {loading ? (
        <p className="text-[#6b6156]">Loading...</p>
      ) : suppliers.length === 0 ? (
        <p className="text-[#6b6156]">No suppliers yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {suppliers.map((s) => (
            <div key={s.id} className="bg-white p-4 rounded-xl border border-[#ece6da] shadow-sm">
              <div className="flex justify-between items-start">
                <h3 className="text-[#1a1611] font-semibold">{s.name}</h3>
                <button
                  onClick={() => { setEditing(s); setShowForm(true) }}
                  className="text-[#a17a1f] text-sm hover:underline"
                >
                  Edit
                </button>
              </div>
              {s.contact_person && <p className="text-[#6b6156] text-sm">Contact: {s.contact_person}</p>}
              {s.phone && <p className="text-[#6b6156] text-sm">Phone: {s.phone}</p>}
              {s.email && <p className="text-[#6b6156] text-sm">Email: {s.email}</p>}
              {s.payment_terms && <p className="text-[#6b6156] text-sm">Terms: {s.payment_terms}</p>}
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
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl w-full max-w-md space-y-3 shadow-lg">
        <h2 className="text-lg font-semibold text-[#1a1611] mb-2">
          {supplier ? 'Edit Supplier' : 'Add Supplier'}
        </h2>

        <div>
          <label className="block text-sm text-[#5c5448] mb-1">Name *</label>
          <input required value={name} onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-[#faf8f4] border border-[#ece6da] text-[#1a1611]" />
        </div>
        <div>
          <label className="block text-sm text-[#5c5448] mb-1">Contact Person</label>
          <input value={contactPerson} onChange={(e) => setContactPerson(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-[#faf8f4] border border-[#ece6da] text-[#1a1611]" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-[#5c5448] mb-1">Phone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[#faf8f4] border border-[#ece6da] text-[#1a1611]" />
          </div>
          <div>
            <label className="block text-sm text-[#5c5448] mb-1">Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[#faf8f4] border border-[#ece6da] text-[#1a1611]" />
          </div>
        </div>
        <div>
          <label className="block text-sm text-[#5c5448] mb-1">Address</label>
          <input value={address} onChange={(e) => setAddress(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-[#faf8f4] border border-[#ece6da] text-[#1a1611]" />
        </div>
        <div>
          <label className="block text-sm text-[#5c5448] mb-1">Payment Terms</label>
          <input value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)}
            placeholder="e.g. Net 30"
            className="w-full px-3 py-2 rounded-lg bg-[#faf8f4] border border-[#ece6da] text-[#1a1611]" />
        </div>

        {error && <p className="text-[#8a332e] text-sm">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-[#6b6156] hover:bg-[#faf8f4]">
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