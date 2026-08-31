'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type DashboardData = { status: string; title: string; electionDate: string; registered: number; voted: number; positions: number; activity: { id: string; action: string; entity_type: string; created_at: string }[] }

const emptyData: DashboardData = { status: 'OPEN', title: '2025 / 2026 ASSON elections', electionDate: 'Election date not configured', registered: 0, voted: 0, positions: 0, activity: [] }

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData>(emptyData)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function loadDashboard() {
      setLoading(true)
      const supabase = createClient()
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) return

      const [settings, voters, votes, positions, activity] = await Promise.all([
        supabase.from('election_settings').select('status').eq('id', 1).maybeSingle(),
        supabase.from('voters').select('id,has_voted'),
        supabase.from('votes').select('id'),
        supabase.from('positions').select('id,is_active').eq('is_active', true),
        supabase.from('audit_logs').select('id,action,entity_type,created_at').order('created_at', { ascending: false }).limit(5),
      ])
      if (cancelled) return

      const failed = [settings, voters, votes, positions, activity].some((result) => result.error)
      const voterRows = voters.data ?? []
      setData({
        status: settings.data?.status ?? 'OPEN',
        title: '2025 / 2026 ASSON elections',
        electionDate: 'Election date not configured',
        registered: voterRows.length,
        voted: voterRows.filter((v) => v.has_voted).length || votes.data?.length || 0,
        positions: positions.data?.length ?? 0,
        activity: activity.data ?? [],
      })
      setError(failed ? 'Some optional dashboard data is unavailable. Showing safe defaults.' : '')
      setLoading(false)
    }
    void loadDashboard()
    return () => { cancelled = true }
  }, [])

  if (loading) return <section className="admin-content"><div className="admin-loading">Loading Control Centre…</div></section>
  const turnout = data.registered ? Math.round((data.voted / data.registered) * 100) : 0

  return <section className="admin-content">
    {error && <div className="admin-notice">{error}</div>}
    <div className="admin-banner"><div><span className="live-pill">{data.status}</span><h2>{data.title}</h2><p>Monitor participation and manage election operations from this control centre.</p></div><strong>{data.electionDate}</strong></div>
    <div className="metric-grid"><Metric label="Registered voters" value={data.registered}/><Metric label="Votes cast" value={data.voted}/><Metric label="Turnout" value={`${turnout}%`}/><Metric label="Open positions" value={data.positions}/></div>
    <div className="admin-grid-two"><section className="admin-panel"><div className="panel-heading"><h2>Quick actions</h2></div><div className="quick-actions"><Link href="/admin/voters">Review voter register</Link><Link href="/admin/election">Manage election status</Link><Link href="/admin/results">Open results centre</Link></div></section><section className="admin-panel"><div className="panel-heading"><h2>Recent activity</h2></div>{data.activity.length ? data.activity.map((item) => <div className="activity-row" key={item.id}><i className="activity-dot"/><span>{item.action.replaceAll('_', ' ')}</span><small>{new Date(item.created_at).toLocaleDateString()}</small></div>) : <p className="admin-copy">No recent activity yet.</p>}</section></div>
  </section>
}

function Metric({ label, value }: { label: string; value: number | string }) { return <div className="metric-card"><span>{label}</span><strong>{value}</strong></div> }
