import { useEffect, useState, useRef } from 'react'
import type { Session } from '@supabase/supabase-js'
import {
  LayoutGrid, ShoppingCart, Receipt, Package, ClipboardList,
  Truck, Factory, Users, CreditCard, BarChart3, LogOut, MoreHorizontal, Search, X,
  Settings as SettingsIcon, FileBarChart, Sun, Moon, Bell,
} from 'lucide-react'
import { supabase } from './lib/supabaseClient'
import { getLanguage, setLanguage as saveLanguage, t, type Language } from './i18n'
import { getTheme, setTheme as saveTheme, type Theme } from './theme'
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
  const [lang, setLang] = useState<Language>(getLanguage())
  const [theme, setThemeState] = useState<Theme>(getTheme())

  function toggleLanguage() {
    const next = lang === 'en' ? 'am' : 'en'
    setLang(next)
    saveLanguage(next)
  }

  function toggleTheme() {
    const next = theme === 'light' ? 'dark' : 'light'
    setThemeState(next)
    saveTheme(next)
  }

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
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-page)' }}>
        <p style={{ color: 'var(--text-primary)' }}>Loading...</p>
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
    { key: 'dashboard', label: t('dashboard', lang), icon: LayoutGrid, show: canSeeDashboard },
    { key: 'pos', label: t('pos', lang), icon: ShoppingCart, show: true },
    { key: 'sales', label: t('sales', lang), icon: Receipt, show: canSeeSales },
    { key: 'products', label: t('products', lang), icon: Package, show: true },
    { key: 'inventory', label: t('inventory', lang), icon: ClipboardList, show: canSeeInventory },
    { key: 'purchases', label: t('purchases', lang), icon: Truck, show: canManagePurchasing },
    { key: 'suppliers', label: t('suppliers', lang), icon: Factory, show: canManagePurchasing },
    { key: 'customers', label: t('customers', lang), icon: Users, show: true },
    { key: 'expenses', label: t('expenses', lang), icon: CreditCard, show: canManageExpenses },
    { key: 'reports', label: t('reports', lang), icon: BarChart3, show: canSeeReports },
    { key: 'zreport', label: t('endOfDay', lang), icon: FileBarChart, show: canSeeReports },
    { key: 'settings', label: t('settings', lang), icon: SettingsIcon, show: isAdmin },
  ]

  const visibleNav = navItems.filter((n) => n.show)
  const primaryMobileItems = visibleNav.slice(0, 4)
  const currentLabel = visibleNav.find((n) => n.key === page)?.label ?? ''

  function renderPage() {
    switch (page) {
      case 'dashboard':
        return <Dashboard lang={lang} />
      case 'pos':
        return <POS />
      case 'products':
        return <Products canEdit={canManageProducts} />
      case 'suppliers':
        return <Suppliers />
      case 'purchases':
        return <Purchases />
      case 'sales':
        return <Sales lang={lang} />
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
    <div className="h-screen md:flex overflow-hidden" style={{ background: 'var(--bg-page)' }}>
      <aside
        className="hidden md:flex md:w-56 md:flex-col p-3 h-screen shrink-0"
        style={{ background: 'var(--bg-sidebar)', borderRight: '1px solid var(--border)' }}
      >
        <div className="px-2 py-2 mb-2">
          <button
            onClick={() => setPage('dashboard')}
            className="font-semibold text-sm text-left"
            style={{ color: 'var(--text-primary)', fontFamily: 'Georgia, serif' }}
          >
            Liquor<span className="text-[#a17a1f]">POS</span>
          </button>
        </div>
        <nav className="flex flex-col gap-1 flex-1 overflow-y-auto">
          {visibleNav.map((item) => {
            const Icon = item.icon
            const active = page === item.key
            return (
              <button
                key={item.key}
                onClick={() => setPage(item.key)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors shrink-0"
                style={
                  active
                    ? { background: 'linear-gradient(135deg, #e8c568, #d4a24e)', color: '#5a4a1f', fontWeight: 600 }
                    : { color: 'var(--text-secondary)' }
                }
              >
                <Icon size={16} />
                {item.label}
              </button>
            )
          })}
        </nav>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm shrink-0"
          style={{ color: '#a3413a' }}
        >
          <LogOut size={16} />
          {t('logOut', lang)}
        </button>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 h-screen">
        <div
          className="flex flex-nowrap items-center justify-end px-4 md:px-6 py-3 shrink-0 border-b-2 border-[#d4a24e] gap-3"
          style={{ background: 'var(--header-bg)' }}
        >
          <div className="md:hidden mr-auto">
            <button onClick={() => setPage('dashboard')} className="font-semibold text-sm text-white" style={{ fontFamily: 'Georgia, serif' }}>
              Liquor<span className="text-[#f3dfa8]">POS</span>
            </button>
          </div>

          <div className="hidden md:block">
            <GlobalSearch onNavigate={setPage} placeholder={t('search', lang)} />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <NotificationBell onNavigate={setPage} />
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-full bg-white/15 border border-white/25 text-white"
              title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            >
              {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
            </button>
            <button
              onClick={toggleLanguage}
              className="text-xs px-2 py-1 rounded-full bg-white/15 border border-white/25 text-white font-semibold"
            >
              {lang === 'en' ? 'አማ' : 'EN'}
            </button>
            <button
              onClick={() => setShowMobileSearch(true)}
              className="md:hidden bg-white/15 text-white p-2 rounded-full"
            >
              <Search size={14} />
            </button>
            <AccountMenu profile={profile} email={session.user.email!} onLogout={handleLogout} logOutLabel={t('logOut', lang)} />
          </div>
        </div>

        <div
          className="hidden md:block px-6 py-2 shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{currentLabel}</span>
        </div>

        <div className="flex-1 pb-20 md:pb-0 overflow-y-auto">
          {renderPage()}
        </div>
      </div>

      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 flex items-center justify-around py-2 z-40"
        style={{ background: 'var(--bg-sidebar)', borderTop: '1px solid var(--border)' }}
      >
        {primaryMobileItems.map((item) => {
          const Icon = item.icon
          const active = page === item.key
          return (
            <button
              key={item.key}
              onClick={() => setPage(item.key)}
              className="flex flex-col items-center gap-0.5 px-2"
            >
              <Icon size={18} color={active ? '#a17a1f' : 'var(--text-muted)'} />
              <span className="text-[10px]" style={{ color: active ? '#a17a1f' : 'var(--text-muted)', fontWeight: active ? 600 : 400 }}>
                {item.label}
              </span>
            </button>
          )
        })}
        <button onClick={() => setShowMore(true)} className="flex flex-col items-center gap-0.5 px-2">
          <MoreHorizontal size={18} color="var(--text-muted)" />
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>More</span>
        </button>
      </nav>

      {showMore && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 z-50 flex items-end"
          onClick={() => setShowMore(false)}
        >
          <div
            className="w-full rounded-t-2xl p-4 grid grid-cols-4 gap-4"
            style={{ background: 'var(--bg-sidebar)' }}
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
                  <Icon size={22} color="#a17a1f" />
                  <span className="text-xs text-center" style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {showMobileSearch && (
        <div className="md:hidden fixed inset-0 z-50 p-4" style={{ background: 'var(--bg-page)' }}>
          <div className="flex items-center gap-2 mb-4">
            <div className="flex-1">
              <GlobalSearch
                onNavigate={(p) => { setPage(p); setShowMobileSearch(false) }}
                autoFocus
                placeholder={t('search', lang)}
              />
            </div>
            <button onClick={() => setShowMobileSearch(false)} style={{ color: 'var(--text-muted)' }} className="p-2">
              <X size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

type LowStockAlert = {
  id: string
  name: string
  current_stock: number
  reorder_level: number
}

function NotificationBell({ onNavigate }: { onNavigate: (page: Page) => void }) {
  const [open, setOpen] = useState(false)
  const [alerts, setAlerts] = useState<LowStockAlert[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadAlerts()
    const interval = setInterval(loadAlerts, 60000)
    return () => clearInterval(interval)
  }, [])

  async function loadAlerts() {
    setLoading(true)
    const { data } = await supabase
      .from('products')
      .select('id, name, current_stock, reorder_level')
      .eq('is_active', true)
      .order('current_stock')

    const filtered = (data ?? []).filter((p) => p.current_stock <= p.reorder_level)
    setAlerts(filtered)
    setLoading(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-1.5 rounded-full bg-white/15 border border-white/25 text-white"
      >
        <Bell size={14} />
        {alerts.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-[#8a332e] text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
            {alerts.length > 9 ? '9+' : alerts.length}
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 mt-2 w-72 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            <div className="px-4 py-2 font-semibold text-sm" style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border)' }}>
              Notifications
            </div>
            {loading ? (
              <p className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>Loading...</p>
            ) : alerts.length === 0 ? (
              <p className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>No alerts — all stock levels healthy</p>
            ) : (
              alerts.map((a) => (
                <button
                  key={a.id}
                  onClick={() => { onNavigate('products'); setOpen(false) }}
                  className="w-full text-left px-4 py-2 hover:opacity-80 flex justify-between items-center"
                  style={{ borderBottom: '1px solid var(--border)' }}
                >
                  <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{a.name}</span>
                  <span className={`text-xs font-semibold ${a.current_stock === 0 ? 'text-[#8a332e]' : 'text-[#8a611a]'}`}>
                    {a.current_stock === 0 ? 'Out of stock' : `${a.current_stock} left`}
                  </span>
                </button>
              ))
            )}
          </div>
        </>
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

function GlobalSearch({
  onNavigate, autoFocus, placeholder,
}: { onNavigate: (page: Page) => void; autoFocus?: boolean; placeholder: string }) {
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
    <div className="relative w-64">
      <div className="flex items-center bg-white/15 border border-white/25 rounded-full px-3 py-1.5">
        <Search size={14} className="text-white/80 mr-2 shrink-0" />
        <input
          autoFocus={autoFocus}
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={placeholder}
          className="bg-transparent text-white text-sm outline-none w-full placeholder:text-white/70"
        />
      </div>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute left-0 right-0 mt-2 rounded-lg shadow-lg z-50 py-1 max-h-72 overflow-y-auto"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            {results.map((r, i) => (
              <button
                key={i}
                onClick={() => {
                  onNavigate(r.page)
                  setOpen(false)
                  setQuery('')
                }}
                className="w-full text-left px-4 py-2 hover:opacity-80"
              >
                <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{r.label}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{r.type}{r.sublabel ? ` · ${r.sublabel}` : ''}</p>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function AccountMenu({
  profile, email, onLogout, logOutLabel,
}: { profile: Profile | null; email: string; onLogout: () => void; logOutLabel: string }) {
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
        className="w-8 h-8 rounded-full bg-[#f3dfa8] text-[#5a4a1f] text-xs font-bold flex items-center justify-center ring-2 ring-white/40"
      >
        {initials}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 mt-2 w-48 rounded-lg shadow-lg z-50 py-1"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            <div className="px-4 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
              <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{profile?.full_name ?? email}</p>
              <p className="text-xs uppercase" style={{ color: 'var(--text-muted)' }}>{profile?.role}</p>
            </div>
            <button
              onClick={onLogout}
              className="w-full text-left px-4 py-2 text-sm hover:opacity-80"
              style={{ color: '#a3413a' }}
            >
              {logOutLabel}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default App