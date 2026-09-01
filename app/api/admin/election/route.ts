import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const statuses = ['DRAFT', 'SCHEDULED', 'OPEN', 'CLOSED', 'RESULTS_PUBLISHED'] as const

async function authorized() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null, admin: false }
  const { data: admin } = await supabase.from('admin_profiles').select('user_id, full_name, role').eq('user_id', user.id).eq('is_active', true).maybeSingle()
  return { supabase, user, admin: Boolean(admin) }
}

export async function GET() {
  const { supabase, admin } = await authorized()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const [{ data: settings, error }, { count: eligible }, { count: votes }] = await Promise.all([
    supabase.from('election_settings').select('id, status, mode, updated_at').eq('id', 1).maybeSingle(),
    supabase.from('voters').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('voters').select('id', { count: 'exact', head: true }).eq('is_active', true).eq('has_voted', true),
  ])
  if (error) return NextResponse.json({ error: 'Could not load election settings' }, { status: 500 })
  return NextResponse.json({ settings: settings ?? { id: 1, status: 'OPEN', updated_at: new Date().toISOString() }, eligible: eligible ?? 0, votes: votes ?? 0 })
}

export async function PATCH(request: Request) {
  const { supabase, user, admin } = await authorized()
  if (!user || !admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json().catch(() => null)
  const status = body?.status
  if (typeof status !== 'string' || !statuses.includes(status as (typeof statuses)[number])) return NextResponse.json({ error: 'Invalid election status' }, { status: 400 })
  const { data: current } = await supabase.from('election_settings').select('status, mode').eq('id', 1).maybeSingle()
  const { error } = await supabase.from('election_settings').update({ status, updated_at: new Date().toISOString() }).eq('id', 1)
  if (error) return NextResponse.json({ error: 'Could not save election status' }, { status: 500 })
  await supabase.from('audit_logs').insert({ actor_id: user.id, action: `Election status changed to ${status}`, entity_type: 'election', entity_id: '1', details: { from: current?.status ?? null, to: status } })
  return NextResponse.json({ ok: true })
}
