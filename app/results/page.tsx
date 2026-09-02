'use client'

import { useCallback, useEffect, useState } from 'react'

type Candidate = { id: string; name: string; department: string | null; photo_url: string | null; votes: number; percentage: number; outcome: string }
type Result = { id: string; title: string; candidates: Candidate[] }
type ResultsData = { available: boolean; status?: string; message?: string; eligible?: number; votesCast?: number; results?: Result[]; error?: string }

export default function ResultsPage() {
  const [data, setData] = useState<ResultsData | null>(null)
  const [error, setError] = useState('')
  const load = useCallback(async () => {
    setError('')
    try { const response = await fetch('/api/results', { cache: 'no-store' }); const payload = await response.json(); if (!response.ok) throw new Error(payload.error ?? 'Results could not be loaded.'); setData(payload) }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Results could not be loaded.') }
  }, [])
  useEffect(() => { void load() }, [load])
  if (error) return <main className="results-shell"><p className="form-message error">Results could not be loaded. {error}</p><button className="secondary-button" type="button" onClick={() => void load()}>Retry</button></main>
  if (!data) return <main className="results-shell"><p>Loading results…</p></main>
  if (!data.available) return <main className="results-shell"><p className="eyebrow">2026 / 2027 ASSON ELECTION RESULTS</p><h1>Results are not yet available.</h1><p>{data.message ?? 'Results are not yet available.'}</p></main>
  return <main className="results-shell"><p className="eyebrow">2026 / 2027 ASSON ELECTION RESULTS</p><h1>2026 / 2027 ASSON Election Results</h1><p className="results-summary">{data.votesCast} ballots counted · {data.eligible} eligible voters</p>{data.results?.map(position => <section className="results-section" key={position.id}><h2>{position.title}</h2><div className="results-grid">{position.candidates.map(candidate => <article className="result-card" key={candidate.id}>{candidate.photo_url ? <img src={candidate.photo_url} alt={`${candidate.name} candidate photo`} /> : <div className="candidate-avatar" aria-hidden="true">{candidate.name.charAt(0)}</div>}<div><h3>{candidate.name}</h3><p>{candidate.department}</p><strong>{candidate.votes} votes · {candidate.percentage.toFixed(2)}%</strong></div>{candidate.outcome && <span className="result-badge">{candidate.outcome}</span>}</article>)}</div></section>)}</main>
}
