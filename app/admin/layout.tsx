'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'

const links = [
  ['/admin/dashboard', 'Control Centre'], ['/admin/election', 'Election'], ['/admin/voters', 'Voters'],
  ['/admin/positions', 'Positions'], ['/admin/candidates', 'Candidates'], ['/admin/turnout', 'Turnout'],
  ['/admin/results', 'Results'], ['/admin/audit-logs', 'Audit Logs'], ['/admin/settings', 'Settings'],
]

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [state, setState] = useState<'loading' | 'ready' | 'unauthorized' | 'error'>('loading')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')

  const checkAccess = useCallback(async () => {
    if (pathname === '/admin') return
    setState('loading')
    setError('')
    const supabase = createClient()
    let timeout: ReturnType<typeof setTimeout> | undefined
    try {
      const auth = await Promise.race([
        supabase.auth.getUser(),
        new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error('Supabase authentication timed out.')), 10000) }),
      ])
      const user = auth.data.user
      if (!user) { router.replace('/admin'); return }
      const { data: profile, error: profileError } = await supabase.from('admin_profiles').select('user_id').eq('user_id', user.id).eq('is_active', true).maybeSingle()
      if (profileError) throw profileError
      if (!profile) { setState('unauthorized'); return }
      setEmail(user.email ?? '')
      setState('ready')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Supabase authentication failed.')
      setState('error')
    } finally {
      if (timeout) clearTimeout(timeout)
    }
  }, [pathname, router])

  useEffect(() => { void checkAccess() }, [checkAccess])

  async function signOut() { await createClient().auth.signOut(); router.replace('/admin') }
  if (pathname === '/admin') return children
  if (state === 'loading') return <div className="admin-loading">Checking administrator access…</div>
  if (state === 'error') return <main className="admin-auth-shell"><section className="admin-auth-card"><p className="eyebrow">CONTROL CENTRE</p><h1>Authentication error</h1><p className="form-message error" role="alert">{error}</p><button className="sign-in-button" type="button" onClick={() => void checkAccess()}>Retry</button><a className="back-link" href="/admin">Return to administrator sign in</a></section></main>
  if (state === 'unauthorized') return <main className="admin-auth-shell"><section className="admin-auth-card"><p className="eyebrow">CONTROL CENTRE</p><h1>Unauthorized</h1><p className="admin-auth-copy">Your account does not have an active administrator profile.</p><button className="sign-in-button" type="button" onClick={signOut}>Sign out</button></section></main>

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
