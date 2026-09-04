import type { SupabaseClient } from '@supabase/supabase-js'

const VOTE_PAGE_SIZE = 1000

type VoteRow = { candidate_id: string; position_id: string }

async function getAllVotes(supabase: SupabaseClient) {
  const rows: VoteRow[] = []
  for (let from = 0; ; from += VOTE_PAGE_SIZE) {
    const { data, error } = await supabase
      .from('votes')
      .select('candidate_id,position_id')
      .range(from, from + VOTE_PAGE_SIZE - 1)
    if (error) throw error
    rows.push(...(data ?? []))
    if (!data || data.length < VOTE_PAGE_SIZE) return rows
  }
}

export async function getElectionResults(supabase: SupabaseClient) {
  const [{ data: positions, error: positionsError }, { data: candidates, error: candidatesError }, { data: settings, error: settingsError }, votes] = await Promise.all([
    supabase.from('positions').select('id,title,display_order').eq('is_active', true).order('display_order'),
    supabase.from('candidates').select('id,position_id,name,department,photo_url,display_order,is_active').eq('is_active', true).order('display_order'),
    supabase.from('election_settings').select('id,status,mode').eq('id', 1).maybeSingle(),
    getAllVotes(supabase),
  ])
  if (positionsError) throw positionsError
  if (candidatesError) throw candidatesError
  if (settingsError) throw settingsError
  if (!settings) throw new Error('Election settings could not be loaded.')

  const activePositionIds = new Set((positions ?? []).map(position => position.id))
  const activeVotes = votes.filter(vote => activePositionIds.has(vote.position_id))

  const candidateTotals = new Map<string, number>()
  const positionTotals = new Map<string, number>()
  for (const vote of activeVotes) {
    candidateTotals.set(vote.candidate_id, (candidateTotals.get(vote.candidate_id) ?? 0) + 1)
    positionTotals.set(vote.position_id, (positionTotals.get(vote.position_id) ?? 0) + 1)
  }

  return (positions ?? []).map(position => {
    const rows = (candidates ?? []).filter(candidate => candidate.position_id === position.id && activePositionIds.has(candidate.position_id)).map(candidate => ({
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
