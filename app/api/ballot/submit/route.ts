import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const voterId = typeof body.voterId === 'string' ? body.voterId : ''
    const choices = Array.isArray(body.choices) ? body.choices : []
    if (!voterId || choices.length === 0 || choices.some((choice: any) => typeof choice.positionId !== 'string' || typeof choice.candidateId !== 'string')) return NextResponse.json({ error: 'A complete ballot is required.' }, { status: 400 })
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
    const { data: settings } = await supabase.from('election_settings').select('status').eq('id', 1).maybeSingle()
    if (settings?.status !== 'OPEN') return NextResponse.json({ error: 'Voting is currently closed.' }, { status: 400 })
    const { data: voter } = await supabase.from('voters').select('id, has_voted').eq('id', voterId).eq('is_active', true).maybeSingle()
    if (!voter || voter.has_voted) return NextResponse.json({ error: 'This voter is not eligible to submit another ballot.' }, { status: 409 })
    const positions = [...new Set(choices.map((choice: any) => choice.positionId))]
    if (positions.length !== choices.length) return NextResponse.json({ error: 'Only one selection is allowed per position.' }, { status: 400 })
    const { data: ballot, error: ballotError } = await supabase.from('ballots').insert({ voter_id: voterId }).select('id').single()
    if (ballotError) return NextResponse.json({ error: 'This ballot could not be created.' }, { status: 409 })
    const { error: votesError } = await supabase.from('votes').insert(choices.map((choice: any) => ({ ballot_id: ballot.id, position_id: choice.positionId, candidate_id: choice.candidateId })))
    if (votesError) { await supabase.from('ballots').delete().eq('id', ballot.id); return NextResponse.json({ error: 'Your selections could not be saved.' }, { status: 400 }) }
    const { error: voterError } = await supabase.from('voters').update({ has_voted: true }).eq('id', voterId).eq('has_voted', false)
    if (voterError) return NextResponse.json({ error: 'Your ballot was saved, but voter status needs review.' }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch { return NextResponse.json({ error: 'Invalid ballot request.' }, { status: 400 }) }
}
