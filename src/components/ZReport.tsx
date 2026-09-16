import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

type PaymentBreakdown = { method: string; amount: number }

type ReportData = {
  totalSales: number
  transactionCount: number
  grossProfit: number
  totalDiscount: number
  totalTax: number
  totalRefunds: number
  refundCount: number
  totalExpenses: number
  paymentBreakdown: PaymentBreakdown[]
  netCashExpected: number
}

export default function ZReport() {
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState<ReportData | null>(null)
  const [cashCounted, setCashCounted] = useState('')

  async function runReport() {
    setLoading(true)
    const startISO = new Date(date + 'T00:00:00').toISOString()
    const endISO = new Date(date + 'T23:59:59').toISOString()

    const { data: sales } = await supabase
      .from('sales')
      .select('id, total, discount, tax, status')
      .gte('created_at', startISO)
      .lte('created_at', endISO)

    const { data: items } = await supabase
      .from('sale_items')
      .select('quantity, unit_price, unit_cost_at_sale, sale_id, sales!inner(created_at)')
      .gte('sales.created_at', startISO)
      .lte('sales.created_at', endISO)

    const { data: payments } = await supabase
      .from('sale_payments')
      .select('amount, payment_method_id, payment_methods(name), sales!inner(created_at)')
      .gte('sales.created_at', startISO)
      .lte('sales.created_at', endISO)

    const { data: returns } = await supabase
      .from('returns')
      .select('total_refund, created_at')
      .gte('created_at', startISO)
      .lte('created_at', endISO)

    const { data: expenses } = await supabase
      .from('expenses')
      .select('amount')
      .eq('expense_date', date)

    const totalSales = (sales ?? []).reduce((sum, s) => sum + Number(s.total), 0)
    const transactionCount = (sales ?? []).length
    const totalDiscount = (sales ?? []).reduce((sum, s) => sum + Number(s.discount), 0)
    const totalTax = (sales ?? []).reduce((sum, s) => sum + Number(s.tax), 0)

    const grossProfit = (items ?? []).reduce(
      (sum, i) => sum + (Number(i.unit_price) - Number(i.unit_cost_at_sale)) * i.quantity,
      0
    )

    const totalRefunds = (returns ?? []).reduce((sum, r) => sum + Number(r.total_refund), 0)
    const refundCount = (returns ?? []).length

    const totalExpenses = (expenses ?? []).reduce((sum, e) => sum + Number(e.amount), 0)

    const breakdownMap: Record<string, number> = {}
    for (const p of (payments as any) ?? []) {
      const name = p.payment_methods?.name ?? 'Unknown'
      breakdownMap[name] = (breakdownMap[name] ?? 0) + Number(p.amount)
    }
    const paymentBreakdown = Object.entries(breakdownMap).map(([method, amount]) => ({ method, amount }))

    const cashAmount = breakdownMap['Cash'] ?? 0
    const netCashExpected = cashAmount - totalRefunds

    setReport({
      totalSales,
      transactionCount,
      grossProfit,
      totalDiscount,
      totalTax,
      totalRefunds,
      refundCount,
      totalExpenses,
      paymentBreakdown,
      netCashExpected,
    })
    setCashCounted('')
    setLoading(false)
  }

  const counted = parseFloat(cashCounted) || 0
  const difference = report ? counted - report.netCashExpected : 0

  return (
    <div className="min-h-screen bg-[var(--bg-page)] p-6 max-w-3xl">
      <h1 className="text-xl font-semibold text-[var(--text-primary)] mb-6" style={{ fontFamily: 'Georgia, serif' }}>End of Day Report</h1>

      <div className="flex items-end gap-3 bg-[var(--bg-card)] border border-[var(--border)] p-4 rounded-xl mb-6 shadow-sm">
        <div>
          <label className="block text-sm text-[var(--text-secondary)] mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)]"
          />
        </div>
        <button
          onClick={runReport}
          disabled={loading}
          className="bg-gradient-to-br from-[#e8c568] to-[#d4a24e] hover:from-[#dcb95c] hover:to-[#c69144] text-[#5a4a1f] px-4 py-2 rounded-lg font-semibold disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Run Report'}
        </button>
        {report && (
          <button
            onClick={() => window.print()}
            className="bg-[var(--bg-input)] hover:opacity-80 text-[var(--text-primary)] px-4 py-2 rounded-lg font-semibold border border-[var(--border)]"
          >
            Print
          </button>
        )}
      </div>

      {report && (
        <div className="space-y-6">
          <section className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4 shadow-sm">
            <h2 className="text-[#a17a1f] font-semibold mb-3">Sales Summary</h2>
            <Row label="Total Sales" value={report.totalSales.toFixed(2)} />
            <Row label="Transactions" value={report.transactionCount.toString()} />
            <Row label="Gross Profit" value={report.grossProfit.toFixed(2)} accent />
            <Row label="Total Discounts Given" value={report.totalDiscount.toFixed(2)} />
            <Row label="Total Tax Collected" value={report.totalTax.toFixed(2)} />
          </section>

          <section className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4 shadow-sm">
            <h2 className="text-[#a17a1f] font-semibold mb-3">Payment Breakdown</h2>
            {report.paymentBreakdown.length === 0 ? (
              <p className="text-[var(--text-muted)] text-sm">No sales recorded</p>
            ) : (
              report.paymentBreakdown.map((p, i) => (
                <Row key={i} label={p.method} value={p.amount.toFixed(2)} />
              ))
            )}
          </section>

          <section className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4 shadow-sm">
            <h2 className="text-[#a17a1f] font-semibold mb-3">Returns & Expenses</h2>
            <Row label="Refunds Processed" value={`${report.refundCount} (${report.totalRefunds.toFixed(2)})`} warn={report.totalRefunds > 0} />
            <Row label="Expenses Today" value={report.totalExpenses.toFixed(2)} />
          </section>

          <section className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4 shadow-sm">
            <h2 className="text-[#a17a1f] font-semibold mb-3">Cash Reconciliation</h2>
            <Row label="Expected Cash (Cash payments − refunds)" value={report.netCashExpected.toFixed(2)} />
            <div className="mt-2">
              <label className="block text-sm text-[var(--text-secondary)] mb-1">Actual Cash Counted</label>
              <input
                type="number"
                step="0.01"
                value={cashCounted}
                onChange={(e) => setCashCounted(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)]"
                placeholder="Count the drawer and enter amount"
              />
            </div>
            {cashCounted !== '' && (
              <p className={`mt-2 font-semibold ${difference === 0 ? 'text-[#1f7a3d]' : 'text-[#8a332e]'}`}>
                Difference: {difference > 0 ? '+' : ''}{difference.toFixed(2)}
                {difference === 0 ? ' (Balanced)' : difference > 0 ? ' (Over)' : ' (Short)'}
              </p>
            )}
          </section>
        </div>
      )}

      {!report && !loading && (
        <p className="text-[var(--text-muted)]">Select a date and click "Run Report" to close out the register.</p>
      )}
    </div>
  )
}

function Row({ label, value, accent, warn }: { label: string; value: string; accent?: boolean; warn?: boolean }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-[var(--border)] last:border-0">
      <span className="text-[var(--text-secondary)] text-sm">{label}</span>
      <span className={`text-sm font-semibold ${warn ? 'text-[#8a332e]' : accent ? 'text-[#215c37]' : 'text-[var(--text-primary)]'}`}>
        {value}
      </span>
    </div>
  )
}