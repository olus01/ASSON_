import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function getAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null }
  const { data: admin } = await supabase.from('admin_profiles').select('user_id').eq('user_id', user.id).eq('is_active', true).maybeSingle()
  return { supabase, user: admin ? user : null }
}

export async function GET() {
  const { supabase, user } = await getAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data, error } = await supabase.from('election_settings').select('id,status,mode,updated_at').eq('id', 1).maybeSingle()
  if (error) return NextResponse.json({ error: 'Unable to load settings.' }, { status: 500 })
  return NextResponse.json({ settings: data })
}

export async function PATCH(request: Request) {
  const { supabase, user } = await getAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json()
  if (body.action === 'publish') {
    if (typeof body.confirmation !== 'string' || body.confirmation.trim().toUpperCase() !== 'PUBLISH RESULTS') return NextResponse.json({ error: 'Type PUBLISH RESULTS to confirm publication.' }, { status: 400 })
    const { data: current } = await supabase.from('election_settings').select('status,mode').eq('id', 1).single()
    if (current?.mode !== 'LIVE' || current?.status !== 'CLOSED') return NextResponse.json({ error: 'Results can only be published from CLOSED in LIVE mode.' }, { status: 409 })
    body.status = 'RESULTS_PUBLISHED'
  }
  if (body.action === 'unpublish') {
    if (typeof body.confirmation !== 'string' || body.confirmation.trim().toUpperCase() !== 'UNPUBLISH RESULTS') return NextResponse.json({ error: 'Type UNPUBLISH RESULTS to confirm.' }, { status: 400 })
    const { data: current } = await supabase.from('election_settings').select('status,mode').eq('id', 1).single()
    if (current?.mode !== 'TEST' || current?.status !== 'RESULTS_PUBLISHED') return NextResponse.json({ error: 'Results can only be unpublished from TEST mode.' }, { status: 409 })
    body.status = 'CLOSED'
  }
  if (body.mode === undefined && body.status === undefined) return NextResponse.json({ error: 'No settings change requested.' }, { status: 400 })
  if (body.mode !== undefined && body.mode !== 'TEST' && body.mode !== 'LIVE') return NextResponse.json({ error: 'Mode must be TEST or LIVE.' }, { status: 400 })
  const update = { ...(body.mode !== undefined ? { mode: body.mode } : {}), ...(body.status !== undefined ? { status: body.status } : {}), updated_at: new Date().toISOString() }
  const { data, error } = await supabase.from('election_settings').update(update).eq('id', 1).select('id,status,mode,updated_at').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  await supabase.from('audit_logs').insert({ actor_id: user.id, action: body.action === 'publish' ? 'Results Published' : body.action === 'unpublish' ? 'Results unpublished' : 'Portal mode updated', entity_type: 'election_settings', entity_id: '1', details: { mode: data.mode, status: data.status } })
  return NextResponse.json({ settings: data })
}
