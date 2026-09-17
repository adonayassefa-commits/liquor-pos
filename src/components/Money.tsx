import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

let cachedRate: number | null = null
let ratePromise: Promise<number> | null = null

async function fetchRate(): Promise<number> {
  if (cachedRate !== null) {
    const r: number = cachedRate
    return r
  }
  if (ratePromise) return ratePromise

  ratePromise = (async () => {
    try {
      const { data } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'usd_exchange_rate')
        .single()
      const rate = data?.value ? Number(data.value) : 130
      cachedRate = rate
      return rate
    } catch {
      cachedRate = 130
      return 130
    }
  })()

  return ratePromise
}

export function invalidateRateCache() {
  cachedRate = null
  ratePromise = null
}

export default function Money({ amount }: { amount: number }) {
  const [rate, setRate] = useState<number | null>(cachedRate)
  const [showUsd, setShowUsd] = useState(false)

  useEffect(() => {
    if (rate === null) {
      fetchRate().then((r) => setRate(r))
    }
  }, [rate])

  const birr = amount.toFixed(2)
  const usd = rate !== null ? (amount / rate).toFixed(2) : null

  return (
    <span className="relative inline-block">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setShowUsd((s) => !s) }}
        className="cursor-pointer hover:underline decoration-dotted"
        title="Click to see USD equivalent"
      >
        {birr} ETB
      </button>
      {showUsd && usd && (
        <>
          <span className="fixed inset-0 z-40" onClick={() => setShowUsd(false)} />
          <span
            className="absolute left-0 top-full mt-1 whitespace-nowrap px-2 py-1 rounded-md text-xs z-50 shadow-lg"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          >
            ≈ ${usd} USD
          </span>
        </>
      )}
    </span>
  )
}