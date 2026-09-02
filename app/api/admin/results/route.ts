'use server'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getElectionResults } from '@/lib/results'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: admin } = await supabase.from('admin_profiles').select('user_id').eq('user_id', user.id).eq('is_active', true).maybeSingle()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const [{ data: settings }, { count: eligible }, { count: votesCast }] = await Promise.all([
    supabase.from('election_settings').select('status').eq('id', 1).maybeSingle(),
    supabase.from('voters').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('voters').select('id', { count: 'exact', head: true }).eq('is_active', true).eq('has_voted', true),
  ])
  const status = settings?.status ?? 'OPEN'
  if (status === 'OPEN') return NextResponse.json({ status, message: 'Candidate results are hidden while voting is in progress.', eligible: eligible ?? 0, votesCast: votesCast ?? 0, results: [] })
  const results = await getElectionResults(supabase)
  return NextResponse.json({ status, message: status === 'CLOSED' ? 'Voting has closed. Results are awaiting publication.' : 'Official results have been published.', eligible: eligible ?? 0, votesCast: votesCast ?? 0, results })
}
