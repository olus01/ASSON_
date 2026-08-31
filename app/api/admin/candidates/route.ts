import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function getAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('admin_profiles').select('user_id').eq('user_id', user.id).eq('is_active', true).maybeSingle()
  return profile ? { supabase, user } : null
}

async function getStatus(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase.from('election_settings').select('status').eq('id', 1).maybeSingle()
  return data?.status ?? 'OPEN'
}

export async function GET() {
  const ctx = await getAdmin()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const [{ data: candidates, error }, { data: positions }, status] = await Promise.all([
    ctx.supabase.from('candidates').select('id,position_id,name,department,display_order,is_active,photo_url').order('display_order'),
    ctx.supabase.from('positions').select('id,title,display_order').eq('is_active', true).order('display_order'),
    getStatus(ctx.supabase),
  ])
  if (error) return NextResponse.json({ error: 'Unable to load candidates.' }, { status: 500 })
  return NextResponse.json({ candidates: candidates ?? [], positions: positions ?? [], status })
}

async function save(request: Request, editing: boolean) {
  const ctx = await getAdmin()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const status = await getStatus(ctx.supabase)
  if (!['DRAFT', 'SCHEDULED', 'UPCOMING'].includes(status)) return NextResponse.json({ error: 'Candidate management is locked while voting is active or concluded.' }, { status: 409 })
  const body = await request.json()
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 160) : ''
  const positionId = typeof body.positionId === 'string' ? body.positionId : ''
  const displayOrder = Number(body.displayOrder ?? 0)
  if (!name || !positionId || !Number.isInteger(displayOrder) || displayOrder < 0) return NextResponse.json({ error: 'Enter a valid name, position, and display order.' }, { status: 400 })
  const values = { name, position_id: positionId, display_order: displayOrder, is_active: body.isActive !== false, photo_url: typeof body.photoUrl === 'string' && body.photoUrl ? body.photoUrl : null, department: typeof body.department === 'string' ? body.department.trim().slice(0, 160) || null : null }
  const result = editing ? await ctx.supabase.from('candidates').update(values).eq('id', body.id).select('id').single() : await ctx.supabase.from('candidates').insert(values).select('id').single()
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 400 })
  await ctx.supabase.from('audit_logs').insert({ actor_id: ctx.user.id, action: editing ? 'Candidate edited' : 'Candidate created', entity_type: 'candidate', entity_id: result.data.id, details: { name } })
  return NextResponse.json({ ok: true, id: result.data.id })
}

export async function POST(request: Request) { return save(request, false) }
export async function PATCH(request: Request) { return save(request, true) }

export async function DELETE(request: Request) {
  const ctx = await getAdmin()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['DRAFT', 'SCHEDULED', 'UPCOMING'].includes(await getStatus(ctx.supabase))) return NextResponse.json({ error: 'Candidate management is locked.' }, { status: 409 })
  const { id } = await request.json()
  const { count } = await ctx.supabase.from('votes').select('id', { count: 'exact', head: true }).eq('candidate_id', id)
  if ((count ?? 0) > 0) return NextResponse.json({ error: 'This candidate has votes and cannot be deleted.' }, { status: 409 })
  const { error } = await ctx.supabase.from('candidates').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  await ctx.supabase.from('audit_logs').insert({ actor_id: ctx.user.id, action: 'Candidate deleted', entity_type: 'candidate', entity_id: id, details: {} })
  return NextResponse.json({ ok: true })
}
