import { type NextRequest } from 'next/server';
import { getAuthContext, adminClient } from '@/lib/api-auth';

const VALID_STATUSES = [
  'draft', 'ready_to_print', 'printed', 'presented',
  'email_scheduled', 'email_sent', 'archived',
];

const CONTENT_FIELDS = [
  'cert_type', 'template', 'child_name', 'church_name', 'church_tagline',
  'minister_name', 'minister_title', 'verse', 'reference', 'translation',
  'blessing', 'presentation_date', 'parent_email',
];

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ctx = await getAuthContext(req);
  if (!ctx) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { churchId } = ctx;

  const admin = adminClient();
  const { data, error } = await admin
    .from('cm_certificates')
    .select('*')
    .eq('id', id)
    .eq('church_id', churchId)
    .single();

  if (error || !data) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json({ certificate: data });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ctx = await getAuthContext(req);
  if (!ctx) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { userId, churchId } = ctx;

  const body  = await req.json();
  const admin = adminClient();
  const now   = new Date().toISOString();

  const { data: current } = await admin
    .from('cm_certificates')
    .select('status, reprint_count')
    .eq('id', id)
    .eq('church_id', churchId)
    .single();

  if (!current) return Response.json({ error: 'Not found' }, { status: 404 });

  const updates: Record<string, unknown> = { updated_at: now };

  // ── Status transition ────────────────────────────────────────────────────
  if (body.status && body.status !== current.status) {
    if (!VALID_STATUSES.includes(body.status)) {
      return Response.json({ error: `Invalid status: ${body.status}` }, { status: 400 });
    }
    updates.status = body.status;

    if (body.status === 'printed') {
      updates.printed_by = userId;
      updates.printed_at = now;
    }
    if (body.status === 'presented') {
      updates.presented_by = userId;
      updates.presented_at = now;
    }
    if (body.status === 'email_scheduled') {
      updates.parent_email_scheduled_at = now;
      if (body.email_scheduled_for) updates.email_scheduled_for = body.email_scheduled_for;
    }
    if (body.status === 'email_sent') {
      updates.parent_email_sent_at = now;
    }
  }

  // ── Reprint ──────────────────────────────────────────────────────────────
  if (body.reprint) {
    updates.reprint_count = (current.reprint_count ?? 0) + 1;
  }

  // ── Content field updates (allowed in any non-archived status) ───────────
  for (const field of CONTENT_FIELDS) {
    if (field in body) updates[field] = body[field];
  }

  const { data, error } = await admin
    .from('cm_certificates')
    .update(updates)
    .eq('id', id)
    .eq('church_id', churchId)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ certificate: data });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ctx = await getAuthContext(req);
  if (!ctx) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { churchId } = ctx;

  const admin = adminClient();
  const { error } = await admin
    .from('cm_certificates')
    .delete()
    .eq('id', id)
    .eq('church_id', churchId);

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ success: true });
}
