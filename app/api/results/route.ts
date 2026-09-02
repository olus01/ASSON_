import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getElectionResults } from '@/lib/results'

export async function GET() {
  const supabase = await createClient()
  const [{ data: settings }, { count: eligible }, { count: votesCast }] = await Promise.all([
    supabase.from('election_settings').select('status, mode').eq('id', 1).maybeSingle(),
    supabase.from('voters').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('voters').select('id', { count: 'exact', head: true }).eq('is_active', true).eq('has_voted', true),
  ])
  if (settings?.status !== 'RESULTS_PUBLISHED') return NextResponse.json({ available: false, status: settings?.status ?? 'OPEN', mode: settings?.mode ?? 'LIVE', message: settings?.status === 'CLOSED' ? 'Voting has ended. Official results are awaiting publication by the Electoral Committee.' : 'Results are not yet available.' })
  const results = await getElectionResults(supabase)
  return NextResponse.json({ available: true, status: settings?.status, eligible: eligible ?? 0, votesCast: votesCast ?? 0, results })
}
