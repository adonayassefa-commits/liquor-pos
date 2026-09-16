import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import {
  LayoutGrid, ShoppingCart, Receipt, Package, ClipboardList,
  Truck, Factory, Users, CreditCard, BarChart3, LogOut, MoreHorizontal,
} from 'lucide-react'
import { supabase } from './lib/supabaseClient'
import Login from './components/Login'
import Products from './components/Products'
import POS from './components/POS'
import Suppliers from './components/Suppliers'
import Purchases from './components/Purchases'
import Dashboard from './components/Dashboard'
import Sales from './components/Sales'
import Inventory from './components/Inventory'
import Reports from './components/Reports'
import Customers from './components/Customers'
import Expenses from './components/Expenses'

type Profile = {
  id: string
  email: string
  full_name: string | null
  role: 'admin' | 'manager' | 'cashier' | 'inventory_staff'
}

type Page =
  | 'dashboard' | 'pos' | 'products' | 'suppliers' | 'purchases'
  | 'sales' | 'inventory' | 'reports' | 'customers' | 'expenses'

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState<Page>('dashboard')
  const [showMore, setShowMore] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (data.session) {
        loadProfile(data.session.user.id)
      } else {
        setLoading(false)
      }
    })

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
        if (session) {
          loadProfile(session.user.id)
        } else {
          setProfile(null)
        }
      }
    )

    return () => listener.subscription.unsubscribe()
  }, [])

  async function loadProfile(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (!error) {
      setProfile(data)
    }
    setLoading(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1c1815] flex items-center justify-center">
        <p className="text-[#f2ece2]">Loading...</p>
      </div>
    )
  }

  if (!session) {
    return <Login />
  }

  const canManageProducts = profile?.role === 'admin' || profile?.role === 'manager'
  const canManagePurchasing =
    profile?.role === 'admin' || profile?.role === 'manager' || profile?.role === 'inventory_staff'
  const canSeeDashboard = profile?.role === 'admin' || profile?.role === 'manager'
  const canSeeSales =
    profile?.role === 'admin' || profile?.role === 'manager' || profile?.role === 'cashier'
  const canSeeInventory =
    profile?.role === 'admin' || profile?.role === 'manager' || profile?.role === 'inventory_staff'
  const canSeeReports = profile?.role === 'admin' || profile?.role === 'manager'
  const canManageExpenses = profile?.role === 'admin' || profile?.role === 'manager'

  const navItems: { key: Page; label: string; icon: any; show: boolean }[] = [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutGrid, show: canSeeDashboard },
    { key: 'pos', label: 'POS', icon: ShoppingCart, show: true },
    { key: 'sales', label: 'Sales', icon: Receipt, show: canSeeSales },
    { key: 'products', label: 'Products', icon: Package, show: true },
    { key: 'inventory', label: 'Inventory', icon: ClipboardList, show: canSeeInventory },
    { key: 'purchases', label: 'Purchases', icon: Truck, show: canManagePurchasing },
    { key: 'suppliers', label: 'Suppliers', icon: Factory, show: canManagePurchasing },
    { key: 'customers', label: 'Customers', icon: Users, show: true },
    { key: 'expenses', label: 'Expenses', icon: CreditCard, show: canManageExpenses },
    { key: 'reports', label: 'Reports', icon: BarChart3, show: canSeeReports },
  ]

  const visibleNav = navItems.filter((n) => n.show)
  const primaryMobileItems = visibleNav.slice(0, 4)
  const currentLabel = visibleNav.find((n) => n.key === page)?.label ?? ''

  function renderPage() {
    switch (page) {
      case 'dashboard':
        return <Dashboard />
      case 'pos':
        return <POS />
      case 'products':
        return <Products canEdit={canManageProducts} />
      case 'suppliers':
        return <Suppliers />
      case 'purchases':
        return <Purchases />
      case 'sales':
        return <Sales />
      case 'inventory':
        return <Inventory />
      case 'reports':
        return <Reports />
      case 'customers':
        return <Customers />
      case 'expenses':
        return <Expenses />
    }
  }

  return (
    <div className="min-h-screen bg-[#1c1815] md:flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-56 md:flex-col bg-[#17130f] p-3">
        <div className="px-2 py-2 mb-2">
          <span className="text-[#f2ece2] font-semibold text-sm">
            Liquor<span className="text-[#d4a24e]">POS</span>
          </span>
        </div>
        <nav className="flex flex-col gap-1 flex-1">
          {visibleNav.map((item) => {
            const Icon = item.icon
            const active = page === item.key
            return (
              <button
                key={item.key}
                onClick={() => setPage(item.key)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                  active
                    ? 'bg-[#d4a24e] text-[#1c1815] font-semibold'
                    : 'text-[#a89d8f] hover:bg-[#2c2419] hover:text-[#f2ece2]'
                }`}
              >
                <Icon size={16} />
                {item.label}
              </button>
            )
          })}
        </nav>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[#c9928c] hover:bg-[#2c2419]"
        >
          <LogOut size={16} />
          Log out
        </button>
      </aside>

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Desktop top bar */}
        <div className="hidden md:flex items-center justify-between px-6 py-3 border-b border-[#33291f]">
          <span className="text-[#f2ece2] text-sm font-medium">{currentLabel}</span>
          <span className="text-[10px] text-[#d4a24e] font-semibold bg-[#2c2419] px-3 py-1 rounded-full">
            {profile?.full_name ?? session.user.email} · {profile?.role?.toUpperCase()}
          </span>
        </div>

        {/* Mobile top bar */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-[#33291f]">
          <div>
            <p className="text-[#f2ece2] font-semibold text-sm">
              Liquor<span className="text-[#d4a24e]">POS</span>
            </p>
            <p className="text-[#8a8177] text-xs">Hi, {profile?.full_name ?? 'there'}</p>
          </div>
          <button
            onClick={handleLogout}
            className="bg-[#963a35] text-[#f2ece2] text-xs px-3 py-1.5 rounded-full font-semibold flex items-center gap-1"
          >
            <LogOut size={12} />
            Log out
          </button>
        </div>

        {/* Page content */}
        <div className="flex-1 pb-20 md:pb-0 overflow-y-auto">
          {renderPage()}
        </div>
      </div>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#17130f] border-t border-[#33291f] flex items-center justify-around py-2 z-40">
        {primaryMobileItems.map((item) => {
          const Icon = item.icon
          const active = page === item.key
          return (
            <button
              key={item.key}
              onClick={() => setPage(item.key)}
              className="flex flex-col items-center gap-0.5 px-2"
            >
              <Icon size={18} color={active ? '#d4a24e' : '#8a8177'} />
              <span className={`text-[10px] ${active ? 'text-[#d4a24e] font-semibold' : 'text-[#8a8177]'}`}>
                {item.label}
              </span>
            </button>
          )
        })}
        <button onClick={() => setShowMore(true)} className="flex flex-col items-center gap-0.5 px-2">
          <MoreHorizontal size={18} color="#8a8177" />
          <span className="text-[10px] text-[#8a8177]">More</span>
        </button>
      </nav>

      {/* Mobile "More" sheet */}
      {showMore && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 z-50 flex items-end"
          onClick={() => setShowMore(false)}
        >
          <div
            className="bg-[#17130f] w-full rounded-t-2xl p-4 grid grid-cols-4 gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            {visibleNav.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.key}
                  onClick={() => { setPage(item.key); setShowMore(false) }}
                  className="flex flex-col items-center gap-1"
                >
                  <Icon size={22} color="#d4a24e" />
                  <span className="text-[#a89d8f] text-xs text-center">{item.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default App