'use server'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getElectionResults } from '@/lib/results'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: admin } = await supabase.from('admin_profiles').select('user_id').eq('user_id', user.id).eq('is_active', true).maybeSingle()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const dataClient = createServiceClient()
  const [{ data: settings }, { count: eligible }, { count: votesCast }] = await Promise.all([
    dataClient.from('election_settings').select('status').eq('id', 1).maybeSingle(),
    dataClient.from('voters').select('id', { count: 'exact', head: true }).eq('is_active', true),
    dataClient.from('voters').select('id', { count: 'exact', head: true }).eq('is_active', true).eq('has_voted', true),
  ])
  if (!settings) return NextResponse.json({ error: 'Election settings could not be loaded.' }, { status: 500 })
  const status = settings?.status ?? 'OPEN'
  if (status === 'OPEN') return NextResponse.json({ status, message: 'Candidate results are hidden while voting is in progress.', eligible: eligible ?? 0, votesCast: votesCast ?? 0, results: [] })
  const results = await getElectionResults(dataClient)
  return NextResponse.json({ status, message: status === 'CLOSED' ? 'Voting has closed. Results are awaiting publication.' : 'Official results have been published.', eligible: eligible ?? 0, votesCast: votesCast ?? 0, results })
}
