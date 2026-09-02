import type { SupabaseClient } from '@supabase/supabase-js'

export async function getElectionResults(supabase: SupabaseClient) {
  const [{ data: positions, error: positionsError }, { data: candidates, error: candidatesError }, { data: votes, error: votesError }] = await Promise.all([
    supabase.from('positions').select('id,title,display_order').eq('is_active', true).order('display_order'),
    supabase.from('candidates').select('id,position_id,name,department,photo_url,display_order,is_active').eq('is_active', true).order('display_order'),
    supabase.from('votes').select('candidate_id,position_id'),
  ])
  if (positionsError) throw positionsError
  if (candidatesError) throw candidatesError
  if (votesError) throw votesError

  const candidateTotals = new Map<string, number>()
  const positionTotals = new Map<string, number>()
  for (const vote of votes ?? []) {
    candidateTotals.set(vote.candidate_id, (candidateTotals.get(vote.candidate_id) ?? 0) + 1)
    positionTotals.set(vote.position_id, (positionTotals.get(vote.position_id) ?? 0) + 1)
  }

  return (positions ?? []).map(position => {
    const rows = (candidates ?? []).filter(candidate => candidate.position_id === position.id).map(candidate => ({
      ...candidate,
      votes: candidateTotals.get(candidate.id) ?? 0,
    }))
    const positionTotal = positionTotals.get(position.id) ?? 0
    const max = Math.max(0, ...rows.map(row => row.votes))
    const tied = max > 0 && rows.filter(row => row.votes === max).length > 1
    return {
      ...position,
      totalVotes: positionTotal,
      candidates: rows.map(row => ({
        ...row,
        percentage: positionTotal ? Math.round((row.votes / positionTotal) * 10000) / 100 : 0,
        outcome: row.votes === max && max > 0 ? (tied ? 'TIE' : 'WINNER') : '',
      })),
    }
  })
}
