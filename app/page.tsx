'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const logoSource = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logo-JG6WzUlbYiWZnxxdR60WFDolgSEQOo.jpg'

type Position = { id: string; title: string; description: string | null; candidates: Candidate[] }
type Candidate = { id: string; name: string; department: string | null; photo_url: string | null }
type Voter = { id: string; matric_number: string; surname: string; level: string; has_voted: boolean }

function LogoCrop({ label, offset, className = '' }: { label: string; offset: string; className?: string }) {
  return <div className={`logo-crop ${className}`} aria-label={label} role="img"><img src={logoSource} alt="" style={{ left: offset }} /></div>
}

export default function Page() {
  const [showSurname, setShowSurname] = useState(false)
  const [matricNumber, setMatricNumber] = useState('')
  const [surname, setSurname] = useState('')
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'error' | 'success'>('error')
  const [isChecking, setIsChecking] = useState(false)
  const [voter, setVoter] = useState<Voter | null>(null)
  const [positions, setPositions] = useState<Position[]>([])
  const [choices, setChoices] = useState<Record<string, string>>({})
  const [step, setStep] = useState<'login' | 'ballot' | 'review' | 'success'>('login')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function verifyVoter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage(''); setMessageType('error')
    const matric = matricNumber.trim().toUpperCase(); const name = surname.trim().toUpperCase()
    if (!matric || !name) { setMessage('Enter your matriculation number and surname to continue.'); return }
    setIsChecking(true); const supabase = createClient()
    const [{ data: settings, error: settingsError }, { data: found, error: voterError }] = await Promise.all([
      supabase.from('election_settings').select('status').eq('id', 1).maybeSingle(),
      supabase.from('voters').select('id, matric_number, surname, level, has_voted').eq('matric_number', matric).eq('is_active', true).maybeSingle(),
    ])
    if (settingsError || voterError) { setIsChecking(false); setMessage('We could not verify your details. Please try again.'); return }
    if (settings?.status !== 'OPEN') { setIsChecking(false); setMessage('Voting is currently unavailable. Please check back when the election opens.'); return }
    if (!found || found.surname.toUpperCase() !== name) { setIsChecking(false); setMessage('Invalid matriculation number or surname. Please check your details.'); return }
    if (found.has_voted) { setIsChecking(false); setMessage('Your vote has already been recorded.'); return }
    const { data: rawPositions, error: positionsError } = await supabase.from('positions').select('id, title, description, display_order, candidates(id, name, department, photo_url, display_order)').eq('is_active', true).order('display_order')
    setIsChecking(false)
    if (positionsError || !rawPositions?.length) { setMessage('The ballot is not ready yet. Please contact the Electoral Committee.'); return }
    setVoter(found); setPositions(rawPositions.map((position: any) => ({ ...position, candidates: (position.candidates ?? []).sort((a: Candidate & { display_order: number }, b: Candidate & { display_order: number }) => a.display_order - b.display_order) }))); setStep('ballot')
  }

  const selectedCount = Object.keys(choices).length
  const complete = positions.length > 0 && selectedCount === positions.length
  const selectedRows = useMemo(() => positions.map((position) => ({ position, candidate: position.candidates.find((candidate) => candidate.id === choices[position.id]) })).filter((row) => row.candidate), [positions, choices])

  async function submitBallot() {
    if (!voter || !complete) return
    setIsSubmitting(true)
    const response = await fetch('/api/ballot/submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ voterId: voter.id, choices: selectedRows.map(({ position, candidate }) => ({ positionId: position.id, candidateId: candidate!.id })) }) })
    const result = await response.json(); setIsSubmitting(false)
    if (!response.ok) { setMessage(result.error ?? 'We could not submit your ballot. Please try again.'); setMessageType('error'); return }
    setStep('success')
  }

  return <main className="portal-shell">
    <header className="portal-header"><div className="header-brand"><LogoCrop label="ASSON logo" offset="-100%" className="brand-mark" /><div><p className="brand-name">ASSON</p><p className="brand-subtitle">Student Election Portal</p></div></div><div className="secure-label"><span className="secure-dot" aria-hidden="true" /> Secure voting environment</div></header>
    {step === 'login' && <section className="portal-content"><div className="welcome-panel"><div className="election-badge"><LogoCrop label="ASSON Electoral Committee logo" offset="0%" className="committee-mark" /><span>2025 / 2026 Elections</span></div><p className="eyebrow">ASSOCIATION OF STATISTICS STUDENTS</p><h1>Your voice shapes<br /><em>our next chapter.</em></h1><p className="welcome-copy">Cast your vote securely and help elect the leaders who will represent the ASSON community at the Federal University of Technology, Akure.</p><div className="trust-list" aria-label="Portal assurances"><div><span className="trust-icon">✓</span><span><strong>One student, one vote</strong><small>Your ballot is counted once and only once.</small></span></div><div><span className="trust-icon">✓</span><span><strong>Private and confidential</strong><small>Your choices remain anonymous.</small></span></div></div></div><div className="login-card"><div className="login-heading"><p className="eyebrow">VOTER ACCESS</p><h2>Welcome back</h2><p>Sign in with your student credentials to continue.</p></div><form onSubmit={verifyVoter}><label htmlFor="student-id">Matriculation number</label><input id="student-id" value={matricNumber} onChange={(event) => setMatricNumber(event.target.value)} placeholder="e.g. TEST/001" autoComplete="username" /><div className="password-label"><label htmlFor="surname">Surname</label><button type="button" className="text-button" onClick={() => setShowSurname(!showSurname)}>{showSurname ? 'Hide' : 'Show'}</button></div><input id="surname" type={showSurname ? 'text' : 'password'} value={surname} onChange={(event) => setSurname(event.target.value)} placeholder="Enter your surname" autoComplete="family-name" /><button className="sign-in-button" type="submit" disabled={isChecking}>{isChecking ? 'Checking details...' : 'Sign in to vote'} <span aria-hidden="true">→</span></button>{message && <p className={`form-message ${messageType}`} role="alert">{message}</p>}</form><div className="login-divider"><span>Need help?</span></div><p className="help-copy">Contact the Electoral Committee if you are unable to access your account.</p><a className="contact-link" href="mailto:elections@assonfuta.org">Contact support <span aria-hidden="true">↗</span></a></div></section>}
    {step !== 'login' && step !== 'success' && <section className="ballot-wrap"><div className="ballot-top"><div><p className="eyebrow">2025 / 2026 ELECTIONS</p><h1 className="ballot-title">Cast your ballot.</h1><p className="welcome-copy">Select one candidate for each position. Your choices are saved for this session.</p></div><div className="voter-chip"><strong>{voter?.matric_number}</strong><span>{voter?.level} · Verified voter</span></div></div><div className="progress-row"><span>{selectedCount} of {positions.length} positions selected</span><div className="progress-track"><div style={{ width: `${positions.length ? selectedCount / positions.length * 100 : 0}%` }} /></div></div>{step === 'ballot' ? <div className="position-list">{positions.map((position, index) => <fieldset className="position-card" key={position.id}><legend><span className="position-number">{String(index + 1).padStart(2, '0')}</span><span><strong>{position.title}</strong><small>{position.description}</small></span></legend><div className="candidate-grid">{position.candidates.map((candidate) => <label className={`candidate-option ${choices[position.id] === candidate.id ? 'selected' : ''}`} key={candidate.id}><input type="radio" name={position.id} checked={choices[position.id] === candidate.id} onChange={() => setChoices((current) => ({ ...current, [position.id]: candidate.id }))} /><span className="radio-mark" />{candidate.photo_url ? <img className="ballot-candidate-photo" src={candidate.photo_url} alt="" /> : <span className="candidate-avatar" aria-hidden="true">{candidate.name.charAt(0)}</span>}<span><strong>{candidate.name}</strong><small>{candidate.department}</small></span></label>)}</div></fieldset>)}</div> : <div className="review-card"><p className="eyebrow">REVIEW SELECTIONS</p><h2>Check your ballot</h2><p className="welcome-copy">Review each choice before submitting. You cannot change your ballot after confirmation.</p>{selectedRows.map(({ position, candidate }) => <div className="review-row" key={position.id}><span>{position.title}</span><strong>{candidate?.name}</strong></div>)}<p className="form-message warning">Please confirm that these selections are correct.</p></div>}<div className="ballot-actions">{step === 'review' && <button className="secondary-button" onClick={() => setStep('ballot')}>← Edit selections</button>}<button className="sign-in-button" disabled={!complete || isSubmitting} onClick={() => step === 'ballot' ? setStep('review') : submitBallot()}>{isSubmitting ? 'Submitting ballot...' : step === 'ballot' ? 'Review ballot →' : 'Confirm and submit'} </button></div></section>}
    {step === 'success' && <section className="success-screen"><div className="success-icon">✓</div><p className="eyebrow">BALLOT SUBMITTED</p><h1>Your vote has been recorded.</h1><p className="welcome-copy">Thank you for participating in the ASSON 2025 / 2026 elections. Your ballot was submitted securely and cannot be changed.</p><div className="success-note">Keep your participation private. Election results will be announced by the Electoral Committee.</div></section>}
    <footer className="portal-footer"><div className="footer-institution"><LogoCrop label="FUTA logo" offset="-200%" className="futa-mark" /><span>Powered by the Association of Statistics Students<br /><small>Federal University of Technology, Akure</small></span></div><span className="footer-note">© 2025 ASSON Electoral Committee</span></footer>
  </main>
}
