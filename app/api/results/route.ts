import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getElectionResults } from '@/lib/results'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const supabase = createServiceClient()
  try {
  const [{ data: settings, error: settingsError }, { count: eligible }, { count: votesCast }] = await Promise.all([
    supabase.from('election_settings').select('status, mode').eq('id', 1).maybeSingle(),
    supabase.from('voters').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('voters').select('id', { count: 'exact', head: true }).eq('is_active', true).eq('has_voted', true),
  ])
  if (settingsError) throw settingsError
  if (settings?.status !== 'RESULTS_PUBLISHED') return NextResponse.json({ available: false, status: settings?.status ?? 'OPEN', mode: settings?.mode ?? 'LIVE', message: settings?.status === 'CLOSED' ? 'Voting has ended. Official results are awaiting publication by the Electoral Committee.' : 'Results are not yet available.' }, { headers: { 'Cache-Control': 'no-store, max-age=0' } })
  const results = await getElectionResults(supabase)
  return NextResponse.json({ available: true, status: settings.status, eligible: eligible ?? 0, votesCast: votesCast ?? 0, results }, { headers: { 'Cache-Control': 'no-store, max-age=0' } })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Results could not be loaded.' }, { status: 500, headers: { 'Cache-Control': 'no-store, max-age=0' } })
  }
}
