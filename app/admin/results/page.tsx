'use client'

import { useCallback, useEffect, useState } from 'react'

type Candidate = { id: string; name: string; department: string | null; photo_url: string | null; votes: number; percentage: number; outcome: string }
type Result = { id: string; title: string; candidates: Candidate[] }
type ResultsData = { status: string; message?: string; eligible: number; votesCast: number; results: Result[] }

export default function ResultsPage() {
  const [data, setData] = useState<ResultsData | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const loadResults = useCallback(async () => {
    setLoading(true); setError('')
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 10000)
    try {
      const response = await fetch('/api/admin/results', { cache: 'no-store', signal: controller.signal })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error ?? 'Results could not be loaded.')
      setData(payload)
    } catch (caught) {
      setError(caught instanceof DOMException && caught.name === 'AbortError' ? 'Results request timed out.' : caught instanceof Error ? caught.message : 'Results could not be loaded.')
    } finally { window.clearTimeout(timeout); setLoading(false) }
  }, [])

  useEffect(() => { void loadResults() }, [loadResults])
  if (loading) return <section className="admin-content"><p>Loading results…</p></section>
  if (error) return <section className="admin-content"><p className="form-message error">Results could not be loaded. {error}</p><button className="secondary-button" type="button" onClick={() => void loadResults()}>Retry</button></section>
  if (!data) return null
  const turnout = data.eligible ? Math.round(data.votesCast / data.eligible * 100) : 0
  return <section className="admin-content"><p className="eyebrow">ELECTORAL COMMITTEE</p><h1>Results</h1><p className="admin-copy">{data.message}</p><div className="metric-grid"><div className="metric-card"><span>Eligible voters</span><strong>{data.eligible}</strong></div><div className="metric-card"><span>Votes cast</span><strong>{data.votesCast}</strong></div><div className="metric-card"><span>Turnout</span><strong>{turnout}%</strong></div></div>{data.status === 'OPEN' || data.status === 'UPCOMING' ? <div className="admin-panel"><h2>RESULTS LOCKED</h2><p className="admin-copy">Results are locked while voting is in progress.</p></div> : <div className="results-groups">{data.results.map(position => <div className="admin-panel" key={position.id}><div className="panel-heading"><h2>{position.title}</h2></div>{position.candidates.length === 0 ? <p className="empty-state">No active candidates.</p> : position.candidates.map(candidate => <div className="candidate-admin-row" key={candidate.id}>{candidate.photo_url ? <img src={candidate.photo_url} alt="" /> : <span className="candidate-avatar">{candidate.name[0]}</span>}<div className="candidate-admin-info"><strong>{candidate.name}</strong><span>{candidate.votes} votes · {candidate.percentage.toFixed(2)}%</span></div>{candidate.outcome && <b className="tag success">{candidate.outcome}</b>}</div>)}</div>)}</div>}</section>
}
