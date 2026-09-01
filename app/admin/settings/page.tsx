'use client'

import { useEffect, useState } from 'react'

type Mode = 'TEST' | 'LIVE'
type Settings = { id: number; status: string; mode: Mode; updated_at: string }

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [mode, setMode] = useState<Mode>('LIVE')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/admin/settings').then(async (response) => {
      const data = await response.json()
      if (response.ok && data.settings) { setSettings(data.settings); setMode(data.settings.mode ?? 'LIVE') }
      else setMessage(data.error ?? 'Unable to load settings.')
    }).catch(() => setMessage('Unable to load settings.'))
  }, [])

  async function save(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    const response = await fetch('/api/admin/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode }) })
    const data = await response.json()
    setSaving(false)
    if (!response.ok) { setMessage(data.error ?? 'Unable to save settings.'); return }
    setSettings(data.settings)
    setMessage(`Portal mode changed to ${mode}.`)
  }

  return <section className="admin-content"><p className="eyebrow">ELECTORAL COMMITTEE</p><h1>Settings</h1><div className="admin-panel"><form className="admin-form" onSubmit={save}><label>Portal mode<select value={mode} onChange={event => setMode(event.target.value as Mode)}><option value="LIVE">LIVE — real voting</option><option value="TEST">TEST — rehearsal mode</option></select></label><p className="field-help">TEST mode is for rehearsals. LIVE mode is the production voter experience.</p><button className="primary-button" type="submit" disabled={saving}>{saving ? 'SAVING…' : 'SAVE SETTINGS'}</button></form>{message && <p className="admin-notice">{message}</p>}</div>{settings && <p className="muted-copy">Election status: {settings.status} · Last updated {new Date(settings.updated_at).toLocaleString()}</p>}</section>
}
