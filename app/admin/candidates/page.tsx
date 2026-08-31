'use client'

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react'

type Position = { id: string; title: string }
type Candidate = { id: string; position_id: string; name: string; department?: string | null; display_order: number; is_active: boolean; photo_url?: string | null }
const MAX = 5 * 1024 * 1024
const TYPES = ['image/jpeg', 'image/png', 'image/webp']

export default function CandidatesPage() {
  const [rows, setRows] = useState<Candidate[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [status, setStatus] = useState('OPEN')
  const [editing, setEditing] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [message, setMessage] = useState('')
  const [form, setForm] = useState({ name: '', department: '', positionId: '', displayOrder: '0', isActive: true })
  const locked = !['DRAFT', 'SCHEDULED', 'UPCOMING'].includes(status)

  async function load() {
    const response = await fetch('/api/admin/candidates', { cache: 'no-store' })
    const data = await response.json()
    if (!response.ok) return setMessage(data.error || 'Unable to load candidates.')
    setRows(data.candidates || []); setPositions(data.positions || []); setStatus(data.status || 'OPEN')
    setForm(current => current.positionId ? current : { ...current, positionId: data.positions?.[0]?.id || '' })
  }
  useEffect(() => { void load() }, [])
  const groups = useMemo(() => positions.map(position => ({ position, candidates: rows.filter(row => row.position_id === position.id).sort((a, b) => a.display_order - b.display_order) })), [positions, rows])

  function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0]
    if (!selected) return
    if (!TYPES.includes(selected.type)) return setMessage('Choose a JPG, PNG, or WebP image.')
    if (selected.size > MAX) return setMessage('Images must be 5MB or smaller.')
    setFile(selected); setPreview(URL.createObjectURL(selected)); setMessage('')
  }
  function startEdit(candidate: Candidate) { setEditing(candidate.id); setFile(null); setPreview(candidate.photo_url || ''); setForm({ name: candidate.name, department: candidate.department || '', positionId: candidate.position_id, displayOrder: String(candidate.display_order), isActive: candidate.is_active }) }
  function reset() { setEditing(null); setFile(null); setPreview(''); setForm({ name: '', department: '', positionId: positions[0]?.id || '', displayOrder: '0', isActive: true }) }
  async function uploadPhoto() {
    if (!file) return editing ? rows.find(row => row.id === editing)?.photo_url || null : null
    const body = new FormData(); body.append('file', file)
    const response = await fetch('/api/admin/candidates/photo', { method: 'POST', body })
    const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Photo upload failed.')
    return data.url as string
  }
  async function submit(event: FormEvent) {
    event.preventDefault(); if (locked) return; setMessage('')
    try {
      const photoUrl = await uploadPhoto()
      const response = await fetch('/api/admin/candidates', { method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editing, ...form, displayOrder: Number(form.displayOrder), photoUrl }) })
      const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Unable to save candidate.')
      setMessage(editing ? 'Candidate updated.' : 'Candidate added.'); reset(); await load()
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to save candidate.') }
  }
  async function remove(id: string) { if (locked || !window.confirm('Delete this candidate?')) return; const response = await fetch('/api/admin/candidates', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }); const data = await response.json(); setMessage(data.error || 'Candidate deleted.'); if (response.ok) await load() }
  async function toggle(candidate: Candidate) { if (locked) return; const response = await fetch('/api/admin/candidates', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: candidate.id, name: candidate.name, positionId: candidate.position_id, displayOrder: candidate.display_order, isActive: !candidate.is_active, photoUrl: candidate.photo_url, department: candidate.department }) }); if (!response.ok) setMessage('Unable to update candidate.'); else await load() }

  return <section className="admin-content"><div className="page-heading"><div><p className="eyebrow">ELECTORAL COMMITTEE / CANDIDATES</p><h1>Candidate Management</h1><p className="admin-copy">Manage candidates by position. Changes appear on the voter ballot immediately.</p></div><span className="tag success">{status}</span></div>{locked && <div className="admin-notice">Candidate management is locked while the election is {status.toLowerCase()}.</div>}{message && <p className="form-message">{message}</p>}<div className="admin-panel"><div className="panel-heading"><h2>{editing ? 'Edit candidate' : 'Add candidate'}</h2></div><form className="admin-form" onSubmit={submit}><label>Name<input required disabled={locked} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label><label>Department<input disabled={locked} value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} /></label><label>Position<select required disabled={locked} value={form.positionId} onChange={e => setForm({ ...form, positionId: e.target.value })}>{positions.map(position => <option key={position.id} value={position.id}>{position.title}</option>)}</select></label><label>Display order<input type="number" min="0" disabled={locked} value={form.displayOrder} onChange={e => setForm({ ...form, displayOrder: e.target.value })} /></label><label>Candidate photo<input type="file" accept="image/jpeg,image/png,image/webp" disabled={locked} onChange={selectFile} /><small>JPG, PNG or WebP · maximum 5MB</small>{preview && <img className="candidate-preview" src={preview} alt="Candidate photo preview" />}</label><label className="checkbox-label"><input type="checkbox" disabled={locked} checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} /> Active on ballot</label><div className="row-actions"><button className="primary-button" disabled={locked} type="submit">{editing ? 'Save changes' : 'Add candidate'}</button>{editing && <button type="button" onClick={reset}>Cancel</button>}</div></form></div><div className="candidate-groups">{groups.map(({ position, candidates }) => <div className="admin-panel" key={position.id}><div className="panel-heading"><h2>{position.title}</h2><span className="panel-count">{candidates.length} candidates</span></div>{candidates.length === 0 ? <p className="empty-state">No candidates have been added yet.</p> : <div className="candidate-admin-list">{candidates.map(candidate => <div className="candidate-admin-row" key={candidate.id}>{candidate.photo_url ? <img src={candidate.photo_url} alt="" /> : <span className="candidate-avatar" aria-hidden="true">{candidate.name.charAt(0)}</span>}<div className="candidate-admin-info"><strong>{candidate.name}</strong><span>{candidate.department || 'No department'} · <em className={candidate.is_active ? 'active-text' : 'inactive-text'}>{candidate.is_active ? 'Active' : 'Inactive'}</em></span></div><div className="row-actions"><button disabled={locked} onClick={() => startEdit(candidate)}>Edit</button><button disabled={locked} onClick={() => toggle(candidate)}>{candidate.is_active ? 'Deactivate' : 'Activate'}</button><button className="danger-button" disabled={locked} onClick={() => remove(candidate.id)}>Delete</button></div></div>)}</div>}</div>)}</div></section>
}
