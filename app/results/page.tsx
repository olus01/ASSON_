'use client'

import { useEffect, useState } from 'react'

type Result = { title: string; candidates: { name: string; department: string | null; photo_url: string | null; votes: number; percentage: number; outcome: string }[] }
export default function ResultsPage() {
  const [data, setData] = useState<{ available: boolean; eligible?: number; votesCast?: number; results?: Result[] } | null>(null)
  useEffect(() => { fetch('/api/results', { cache: 'no-store' }).then(response => response.json()).then(setData).catch(() => setData({ available: false })) }, [])
  if (!data) return <main className="results-shell"><p>Loading results…</p></main>
  if (!data.available) return <main className="results-shell"><p className="eyebrow">ASSON ELECTIONS</p><h1>Results are not available yet.</h1><p>Results will be published after voting closes.</p></main>
  return <main className="results-shell"><p className="eyebrow">ASSON ELECTION RESULTS</p><h1>Election results</h1><p className="results-summary">{data.votesCast} ballots counted · {data.eligible} eligible voters</p>{data.results?.map(position => <section className="results-section" key={position.title}><h2>{position.title}</h2><div className="results-grid">{position.candidates.map(candidate => <article className="result-card" key={candidate.name}>{candidate.photo_url ? <img src={candidate.photo_url} alt="" /> : <div className="candidate-avatar" aria-hidden="true">{candidate.name.charAt(0)}</div>}<div><h3>{candidate.name}</h3><p>{candidate.department}</p><strong>{candidate.votes} votes · {candidate.percentage}%</strong></div>{candidate.outcome && <span className="result-badge">{candidate.outcome}</span>}</article>)}</div></section>)}</main>
}
