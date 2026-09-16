import { useEffect, useState, useRef } from 'react'
import type { Session } from '@supabase/supabase-js'
import {
  LayoutGrid, ShoppingCart, Receipt, Package, ClipboardList,
  Truck, Factory, Users, CreditCard, BarChart3, LogOut, MoreHorizontal, Search, X,
  Settings as SettingsIcon, FileBarChart,
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
import Settings from './components/Settings'
import ZReport from './components/ZReport'

type Profile = {
  id: string
  email: string
  full_name: string | null
  role: 'admin' | 'manager' | 'cashier' | 'inventory_staff'
}

type Page =
  | 'dashboard' | 'pos' | 'products' | 'suppliers' | 'purchases'
  | 'sales' | 'inventory' | 'reports' | 'customers' | 'expenses' | 'settings' | 'zreport'

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState<Page>('dashboard')
  const [showMore, setShowMore] = useState(false)
  const [showMobileSearch, setShowMobileSearch] = useState(false)

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
  const isAdmin = profile?.role === 'admin'

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
    { key: 'zreport', label: 'End of Day', icon: FileBarChart, show: canSeeReports },
    { key: 'settings', label: 'Settings', icon: SettingsIcon, show: isAdmin },
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
      case 'settings':
        return <Settings />
      case 'zreport':
        return <ZReport />
    }
  }

  return (
    <div className="h-screen bg-[#1c1815] md:flex overflow-hidden">
      <aside className="hidden md:flex md:w-56 md:flex-col bg-[#17130f] p-3 h-screen shrink-0">
        <div className="px-2 py-2 mb-2">
          <span className="text-[#f2ece2] font-semibold text-sm">
            Liquor<span className="text-[#d4a24e]">POS</span>
          </span>
        </div>
        <nav className="flex flex-col gap-1 flex-1 overflow-y-auto">
          {visibleNav.map((item) => {
            const Icon = item.icon
            const active = page === item.key
            return (
              <button
                key={item.key}
                onClick={() => setPage(item.key)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors shrink-0 ${
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
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[#c9928c] hover:bg-[#2c2419] shrink-0"
        >
          <LogOut size={16} />
          Log out
        </button>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 h-screen">
        <div className="hidden md:flex items-center justify-between px-6 py-3 border-b border-[#33291f] shrink-0">
          <span className="text-[#f2ece2] text-sm font-medium">{currentLabel}</span>
          <div className="flex items-center gap-3">
            <GlobalSearch onNavigate={setPage} />
            <AccountMenu profile={profile} email={session.user.email!} onLogout={handleLogout} />
          </div>
        </div>

        <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-[#33291f] shrink-0">
          <div>
            <p className="text-[#f2ece2] font-semibold text-sm">
              Liquor<span className="text-[#d4a24e]">POS</span>
            </p>
            <p className="text-[#8a8177] text-xs">Hi, {profile?.full_name ?? 'there'}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowMobileSearch(true)}
              className="bg-[#2c2419] text-[#f2ece2] p-2 rounded-full"
            >
              <Search size={14} />
            </button>
            <button
              onClick={handleLogout}
              className="bg-[#963a35] text-[#f2ece2] text-xs px-3 py-1.5 rounded-full font-semibold flex items-center gap-1"
            >
              <LogOut size={12} />
              Log out
            </button>
          </div>
        </div>

        <div className="flex-1 pb-20 md:pb-0 overflow-y-auto">
          {renderPage()}
        </div>
      </div>

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

      {showMobileSearch && (
        <div className="md:hidden fixed inset-0 bg-[#1c1815] z-50 p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex-1">
              <GlobalSearch
                onNavigate={(p) => { setPage(p); setShowMobileSearch(false) }}
                autoFocus
              />
            </div>
            <button onClick={() => setShowMobileSearch(false)} className="text-[#8a8177] p-2">
              <X size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

type SearchResult = {
  type: 'Product' | 'Customer'
  label: string
  sublabel: string
  page: Page
}

function GlobalSearch({ onNavigate, autoFocus }: { onNavigate: (page: Page) => void; autoFocus?: boolean }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [open, setOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleChange(value: string) {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (value.trim().length < 2) {
      setResults([])
      setOpen(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      const [{ data: products }, { data: customers }] = await Promise.all([
        supabase
          .from('products')
          .select('id, name, sku')
          .eq('is_active', true)
          .ilike('name', `%${value}%`)
          .limit(5),
        supabase
          .from('customers')
          .select('id, name, phone')
          .ilike('name', `%${value}%`)
          .limit(5),
      ])

      const combined: SearchResult[] = [
        ...(products ?? []).map((p) => ({
          type: 'Product' as const,
          label: p.name,
          sublabel: p.sku ?? '',
          page: 'products' as Page,
        })),
        ...(customers ?? []).map((c) => ({
          type: 'Customer' as const,
          label: c.name,
          sublabel: c.phone ?? '',
          page: 'customers' as Page,
        })),
      ]
      setResults(combined)
      setOpen(combined.length > 0)
    }, 300)
  }

  return (
    <div className="relative w-56">
      <div className="flex items-center bg-[#2c2419] rounded-full px-3 py-1.5">
        <Search size={14} className="text-[#8a8177] mr-2 shrink-0" />
        <input
          autoFocus={autoFocus}
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search products, customers..."
          className="bg-transparent text-[#f2ece2] text-sm outline-none w-full placeholder:text-[#8a8177]"
        />
      </div>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 mt-2 bg-[#2c2419] border border-[#33291f] rounded-lg shadow-lg z-50 py-1 max-h-72 overflow-y-auto">
            {results.map((r, i) => (
              <button
                key={i}
                onClick={() => {
                  onNavigate(r.page)
                  setOpen(false)
                  setQuery('')
                }}
                className="w-full text-left px-4 py-2 hover:bg-[#3a2f22]"
              >
                <p className="text-[#f2ece2] text-sm">{r.label}</p>
                <p className="text-[#8a8177] text-xs">{r.type}{r.sublabel ? ` · ${r.sublabel}` : ''}</p>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function AccountMenu({
  profile, email, onLogout,
}: { profile: Profile | null; email: string; onLogout: () => void }) {
  const [open, setOpen] = useState(false)
  const initials = (profile?.full_name ?? email)
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-8 h-8 rounded-full bg-[#d4a24e] text-[#1c1815] text-xs font-bold flex items-center justify-center"
      >
        {initials}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-48 bg-[#2c2419] border border-[#33291f] rounded-lg shadow-lg z-50 py-1">
            <div className="px-4 py-2 border-b border-[#33291f]">
              <p className="text-[#f2ece2] text-sm font-medium truncate">{profile?.full_name ?? email}</p>
              <p className="text-[#8a8177] text-xs uppercase">{profile?.role}</p>
            </div>
            <button
              onClick={onLogout}
              className="w-full text-left px-4 py-2 text-sm text-[#c9928c] hover:bg-[#3a2f22]"
            >
              Log out
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default App