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
    <div className="min-h-screen bg-[#1c1815] flex items-center justify-center px-4">
      <form
        onSubmit={handleLogin}
        className="bg-[#2c2419] p-8 rounded-lg shadow-lg w-full max-w-sm"
      >
        <h1 className="text-2xl font-bold text-[#f2ece2] mb-6 text-center">
          Store Login
        </h1>

        <label className="block text-sm text-[#a89d8f] mb-1">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full mb-4 px-3 py-2 rounded bg-[#3a2f22] text-[#f2ece2] outline-none focus:ring-2 focus:ring-[#d4a24e]"
        />

        <label className="block text-sm text-[#a89d8f] mb-1">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full mb-4 px-3 py-2 rounded bg-[#3a2f22] text-[#f2ece2] outline-none focus:ring-2 focus:ring-[#d4a24e]"
        />

        {error && (
          <p className="text-red-400 text-sm mb-4">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#d4a24e] hover:bg-[#c69144] text-[#1c1815] font-semibold py-2 rounded transition disabled:opacity-50"
        >
          {loading ? 'Logging in...' : 'Log In'}
        </button>
      </form>
    </div>
  )
}