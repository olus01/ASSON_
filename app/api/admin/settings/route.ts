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
  if (body.mode !== 'TEST' && body.mode !== 'LIVE') return NextResponse.json({ error: 'Mode must be TEST or LIVE.' }, { status: 400 })
  const { data, error } = await supabase.from('election_settings').update({ mode: body.mode, updated_at: new Date().toISOString() }).eq('id', 1).select('id,status,mode,updated_at').single()
  if (error) return NextResponse.json({ error: 'Could not save portal mode.' }, { status: 400 })
  await supabase.from('audit_logs').insert({ actor_id: user.id, action: 'Portal mode updated', entity_type: 'election_settings', entity_id: '1', details: { mode: body.mode } })
  return NextResponse.json({ settings: data })
}
