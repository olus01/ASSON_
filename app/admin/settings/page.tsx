'use client'

import { useEffect, useState } from 'react'

type Mode = 'TEST' | 'LIVE'
type Settings = { id: number; status: string; mode: Mode; updated_at: string }

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [mode, setMode] = useState<Mode>('LIVE')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmation, setConfirmation] = useState('')

  useEffect(() => {
    fetch('/api/admin/settings').then(async (response) => {
      const data = await response.json()
      if (response.ok && data.settings) { setSettings(data.settings); setMode(data.settings.mode ?? 'LIVE') }
      else setMessage(data.error ?? 'Unable to load settings.')
    }).catch(() => setMessage('Unable to load settings.'))
  }, [])

  async function save(event: React.FormEvent) {
    event.preventDefault()
    if (confirmation !== mode) { setMessage(`Type ${mode} exactly to confirm.`); return }
    setSaving(true)
    setMessage('')
    const response = await fetch('/api/admin/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode, confirmation }) })
    const data = await response.json()
    setSaving(false)
    if (!response.ok) { setMessage(data.error ?? 'Unable to save settings.'); return }
    setSettings(data.settings)
    setConfirmation('')
    setMessage(`Portal mode changed to ${mode}.`)
  }

  async function publishResults() {
    const typed = window.prompt('Type PUBLISH RESULTS to confirm publication.')
    if (typed !== 'PUBLISH RESULTS') return
    setSaving(true); setMessage('')
    const response = await fetch('/api/admin/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'publish', confirmation: typed }) })
    const data = await response.json(); setSaving(false)
    if (!response.ok) { setMessage(data.error ?? 'Unable to publish results.'); return }
    setSettings(data.settings); setMessage('Results published successfully.')
  }

  async function unpublishResults() {
    const typed = window.prompt('Type UNPUBLISH RESULTS to confirm.')
    if (typed !== 'UNPUBLISH RESULTS') return
    setSaving(true); setMessage('')
    const response = await fetch('/api/admin/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'unpublish', confirmation: typed }) })
    const data = await response.json(); setSaving(false)
    if (!response.ok) { setMessage(data.error ?? 'Unable to unpublish results.'); return }
    setSettings(data.settings); setMessage('Results unpublished.')
  }

  return <section className="admin-content"><p className="eyebrow">ELECTORAL COMMITTEE</p><h1>Settings</h1><div className="admin-panel"><form className="admin-form" onSubmit={save}><label>Portal mode<select value={mode} onChange={event => setMode(event.target.value as Mode)}><option value="LIVE">LIVE — real voting</option><option value="TEST">TEST — rehearsal mode</option></select></label><label>Type {mode} to confirm<input value={confirmation} onChange={event => setConfirmation(event.target.value)} placeholder={mode} autoComplete="off" /></label><p className="field-help">TEST mode is for rehearsals. LIVE mode is the production voter experience.</p><button className="primary-button" type="submit" disabled={saving}>{saving ? 'SAVING…' : 'SAVE SETTINGS'}</button></form><div className="admin-form publication-actions"><button className="primary-button" type="button" onClick={publishResults} disabled={saving || settings?.status !== 'CLOSED' || mode !== 'LIVE'}>PUBLISH RESULTS</button><button className="secondary-button" type="button" onClick={unpublishResults} disabled={saving || settings?.status !== 'RESULTS_PUBLISHED' || mode !== 'TEST'}>UNPUBLISH RESULTS</button></div>{message && <p className="admin-notice">{message}</p>}</div>{settings && <p className="muted-copy">Election status: {settings.status} · Last updated {new Date(settings.updated_at).toLocaleString()}</p>}</section>
}
