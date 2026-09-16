import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[var(--bg-page)] flex items-center justify-center px-4">
      <form
        onSubmit={handleLogin}
        className="bg-[var(--bg-card)] p-8 rounded-xl shadow-lg w-full max-w-sm border border-[var(--border)]"
      >
        <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-6 text-center" style={{ fontFamily: 'Georgia, serif' }}>
          Store Login
        </h1>

        <label className="block text-sm text-[var(--text-secondary)] mb-1">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full mb-4 px-3 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[#d4a24e]"
        />

        <label className="block text-sm text-[var(--text-secondary)] mb-1">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full mb-4 px-3 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[#d4a24e]"
        />

        {error && (
          <p className="text-[#8a332e] text-sm mb-4">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-br from-[#e8c568] to-[#d4a24e] hover:from-[#dcb95c] hover:to-[#c69144] text-[#5a4a1f] font-semibold py-2 rounded-lg transition disabled:opacity-50"
        >
          {loading ? 'Logging in...' : 'Log In'}
        </button>
      </form>
    </div>
  )
}