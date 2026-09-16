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
    <div className="min-h-screen bg-[#1c1815] p-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-[#f2ece2] mb-6">End of Day Report</h1>

      <div className="flex items-end gap-3 bg-[#2c2419] p-4 rounded-lg mb-6">
        <div>
          <label className="block text-sm text-[#a89d8f] mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-2 rounded bg-[#3a2f22] text-[#f2ece2]"
          />
        </div>
        <button
          onClick={runReport}
          disabled={loading}
          className="bg-[#d4a24e] hover:bg-[#c69144] text-[#1c1815] px-4 py-2 rounded font-semibold disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Run Report'}
        </button>
        {report && (
          <button
            onClick={() => window.print()}
            className="bg-[#3a2f22] hover:bg-[#4a3d2c] text-[#f2ece2] px-4 py-2 rounded font-semibold"
          >
            Print
          </button>
        )}
      </div>

      {report && (
        <div className="space-y-6">
          <section className="bg-[#2c2419] rounded-lg p-4">
            <h2 className="text-[#d4a24e] font-semibold mb-3">Sales Summary</h2>
            <Row label="Total Sales" value={report.totalSales.toFixed(2)} />
            <Row label="Transactions" value={report.transactionCount.toString()} />
            <Row label="Gross Profit" value={report.grossProfit.toFixed(2)} accent />
            <Row label="Total Discounts Given" value={report.totalDiscount.toFixed(2)} />
            <Row label="Total Tax Collected" value={report.totalTax.toFixed(2)} />
          </section>

          <section className="bg-[#2c2419] rounded-lg p-4">
            <h2 className="text-[#d4a24e] font-semibold mb-3">Payment Breakdown</h2>
            {report.paymentBreakdown.length === 0 ? (
              <p className="text-[#8a8177] text-sm">No sales recorded</p>
            ) : (
              report.paymentBreakdown.map((p, i) => (
                <Row key={i} label={p.method} value={p.amount.toFixed(2)} />
              ))
            )}
          </section>

          <section className="bg-[#2c2419] rounded-lg p-4">
            <h2 className="text-[#d4a24e] font-semibold mb-3">Returns & Expenses</h2>
            <Row label="Refunds Processed" value={`${report.refundCount} (${report.totalRefunds.toFixed(2)})`} warn={report.totalRefunds > 0} />
            <Row label="Expenses Today" value={report.totalExpenses.toFixed(2)} />
          </section>

          <section className="bg-[#2c2419] rounded-lg p-4">
            <h2 className="text-[#d4a24e] font-semibold mb-3">Cash Reconciliation</h2>
            <Row label="Expected Cash (Cash payments − refunds)" value={report.netCashExpected.toFixed(2)} />
            <div className="mt-2">
              <label className="block text-sm text-[#a89d8f] mb-1">Actual Cash Counted</label>
              <input
                type="number"
                step="0.01"
                value={cashCounted}
                onChange={(e) => setCashCounted(e.target.value)}
                className="w-full px-3 py-2 rounded bg-[#3a2f22] text-[#f2ece2]"
                placeholder="Count the drawer and enter amount"
              />
            </div>
            {cashCounted !== '' && (
              <p className={`mt-2 font-semibold ${difference === 0 ? 'text-green-400' : 'text-red-400'}`}>
                Difference: {difference > 0 ? '+' : ''}{difference.toFixed(2)}
                {difference === 0 ? ' (Balanced)' : difference > 0 ? ' (Over)' : ' (Short)'}
              </p>
            )}
          </section>
        </div>
      )}

      {!report && !loading && (
        <p className="text-[#8a8177]">Select a date and click "Run Report" to close out the register.</p>
      )}
    </div>
  )
}

function Row({ label, value, accent, warn }: { label: string; value: string; accent?: boolean; warn?: boolean }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-[#33291f] last:border-0">
      <span className="text-[#a89d8f] text-sm">{label}</span>
      <span className={`text-sm font-semibold ${warn ? 'text-red-400' : accent ? 'text-[#d4a24e]' : 'text-[#f2ece2]'}`}>
        {value}
      </span>
    </div>
  )
}