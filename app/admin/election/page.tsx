'use client'

import { useEffect, useState } from 'react'

type Status = 'DRAFT' | 'SCHEDULED' | 'OPEN' | 'CLOSED' | 'RESULTS_PUBLISHED'
const statuses: Status[] = ['DRAFT', 'SCHEDULED', 'OPEN', 'CLOSED', 'RESULTS_PUBLISHED']
const descriptions: Record<Status, string> = {
  DRAFT: 'Configuration is still in progress. Voting is unavailable.',
  SCHEDULED: 'The election is configured but voting has not started.',
  OPEN: 'Voting is currently active for eligible voters.',
  CLOSED: 'Voting has ended. No new ballots can be submitted.',
  RESULTS_PUBLISHED: 'The election is concluded and official results are available.',
}

export default function ElectionPage() {
  const [status, setStatus] = useState<Status>('OPEN')
  const [updatedAt, setUpdatedAt] = useState('')
  const [eligible, setEligible] = useState(0)
  const [votes, setVotes] = useState(0)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)

  async function load() {
    const response = await fetch('/api/admin/election', { cache: 'no-store' })
    if (!response.ok) { setError('Unable to load election settings.'); return }
    const data = await response.json()
    setStatus(data.settings?.status ?? 'OPEN')
    setUpdatedAt(data.settings?.updated_at ?? '')
    setEligible(data.eligible ?? 0)
    setVotes(data.votes ?? 0)
  }

  useEffect(() => { void load() }, [])

  async function changeStatus(next: Status) {
    if (next === status) return
    if (next === 'CLOSED' && status === 'OPEN' && !confirmClose) return setConfirmClose(true)
    if (!window.confirm(`Change election status to ${next}?`)) return
    setSaving(true); setNotice(''); setError('')
    const response = await fetch('/api/admin/election', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: next }) })
    setSaving(false)
    if (!response.ok) { setError('Could not update election status.'); return }
    setStatus(next); setUpdatedAt(new Date().toISOString()); setNotice(`Election status changed to ${next}.`); setConfirmClose(false)
  }

  const turnout = eligible ? Math.round((votes / eligible) * 100) : 0
  return <section className="admin-content">
    <p className="eyebrow">ELECTORAL COMMITTEE</p><h1>Election Management</h1>
    {notice && <p className="admin-notice">{notice}</p>}{error && <p className="form-message error">{error}</p>}
    <div className="admin-grid-two">
      <div className="admin-panel"><div className="panel-heading"><h2>Election Status</h2><span className="tag success">{status}</span></div><p className="admin-copy">{descriptions[status]}</p><div className="status-controls">{statuses.map(item => <button className={item === status ? 'selected' : ''} key={item} disabled={saving} onClick={() => changeStatus(item)}>{item}</button>)}</div>{updatedAt && <p className="admin-help">Last updated {new Date(updatedAt).toLocaleString()}</p>}</div>
      <div className="admin-panel"><div className="panel-heading"><h2>Turnout Snapshot</h2><span>{turnout}%</span></div><div className="metric-grid"><div className="metric-card"><span>Eligible voters</span><strong>{eligible}</strong></div><div className="metric-card"><span>Ballots cast</span><strong>{votes}</strong></div></div><div className="bar"><i style={{ width: `${turnout}%` }} /></div><p className="admin-help">Results remain hidden until the election is closed or published.</p></div>
    </div>
  {status === 'OPEN' && <button className="primary-button close-election-button" disabled={saving} onClick={() => setConfirmClose(true)}>Close Election</button>}{status === 'CLOSED' && <div className="row-actions"><button className="primary-button" disabled={saving} onClick={() => changeStatus('OPEN')}>Reopen Election</button><button onClick={() => window.location.assign('/admin/results')}>View Results</button></div>}{confirmClose && <div className="modal-backdrop" role="presentation"><div className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="close-election-title"><h2 id="close-election-title">Close Election</h2><p>You are about to close voting. No further ballots will be accepted.</p><div className="row-actions"><button onClick={() => setConfirmClose(false)}>Cancel</button><button className="danger-button" disabled={saving} onClick={() => changeStatus('CLOSED')}>Close Election</button></div></div></div>}</section>
}
