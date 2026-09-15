import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
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
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <p className="text-white">Loading...</p>
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
    <div>
      <div className="bg-slate-800 px-6 py-3 flex items-center justify-between border-b border-slate-700">
        <div className="flex items-center gap-6">
          <h1 className="text-white font-bold">Liquor POS</h1>
          <nav className="flex gap-4 flex-wrap">
            {canSeeDashboard && (
              <button onClick={() => setPage('dashboard')}
                className={`text-sm ${page === 'dashboard' ? 'text-purple-400 font-semibold' : 'text-slate-300'}`}>
                Dashboard
              </button>
            )}
            <button onClick={() => setPage('pos')}
              className={`text-sm ${page === 'pos' ? 'text-purple-400 font-semibold' : 'text-slate-300'}`}>
              POS
            </button>
            {canSeeSales && (
              <button onClick={() => setPage('sales')}
                className={`text-sm ${page === 'sales' ? 'text-purple-400 font-semibold' : 'text-slate-300'}`}>
                Sales
              </button>
            )}
            <button onClick={() => setPage('products')}
              className={`text-sm ${page === 'products' ? 'text-purple-400 font-semibold' : 'text-slate-300'}`}>
              Products
            </button>
            {canSeeInventory && (
              <button onClick={() => setPage('inventory')}
                className={`text-sm ${page === 'inventory' ? 'text-purple-400 font-semibold' : 'text-slate-300'}`}>
                Inventory
              </button>
            )}
            {canManagePurchasing && (
              <>
                <button onClick={() => setPage('purchases')}
                  className={`text-sm ${page === 'purchases' ? 'text-purple-400 font-semibold' : 'text-slate-300'}`}>
                  Purchases
                </button>
                <button onClick={() => setPage('suppliers')}
                  className={`text-sm ${page === 'suppliers' ? 'text-purple-400 font-semibold' : 'text-slate-300'}`}>
                  Suppliers
                </button>
              </>
            )}
            <button onClick={() => setPage('customers')}
              className={`text-sm ${page === 'customers' ? 'text-purple-400 font-semibold' : 'text-slate-300'}`}>
              Customers
            </button>
            {canManageExpenses && (
              <button onClick={() => setPage('expenses')}
                className={`text-sm ${page === 'expenses' ? 'text-purple-400 font-semibold' : 'text-slate-300'}`}>
                Expenses
              </button>
            )}
            {canSeeReports && (
              <button onClick={() => setPage('reports')}
                className={`text-sm ${page === 'reports' ? 'text-purple-400 font-semibold' : 'text-slate-300'}`}>
                Reports
              </button>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-slate-300 text-sm">
            {profile?.full_name ?? session.user.email} ·{' '}
            <span className="text-purple-400 uppercase">{profile?.role}</span>
          </span>
          <button onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded text-sm">
            Log Out
          </button>
        </div>
      </div>
      {renderPage()}
    </div>
  )
}

export default App