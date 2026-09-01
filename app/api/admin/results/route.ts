'use server'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
  if (status === 'OPEN') return NextResponse.json({ status, eligible: eligible ?? 0, votesCast: votesCast ?? 0, results: [] })
  const [{ data: positions }, { data: candidates }, { data: votes }] = await Promise.all([
    supabase.from('positions').select('id,title,display_order').eq('is_active', true).order('display_order'),
    supabase.from('candidates').select('id,position_id,name,photo_url,display_order,is_active').eq('is_active', true).order('display_order'),
    supabase.from('votes').select('candidate_id,position_id'),
  ])
  const totals = new Map<string, number>()
  for (const vote of votes ?? []) totals.set(vote.candidate_id, (totals.get(vote.candidate_id) ?? 0) + 1)
  const results = (positions ?? []).map(position => {
    const rows = (candidates ?? []).filter(c => c.position_id === position.id).map(c => ({ ...c, votes: totals.get(c.id) ?? 0 }))
    const max = Math.max(0, ...rows.map(row => row.votes))
    const tied = max > 0 && rows.filter(row => row.votes === max).length > 1
    return { ...position, candidates: rows.map(row => ({ ...row, percentage: votesCast ? Math.round((row.votes / votesCast) * 100) : 0, outcome: row.votes === max && max > 0 ? tied ? 'TIE' : 'WINNER' : '' })) }
  })
  return NextResponse.json({ status, eligible: eligible ?? 0, votesCast: votesCast ?? 0, results })
}
