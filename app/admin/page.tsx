'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AdminLogin() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError('')
    const { error } = await createClient().auth.signInWithPassword({ email: email.trim(), password })
    if (error) setError('Unable to sign in. Check your credentials or contact the system administrator.')
    else router.push('/admin/dashboard')
    setLoading(false)
  }

  return <main className="admin-auth-shell"><section className="admin-auth-card"><div className="admin-auth-brand"><span className="admin-logo">A</span><div><strong>ASSON</strong><small>Electoral Committee</small></div></div><p className="eyebrow">CONTROL CENTRE</p><h1>Administrator sign in</h1><p className="admin-auth-copy">Manage the ASSON student election securely from one official workspace.</p><form onSubmit={signIn} className="admin-form"><label htmlFor="admin-email">Email address</label><input id="admin-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="admin@asson.edu.ng" autoComplete="email" /><label htmlFor="admin-password">Password</label><input id="admin-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Enter your password" autoComplete="current-password" /><button className="sign-in-button" disabled={loading}>{loading ? 'Signing in...' : 'Enter control centre'} <span aria-hidden="true">→</span></button>{error && <p className="form-message error" role="alert">{error}</p>}</form><p className="admin-help">First setup: create the user in Supabase Auth, then pair their user ID with an active <code>admin_profiles</code> record.</p><a className="back-link" href="/">← Return to voter portal</a></section></main>
}
