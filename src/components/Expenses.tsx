import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

type Category = { id: string; name: string }
type PaymentMethod = { id: string; name: string }

type Expense = {
  id: string
  description: string | null
  amount: number
  expense_date: string
  notes: string | null
  expense_categories: { name: string } | null
  payment_methods: { name: string } | null
  profiles: { full_name: string | null; email: string } | null
}

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('expenses')
      .select('id, description, amount, expense_date, notes, expense_categories(name), payment_methods(name), profiles(full_name, email)')
      .order('expense_date', { ascending: false })
    setExpenses((data as any) ?? [])

    const { data: cats } = await supabase.from('expense_categories').select('id, name').order('name')
    setCategories(cats ?? [])

    const { data: methods } = await supabase.from('payment_methods').select('id, name').eq('is_active', true)
    setPaymentMethods(methods ?? [])

    setLoading(false)
  }

  const totalThisMonth = expenses
    .filter((e) => {
      const d = new Date(e.expense_date)
      const now = new Date()
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
    .reduce((sum, e) => sum + Number(e.amount), 0)

  return (
    <div className="min-h-screen bg-[#1c1815] p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#f2ece2]">Expenses</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-[#d4a24e] hover:bg-[#c69144] text-[#1c1815] px-4 py-2 rounded font-semibold"
        >
          + Add Expense
        </button>
      </div>

      <div className="bg-[#2c2419] rounded-lg p-4 mb-6 inline-block">
        <p className="text-[#8a8177] text-xs uppercase">This Month</p>
        <p className="text-2xl font-bold text-[#f2ece2]">{totalThisMonth.toFixed(2)}</p>
      </div>

      {loading ? (
        <p className="text-[#8a8177]">Loading...</p>
      ) : expenses.length === 0 ? (
        <p className="text-[#8a8177]">No expenses recorded yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[#33291f]">
          <table className="w-full text-left text-[#f2ece2] text-sm">
            <thead className="bg-[#2c2419] text-[#a89d8f] uppercase">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Recorded By</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id} className="border-t border-[#33291f] hover:bg-[#2c2419]/50">
                  <td className="px-4 py-3 text-[#8a8177]">{e.expense_date}</td>
                  <td className="px-4 py-3">{e.expense_categories?.name ?? '—'}</td>
                  <td className="px-4 py-3">{e.description ?? '—'}</td>
                  <td className="px-4 py-3 font-semibold">{Number(e.amount).toFixed(2)}</td>
                  <td className="px-4 py-3 text-[#8a8177]">{e.payment_methods?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-[#8a8177]">{e.profiles?.full_name ?? e.profiles?.email ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <ExpenseForm
          categories={categories}
          paymentMethods={paymentMethods}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load() }}
        />
      )}
    </div>
  )
}

function ExpenseForm({
  categories, paymentMethods, onClose, onSaved,
}: { categories: Category[]; paymentMethods: PaymentMethod[]; onClose: () => void; onSaved: () => void }) {
  const [categoryId, setCategoryId] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().split('T')[0])
  const [paymentMethodId, setPaymentMethodId] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const { data: userData } = await supabase.auth.getUser()

    const { error } = await supabase.from('expenses').insert({
      category_id: categoryId || null,
      description: description || null,
      amount: parseFloat(amount) || 0,
      expense_date: expenseDate,
      payment_method_id: paymentMethodId || null,
      notes: notes || null,
      user_id: userData.user?.id,
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
      <form onSubmit={handleSubmit} className="bg-[#2c2419] p-6 rounded-lg w-full max-w-md space-y-3">
        <h2 className="text-xl font-bold text-[#f2ece2] mb-2">Add Expense</h2>

        <div>
          <label className="block text-sm text-[#a89d8f] mb-1">Category</label>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
            className="w-full px-3 py-2 rounded bg-[#3a2f22] text-[#f2ece2]">
            <option value="">— Select —</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm text-[#a89d8f] mb-1">Description</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 rounded bg-[#3a2f22] text-[#f2ece2]" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-[#a89d8f] mb-1">Amount *</label>
            <input required type="number" step="0.01" value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 rounded bg-[#3a2f22] text-[#f2ece2]" />
          </div>
          <div>
            <label className="block text-sm text-[#a89d8f] mb-1">Date *</label>
            <input required type="date" value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              className="w-full px-3 py-2 rounded bg-[#3a2f22] text-[#f2ece2]" />
          </div>
        </div>

        <div>
          <label className="block text-sm text-[#a89d8f] mb-1">Payment Method</label>
          <select value={paymentMethodId} onChange={(e) => setPaymentMethodId(e.target.value)}
            className="w-full px-3 py-2 rounded bg-[#3a2f22] text-[#f2ece2]">
            <option value="">— Select —</option>
            {paymentMethods.map((pm) => <option key={pm.id} value={pm.id}>{pm.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm text-[#a89d8f] mb-1">Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
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