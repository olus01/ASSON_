'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'

const links = [
  ['/admin/dashboard', 'Control Centre'], ['/admin/election', 'Election'], ['/admin/voters', 'Voters'],
  ['/admin/positions', 'Positions'], ['/admin/candidates', 'Candidates'], ['/admin/turnout', 'Turnout'],
  ['/admin/results', 'Results'], ['/admin/audit-logs', 'Audit Logs'], ['/admin/settings', 'Settings'],
]

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [email, setEmail] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.replace('/admin')
      else { setEmail(data.user.email ?? ''); setReady(true) }
    })
  }, [router])

  async function signOut() { await createClient().auth.signOut(); router.replace('/admin') }
  if (!ready) return <div className="admin-loading">Checking administrator access…</div>

  return <div className="admin-shell">
    <aside className="admin-sidebar">
      <Link href="/admin/dashboard" className="admin-side-brand"><span className="admin-logo">A</span><span><strong>ASSON</strong><small>Electoral Committee</small></span></Link>
      <span className="side-label">WORKSPACE</span>
      <nav>{links.map(([href, label]) => <Link key={href} href={href} className={pathname === href ? 'active' : ''}>{label}</Link>)}</nav>
      <div className="admin-side-footer"><span><i className="status-dot" /> System operational</span><span>{email}</span><button onClick={signOut}>Sign out</button></div>
    </aside>
    <main className="admin-main">{children}</main>
  </div>
}
