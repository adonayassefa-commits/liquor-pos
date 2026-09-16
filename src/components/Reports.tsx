import { useState } from 'react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { supabase } from '../lib/supabaseClient'

type ProductReportRow = {
  product_name: string
  quantity_sold: number
  revenue: number
  cost: number
  profit: number
}

type CashierReportRow = {
  cashier_name: string
  transactions: number
  revenue: number
}

type DailyRow = {
  date: string
  revenue: number
  profit: number
}

export default function Reports() {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState<{
    revenue: number
    cogs: number
    grossProfit: number
    margin: number
    transactions: number
  } | null>(null)
  const [byProduct, setByProduct] = useState<ProductReportRow[]>([])
  const [byCashier, setByCashier] = useState<CashierReportRow[]>([])
  const [dailyTrend, setDailyTrend] = useState<DailyRow[]>([])
  const [inventoryValuation, setInventoryValuation] = useState<{
    totalCost: number
    totalRetail: number
    productCount: number
  } | null>(null)

  async function runReport() {
    setLoading(true)
    const startISO = new Date(startDate + 'T00:00:00').toISOString()
    const endISO = new Date(endDate + 'T23:59:59').toISOString()

    const { data: items } = await supabase
      .from('sale_items')
      .select(`
        quantity, unit_price, unit_cost_at_sale,
        products(name),
        sales!inner(created_at, cashier_id, profiles(full_name, email))
      `)
      .gte('sales.created_at', startISO)
      .lte('sales.created_at', endISO)

    const rows = (items as any) ?? []

    let revenue = 0
    let cogs = 0
    const productTotals: Record<string, ProductReportRow> = {}
    const cashierTotals: Record<string, CashierReportRow> = {}
    const dailyTotals: Record<string, { revenue: number; profit: number }> = {}
    const saleIdsSeen = new Set<string>()

    for (const item of rows) {
      const lineRevenue = item.unit_price * item.quantity
      const lineCost = item.unit_cost_at_sale * item.quantity
      const lineProfit = lineRevenue - lineCost
      revenue += lineRevenue
      cogs += lineCost

      const pName = item.products?.name ?? 'Unknown'
      if (!productTotals[pName]) {
        productTotals[pName] = { product_name: pName, quantity_sold: 0, revenue: 0, cost: 0, profit: 0 }
      }
      productTotals[pName].quantity_sold += item.quantity
      productTotals[pName].revenue += lineRevenue
      productTotals[pName].cost += lineCost
      productTotals[pName].profit += lineProfit

      const cName = item.sales?.profiles?.full_name ?? item.sales?.profiles?.email ?? 'Unknown'
      if (!cashierTotals[cName]) {
        cashierTotals[cName] = { cashier_name: cName, transactions: 0, revenue: 0 }
      }
      cashierTotals[cName].revenue += lineRevenue

      const dayKey = item.sales?.created_at?.split('T')[0] ?? 'unknown'
      if (!dailyTotals[dayKey]) dailyTotals[dayKey] = { revenue: 0, profit: 0 }
      dailyTotals[dayKey].revenue += lineRevenue
      dailyTotals[dayKey].profit += lineProfit
    }

    const { data: salesInRange } = await supabase
      .from('sales')
      .select('id, cashier_id, profiles(full_name, email)')
      .gte('created_at', startISO)
      .lte('created_at', endISO)

    for (const sale of (salesInRange as any) ?? []) {
      const cName = sale.profiles?.full_name ?? sale.profiles?.email ?? 'Unknown'
      if (cashierTotals[cName]) cashierTotals[cName].transactions += 1
      saleIdsSeen.add(sale.id)
    }

    const grossProfit = revenue - cogs
    const margin = revenue > 0 ? (grossProfit / revenue) * 100 : 0

    setSummary({
      revenue,
      cogs,
      grossProfit,
      margin,
      transactions: saleIdsSeen.size,
    })
    setByProduct(Object.values(productTotals).sort((a, b) => b.revenue - a.revenue))
    setByCashier(Object.values(cashierTotals).sort((a, b) => b.revenue - a.revenue))
    setDailyTrend(
      Object.entries(dailyTotals)
        .map(([date, v]) => ({
          date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          revenue: Math.round(v.revenue * 100) / 100,
          profit: Math.round(v.profit * 100) / 100,
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    )

    const { data: products } = await supabase
      .from('products')
      .select('current_stock, cost_price, selling_price')
      .eq('is_active', true)

    const totalCost = (products ?? []).reduce((sum, p) => sum + p.current_stock * Number(p.cost_price), 0)
    const totalRetail = (products ?? []).reduce((sum, p) => sum + p.current_stock * Number(p.selling_price), 0)
    setInventoryValuation({ totalCost, totalRetail, productCount: products?.length ?? 0 })

    setLoading(false)
  }

  function exportCSV(filename: string, headers: string[], rows: (string | number)[][]) {
    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-[var(--bg-page)] p-6 space-y-8">
      <h1 className="text-xl font-semibold text-[var(--text-primary)]" style={{ fontFamily: 'Georgia, serif' }}>Reports</h1>

      <div className="flex flex-wrap items-end gap-3 bg-[var(--bg-card)] border border-[var(--border)] p-4 rounded-xl shadow-sm">
        <div>
          <label className="block text-sm text-[var(--text-secondary)] mb-1">From</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)]" />
        </div>
        <div>
          <label className="block text-sm text-[var(--text-secondary)] mb-1">To</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)]" />
        </div>
        <button
          onClick={runReport}
          disabled={loading}
          className="bg-gradient-to-br from-[#e8c568] to-[#d4a24e] hover:from-[#dcb95c] hover:to-[#c69144] text-[#5a4a1f] px-4 py-2 rounded-lg font-semibold disabled:opacity-50"
        >
          {loading ? 'Running...' : 'Run Report'}
        </button>
      </div>

      {summary && (
        <>
          <section>
            <h2 className="text-[var(--text-secondary)] text-xs uppercase tracking-wide font-bold mb-3">Profit Summary</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <Stat label="Revenue" value={summary.revenue.toFixed(2)} color="var(--text-primary)" />
              <Stat label="COGS" value={summary.cogs.toFixed(2)} color="var(--text-primary)" />
              <Stat label="Gross Profit" value={summary.grossProfit.toFixed(2)} color="#215c37" />
              <Stat label="Margin" value={summary.margin.toFixed(1) + '%'} color="var(--text-primary)" />
              <Stat label="Transactions" value={summary.transactions.toString()} color="var(--text-primary)" />
            </div>
          </section>

          {dailyTrend.length > 1 && (
            <section className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4 shadow-sm">
              <h2 className="text-[var(--text-primary)] font-semibold mb-4">Sales & Profit Trend</h2>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={dailyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#9c9187" opacity={0.2} />
                  <XAxis dataKey="date" tick={{ fill: '#9c9187', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#9c9187', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ background: '#2c2419', border: '1px solid #33291f', borderRadius: 8, fontSize: 12, color: '#f2ece2' }}
                  />
                  <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#d4a24e" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="profit" name="Profit" stroke="#3a6fd8" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </section>
          )}

          {byProduct.length > 0 && (
            <section className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4 shadow-sm">
              <h2 className="text-[var(--text-primary)] font-semibold mb-4">Top Products by Revenue</h2>
              <ResponsiveContainer width="100%" height={Math.max(200, byProduct.slice(0, 8).length * 40)}>
                <BarChart data={byProduct.slice(0, 8)} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#9c9187" opacity={0.2} horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#9c9187', fontSize: 11 }} />
                  <YAxis dataKey="product_name" type="category" width={140} tick={{ fill: '#9c9187', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ background: '#2c2419', border: '1px solid #33291f', borderRadius: 8, fontSize: 12, color: '#f2ece2' }}
                  />
                  <Bar dataKey="revenue" name="Revenue" fill="#d4a24e" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </section>
          )}

          {inventoryValuation && (
            <section>
              <h2 className="text-[var(--text-secondary)] text-xs uppercase tracking-wide font-bold mb-3">
                Current Inventory Valuation
              </h2>
              <div className="grid grid-cols-3 gap-3">
                <Stat label="Products" value={inventoryValuation.productCount.toString()} color="var(--text-primary)" />
                <Stat label="Cost Value" value={inventoryValuation.totalCost.toFixed(2)} color="var(--text-primary)" />
                <Stat label="Retail Value" value={inventoryValuation.totalRetail.toFixed(2)} color="var(--text-primary)" />
              </div>
            </section>
          )}

          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[var(--text-primary)] font-semibold">Sales by Product</h2>
              <button
                onClick={() =>
                  exportCSV(
                    'sales_by_product.csv',
                    ['Product', 'Quantity Sold', 'Revenue', 'Cost', 'Profit'],
                    byProduct.map((r) => [r.product_name, r.quantity_sold, r.revenue.toFixed(2), r.cost.toFixed(2), r.profit.toFixed(2)])
                  )
                }
                className="text-[#a17a1f] text-sm hover:underline"
              >
                Export CSV
              </button>
            </div>
            <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--bg-card)] shadow-sm">
              <table className="w-full text-left text-[var(--text-primary)] text-sm">
                <thead className="bg-[var(--bg-sidebar)] text-[var(--text-secondary)] uppercase">
                  <tr>
                    <th className="px-4 py-2">Product</th>
                    <th className="px-4 py-2">Qty Sold</th>
                    <th className="px-4 py-2">Revenue</th>
                    <th className="px-4 py-2">Cost</th>
                    <th className="px-4 py-2">Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {byProduct.map((r, i) => (
                    <tr key={i} className="border-t border-[var(--border)]">
                      <td className="px-4 py-2">{r.product_name}</td>
                      <td className="px-4 py-2">{r.quantity_sold}</td>
                      <td className="px-4 py-2">{r.revenue.toFixed(2)}</td>
                      <td className="px-4 py-2">{r.cost.toFixed(2)}</td>
                      <td className="px-4 py-2 text-[#1f7a3d]">{r.profit.toFixed(2)}</td>
                    </tr>
                  ))}
                  {byProduct.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-4 text-[var(--text-muted)]">No sales in this period</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[var(--text-primary)] font-semibold">Sales by Cashier</h2>
              <button
                onClick={() =>
                  exportCSV(
                    'sales_by_cashier.csv',
                    ['Cashier', 'Transactions', 'Revenue'],
                    byCashier.map((r) => [r.cashier_name, r.transactions, r.revenue.toFixed(2)])
                  )
                }
                className="text-[#a17a1f] text-sm hover:underline"
              >
                Export CSV
              </button>
            </div>
            <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--bg-card)] shadow-sm">
              <table className="w-full text-left text-[var(--text-primary)] text-sm">
                <thead className="bg-[var(--bg-sidebar)] text-[var(--text-secondary)] uppercase">
                  <tr>
                    <th className="px-4 py-2">Cashier</th>
                    <th className="px-4 py-2">Transactions</th>
                    <th className="px-4 py-2">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {byCashier.map((r, i) => (
                    <tr key={i} className="border-t border-[var(--border)]">
                      <td className="px-4 py-2">{r.cashier_name}</td>
                      <td className="px-4 py-2">{r.transactions}</td>
                      <td className="px-4 py-2">{r.revenue.toFixed(2)}</td>
                    </tr>
                  ))}
                  {byCashier.length === 0 && (
                    <tr><td colSpan={3} className="px-4 py-4 text-[var(--text-muted)]">No sales in this period</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {!summary && !loading && (
        <p className="text-[var(--text-muted)]">Select a date range and click "Run Report" to see results.</p>
      )}
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4 shadow-sm">
      <p className="text-[var(--text-secondary)] text-xs uppercase tracking-wide font-semibold mb-1">{label}</p>
      <p className="text-xl font-semibold" style={{ color }}>{value}</p>
    </div>
  )
}