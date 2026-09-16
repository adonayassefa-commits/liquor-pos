import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

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
      <div className="min-h-screen bg-[#1c1815] p-6">
        <p className="text-[#8a8177]">Loading dashboard...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#1c1815] p-6 space-y-8">
      <h1 className="text-2xl font-bold text-[#f2ece2]">Dashboard</h1>

      <section>
        <h2 className="text-[#8a8177] text-sm uppercase font-semibold mb-3">Today</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Sales" value={stats.todaySales.toFixed(2)} />
          <StatCard label="Transactions" value={stats.todayTransactions.toString()} />
          <StatCard label="Items Sold" value={stats.todayItemsSold.toString()} />
          <StatCard label="Gross Profit" value={stats.todayProfit.toFixed(2)} accent />
        </div>
      </section>

      <section>
        <h2 className="text-[#8a8177] text-sm uppercase font-semibold mb-3">Inventory</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Products" value={stats.totalProducts.toString()} />
          <StatCard label="Total Units" value={stats.totalStockUnits.toString()} />
          <StatCard label="Cost Value" value={stats.inventoryCostValue.toFixed(2)} />
          <StatCard label="Retail Value" value={stats.inventoryRetailValue.toFixed(2)} />
        </div>
      </section>

      <section>
        <h2 className="text-[#8a8177] text-sm uppercase font-semibold mb-3">Alerts</h2>
        <div className="grid grid-cols-2 gap-4">
          <StatCard label="Low Stock Products" value={stats.lowStockCount.toString()} warn={stats.lowStockCount > 0} />
          <StatCard label="Out of Stock" value={stats.outOfStockCount.toString()} warn={stats.outOfStockCount > 0} />
        </div>
      </section>

      <div className="grid md:grid-cols-2 gap-6">
        <section className="bg-[#2c2419] rounded-lg p-4">
          <h2 className="text-[#f2ece2] font-semibold mb-3">Best Sellers (30 days)</h2>
          {bestSellers.length === 0 ? (
            <p className="text-[#8a8177] text-sm">No sales yet</p>
          ) : (
            <ul className="space-y-2">
              {bestSellers.map((b, i) => (
                <li key={i} className="flex justify-between text-[#a89d8f] text-sm">
                  <span>{b.product_name}</span>
                  <span className="text-[#d4a24e] font-semibold">{b.total_sold} sold</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bg-[#2c2419] rounded-lg p-4">
          <h2 className="text-[#f2ece2] font-semibold mb-3">Needs Attention</h2>
          {lowStockProducts.length === 0 ? (
            <p className="text-[#8a8177] text-sm">All stock levels healthy</p>
          ) : (
            <ul className="space-y-2">
              {lowStockProducts.map((p) => (
                <li key={p.id} className="flex justify-between text-[#a89d8f] text-sm">
                  <span>{p.name}</span>
                  <span className={p.current_stock === 0 ? 'text-red-400 font-semibold' : 'text-[#d4a24e] font-semibold'}>
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

function StatCard({
  label, value, accent, warn,
}: { label: string; value: string; accent?: boolean; warn?: boolean }) {
  return (
    <div className="bg-[#2c2419] rounded-lg p-4">
      <p className="text-[#8a8177] text-xs uppercase mb-1">{label}</p>
      <p className={`text-2xl font-bold ${warn ? 'text-red-400' : accent ? 'text-[#d4a24e]' : 'text-[#f2ece2]'}`}>
        {value}
      </p>
    </div>
  )
}