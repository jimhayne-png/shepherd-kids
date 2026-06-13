import { type NextRequest } from 'next/server';
import { getAuthContext, adminClient } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { churchId } = ctx;

  const url    = new URL(req.url);
  const childId = url.searchParams.get('childId');
  const status  = url.searchParams.get('status');

  const admin = adminClient();
  let query = admin
    .from('cm_certificates')
    .select('*')
    .eq('church_id', churchId)
    .order('created_at', { ascending: false });

  if (childId) query = query.eq('child_id', childId);
  if (status)  query = query.eq('status', status);

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 400 });

  return Response.json({ certificates: data ?? [] });
}

export async function POST(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { userId, churchId } = ctx;

  const body = await req.json();

  if (!body.child_name) {
    return Response.json({ error: 'child_name is required' }, { status: 400 });
  }

  const admin = adminClient();
  const { data, error } = await admin
    .from('cm_certificates')
    .insert({
      church_id:      churchId,
      child_id:       body.child_id       ?? null,
      cert_type:      body.cert_type      ?? 'birthday',
      template:       body.template       ?? 'purple',
      child_name:     body.child_name,
      church_name:    body.church_name    ?? null,
      church_tagline: body.church_tagline ?? null,
      minister_name:  body.minister_name  ?? null,
      minister_title: body.minister_title ?? null,
      verse:          body.verse          ?? null,
      reference:      body.reference      ?? null,
      translation:    body.translation    ?? 'kjv',
      blessing:       body.blessing       ?? null,
      presentation_date: body.presentation_date ?? null,
      parent_email:   body.parent_email   ?? null,
      status:         body.status         ?? 'draft',
      created_by:     userId,
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ certificate: data }, { status: 201 });
}
