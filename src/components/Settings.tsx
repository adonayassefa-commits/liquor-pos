import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

type SettingsMap = Record<string, any>

export default function Settings() {
  const [settings, setSettings] = useState<SettingsMap>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('settings').select('key, value')
    const map: SettingsMap = {}
    for (const row of data ?? []) {
      map[row.key] = row.value
    }
    setSettings(map)
    setLoading(false)
  }

  function update(key: string, value: any) {
    setSettings((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    setError('')

    const { data: userData } = await supabase.auth.getUser()

    const rows = Object.entries(settings).map(([key, value]) => ({
      key,
      value,
      updated_by: userData.user?.id,
      updated_at: new Date().toISOString(),
    }))

    const { error } = await supabase.from('settings').upsert(rows)

    if (error) {
      setError(error.message)
    } else {
      setSaved(true)
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-page)] p-6">
        <p className="text-[var(--text-muted)]">Loading settings...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--bg-page)] p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-[var(--text-primary)]" style={{ fontFamily: 'Georgia, serif' }}>Settings</h1>
        <div className="flex items-center gap-3">
          {saved && <span className="text-[#1f7a3d] text-sm">Saved ✓</span>}
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-gradient-to-br from-[#e8c568] to-[#d4a24e] hover:from-[#dcb95c] hover:to-[#c69144] text-[#5a4a1f] px-4 py-2 rounded-lg font-semibold disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {error && <p className="text-[#8a332e] text-sm mb-4">{error}</p>}

      <div className="space-y-6">
        <Section title="Store Information">
          <Field label="Store Name">
            <input
              value={settings.store_name ?? ''}
              onChange={(e) => update('store_name', e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)]"
            />
          </Field>
          <Field label="Address">
            <input
              value={settings.store_address ?? ''}
              onChange={(e) => update('store_address', e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)]"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone">
              <input
                value={settings.store_phone ?? ''}
                onChange={(e) => update('store_phone', e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)]"
              />
            </Field>
            <Field label="Email">
              <input
                value={settings.store_email ?? ''}
                onChange={(e) => update('store_email', e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)]"
              />
            </Field>
          </div>
        </Section>

        <Section title="Tax">
          <div className="flex items-center gap-2 mb-3">
            <input
              type="checkbox"
              checked={!!settings.tax_enabled}
              onChange={(e) => update('tax_enabled', e.target.checked)}
              className="w-4 h-4"
            />
            <label className="text-[var(--text-primary)] text-sm">Enable tax on sales</label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tax Name">
              <input
                value={settings.tax_name ?? ''}
                onChange={(e) => update('tax_name', e.target.value)}
                disabled={!settings.tax_enabled}
                className="w-full px-3 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] disabled:opacity-50"
              />
            </Field>
            <Field label="Tax Percentage">
              <input
                type="number"
                step="0.01"
                value={settings.tax_percentage ?? 0}
                onChange={(e) => update('tax_percentage', parseFloat(e.target.value) || 0)}
                disabled={!settings.tax_enabled}
                className="w-full px-3 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] disabled:opacity-50"
              />
            </Field>
          </div>
        </Section>

        <Section title="Inventory">
          <Field label="Default Reorder Level (for new products)">
            <input
              type="number"
              value={settings.default_reorder_level ?? 5}
              onChange={(e) => update('default_reorder_level', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)]"
            />
          </Field>
        </Section>

        <Section title="System">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Currency">
              <input
                value={settings.currency ?? ''}
                onChange={(e) => update('currency', e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)]"
              />
            </Field>
            <Field label="Timezone">
              <input
                value={settings.timezone ?? ''}
                onChange={(e) => update('timezone', e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)]"
              />
            </Field>
          </div>
        </Section>

        <Section title="Receipt">
          <Field label="Receipt Footer Message">
            <input
              value={settings.receipt_footer ?? ''}
              onChange={(e) => update('receipt_footer', e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)]"
            />
          </Field>
        </Section>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4 shadow-sm">
      <h2 className="text-[#a17a1f] font-semibold mb-4">{title}</h2>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm text-[var(--text-secondary)] mb-1">{label}</label>
      {children}
    </div>
  )
}