import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { formatEthiopianDate } from '../ethiopianDate'
import { getLanguage } from '../i18n'

type Stats = {
  todaySales: number
  todayTransactions: number
  todayItemsSold: number
  todayProfit: number
  totalProducts: number
  totalStockUnits: number
  inventoryCostValue: number
  inventoryRetailValue: number
  lowStockCount: number
  outOfStockCount: number
}

type BestSeller = {
  product_name: string
  total_sold: number
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [bestSellers, setBestSellers] = useState<BestSeller[]>([])
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    setLoading(true)

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const { data: todaySalesData } = await supabase
      .from('sales')
      .select('total, subtotal')
      .gte('created_at', todayStart.toISOString())

    const { data: todayItemsData } = await supabase
      .from('sale_items')
      .select('quantity, unit_price, unit_cost_at_sale, sale_id, sales!inner(created_at)')
      .gte('sales.created_at', todayStart.toISOString())

    const todaySales = (todaySalesData ?? []).reduce((sum, s) => sum + Number(s.total), 0)
    const todayTransactions = (todaySalesData ?? []).length
    const todayItemsSold = (todayItemsData ?? []).reduce((sum, i) => sum + i.quantity, 0)
    const todayProfit = (todayItemsData ?? []).reduce(
      (sum, i) => sum + (Number(i.unit_price) - Number(i.unit_cost_at_sale)) * i.quantity,
      0
    )

    const { data: products } = await supabase
      .from('products')
      .select('current_stock, cost_price, selling_price, reorder_level')
      .eq('is_active', true)

    const totalProducts = products?.length ?? 0
    const totalStockUnits = (products ?? []).reduce((sum, p) => sum + p.current_stock, 0)
    const inventoryCostValue = (products ?? []).reduce((sum, p) => sum + p.current_stock * Number(p.cost_price), 0)
    const inventoryRetailValue = (products ?? []).reduce((sum, p) => sum + p.current_stock * Number(p.selling_price), 0)
    const lowStockCount = (products ?? []).filter((p) => p.current_stock > 0 && p.current_stock <= p.reorder_level).length
    const outOfStockCount = (products ?? []).filter((p) => p.current_stock === 0).length

    setStats({
      todaySales,
      todayTransactions,
      todayItemsSold,
      todayProfit,
      totalProducts,
      totalStockUnits,
      inventoryCostValue,
      inventoryRetailValue,
      lowStockCount,
      outOfStockCount,
    })

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: itemsForBestSellers } = await supabase
      .from('sale_items')
      .select('quantity, product_id, products(name), sales!inner(created_at)')
      .gte('sales.created_at', thirtyDaysAgo.toISOString())

    const totals: Record<string, { name: string; qty: number }> = {}
    for (const item of itemsForBestSellers ?? []) {
      const name = (item as any).products?.name ?? 'Unknown'
      if (!totals[item.product_id]) totals[item.product_id] = { name, qty: 0 }
      totals[item.product_id].qty += item.quantity
    }
    const sorted = Object.values(totals)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5)
      .map((t) => ({ product_name: t.name, total_sold: t.qty }))
    setBestSellers(sorted)

    const { data: lowStock } = await supabase
      .from('products')
      .select('id, name, current_stock, reorder_level')
      .eq('is_active', true)
      .order('current_stock')
      .limit(50)
    setLowStockProducts((lowStock ?? []).filter((p) => p.current_stock <= p.reorder_level))

    setLoading(false)
  }

  if (loading || !stats) {
    return (
      <div className="min-h-screen bg-[var(--bg-page)] p-6">
        <p className="text-[var(--text-muted)]">Loading dashboard...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--bg-page)] p-6 space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-[var(--text-primary)]" style={{ fontFamily: 'Georgia, serif' }}>
          Welcome back
        </h1>
        <p className="text-[var(--text-muted)] text-xs uppercase tracking-wide font-medium">
          {formatEthiopianDate(new Date(), getLanguage())}
        </p>
      </div>

      <section>
        <h2 className="text-[var(--text-secondary)] text-xs uppercase tracking-wide font-bold mb-3">Today</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Sales" value={stats.todaySales.toFixed(2)} color="#215c37" />
          <StatCard label="Transactions" value={stats.todayTransactions.toString()} color="#1f3a68" />
          <StatCard label="Items Sold" value={stats.todayItemsSold.toString()} color="var(--text-primary)" />
          <StatCard label="Gross Profit" value={stats.todayProfit.toFixed(2)} color="#8a332e" />
        </div>
      </section>

      <section>
        <h2 className="text-[var(--text-secondary)] text-xs uppercase tracking-wide font-bold mb-3">Inventory</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Total Products" value={stats.totalProducts.toString()} color="var(--text-primary)" />
          <StatCard label="Total Units" value={stats.totalStockUnits.toString()} color="var(--text-primary)" />
          <StatCard label="Cost Value" value={stats.inventoryCostValue.toFixed(2)} color="var(--text-primary)" />
          <StatCard label="Retail Value" value={stats.inventoryRetailValue.toFixed(2)} color="var(--text-primary)" />
        </div>
      </section>

      <section>
        <h2 className="text-[var(--text-secondary)] text-xs uppercase tracking-wide font-bold mb-3">Alerts</h2>
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Low Stock Products" value={stats.lowStockCount.toString()} color={stats.lowStockCount > 0 ? '#8a611a' : 'var(--text-primary)'} />
          <StatCard label="Out of Stock" value={stats.outOfStockCount.toString()} color={stats.outOfStockCount > 0 ? '#8a332e' : 'var(--text-primary)'} />
        </div>
      </section>

      <div className="grid md:grid-cols-2 gap-4">
        <section className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4 shadow-sm">
          <h2 className="text-[var(--text-primary)] font-semibold mb-3">Best Sellers (30 days)</h2>
          {bestSellers.length === 0 ? (
            <p className="text-[var(--text-muted)] text-sm">No sales yet</p>
          ) : (
            <ul className="space-y-2">
              {bestSellers.map((b, i) => (
                <li key={i} className="flex justify-between text-[var(--text-secondary)] text-sm">
                  <span>{b.product_name}</span>
                  <span className="text-[#a17a1f] font-semibold">{b.total_sold} sold</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4 shadow-sm">
          <h2 className="text-[var(--text-primary)] font-semibold mb-3">Needs Attention</h2>
          {lowStockProducts.length === 0 ? (
            <p className="text-[#a17a1f] text-sm">All stock levels healthy</p>
          ) : (
            <ul className="space-y-2">
              {lowStockProducts.map((p) => (
                <li key={p.id} className="flex justify-between text-[var(--text-secondary)] text-sm">
                  <span>{p.name}</span>
                  <span className={p.current_stock === 0 ? 'text-[#8a332e] font-semibold' : 'text-[#a17a1f] font-semibold'}>
                    {p.current_stock} left
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4 shadow-sm">
      <p className="text-[var(--text-secondary)] text-xs uppercase tracking-wide font-semibold mb-1">{label}</p>
      <p className="text-xl font-semibold" style={{ color }}>
        {value}
      </p>
    </div>
  )
}