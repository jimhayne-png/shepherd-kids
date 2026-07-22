import { type NextRequest } from 'next/server';
import { getAuthContextWithRole, adminClient } from '@/lib/api-auth';
import { can } from '@/lib/staff-permissions';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ZIP_RE = /^\d{5}(-\d{4})?$/;

function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

const STRING_FIELDS = [
  'parent1_first_name', 'parent1_last_name', 'parent2_first_name', 'parent2_last_name',
  'address', 'address_line2', 'city', 'state',
] as const;
const EMAIL_FIELDS = ['parent1_email', 'parent2_email'] as const;
const PHONE_FIELDS = ['parent1_phone', 'parent2_phone'] as const;

const IS_DEV = process.env.NODE_ENV !== 'production';

// Diagnostic logging for church-context resolution failures. Logs only IDs
// and role metadata — never family names, notes, or contact details.
function viewingContextSource(request: NextRequest): 'master_admin_selected_church' | 'own_membership' {
  return request.headers.get('x-selected-church-id') ? 'master_admin_selected_church' : 'own_membership';
}

async function diagnosticUserId(request: NextRequest): Promise<string | null> {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const { data } = await adminClient().auth.getUser(token);
  return data?.user?.id ?? null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const auth = await getAuthContextWithRole(request);
  if (!auth) {
    const reason = request.headers.get('x-selected-church-id') ? 'CHURCH_CONTEXT_MISMATCH' : 'NO_CHURCH_MEMBERSHIP';
    console.error('[household-record] auth resolution failed', {
      requestedFamilyId: id,
      authenticatedUserId: await diagnosticUserId(request),
      viewingContextSource: viewingContextSource(request),
      reason,
    });
    const body: Record<string, unknown> = { error: 'Unauthorized' };
    if (IS_DEV) body.reason = reason;
    return Response.json(body, { status: 401 });
  }

  const admin = adminClient();

  const { data: family, error } = await admin
    .from('cm_visitor_families')
    .select('*')
    .eq('id', id)
    .eq('church_id', auth.churchId)
    .maybeSingle();

  if (error || !family) {
    console.error('[household-record] family not found', {
      requestedFamilyId: id,
      resolvedChurchId: auth.churchId,
      authenticatedUserId: auth.userId,
      role: auth.role,
      viewingContextSource: viewingContextSource(request),
      reason: 'FAMILY_NOT_FOUND',
    });
    const body: Record<string, unknown> = { error: 'Not found' };
    if (IS_DEV) body.reason = 'FAMILY_NOT_FOUND';
    return Response.json(body, { status: 404 });
  }

  const { data: children } = await admin
    .from('cm_visitor_children')
    .select('id, first_name, last_name, date_of_birth, grade, allergies, medical_notes, special_instructions, authorized_pickups, photo_permission_status')
    .eq('family_id', id)
    .eq('church_id', auth.churchId)
    .order('date_of_birth', { ascending: true });

  const childNames = (children ?? []).map((c: any) => `${c.first_name} ${c.last_name}`);
  let checkinHistory: any[] = [];

  if (childNames.length > 0) {
    const { data: checkins } = await admin
      .from('cm_checkin_records')
      .select('id, child_name, session_id, checked_in_at, room_id')
      .eq('church_id', auth.churchId)
      .in('child_name', childNames)
      .order('checked_in_at', { ascending: false })
      .limit(20);

    const sessionIds = [...new Set((checkins ?? []).map((c: any) => c.session_id as string).filter(Boolean))];
    const sessionMap: Record<string, any> = {};
    if (sessionIds.length > 0) {
      const { data: sessions } = await admin
        .from('cm_checkin_sessions')
        .select('id, service_name, date')
        .in('id', sessionIds);
      for (const s of sessions ?? []) sessionMap[s.id] = s;
    }

    checkinHistory = (checkins ?? []).map((c: any) => ({
      id: c.id,
      child_name: c.child_name,
      checked_in_at: c.checked_in_at,
      service_name: sessionMap[c.session_id]?.service_name ?? null,
      session_date: sessionMap[c.session_id]?.date ?? null,
      room_id: c.room_id,
    }));
  }

  return Response.json({ family, children: children ?? [], checkinHistory, role: auth.role });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await getAuthContextWithRole(request);
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!can(auth.role, 'access_children_ministry')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body) return Response.json({ error: 'Invalid body' }, { status: 400 });
  const admin = adminClient();

  const updateData: Record<string, unknown> = {};
  if ('follow_up_sent' in body) updateData.follow_up_sent = body.follow_up_sent;
  if ('next_day_sent' in body) updateData.next_day_sent = body.next_day_sent;
  if ('status' in body) updateData.status = body.status;
  if ('notes' in body) updateData.notes = body.notes;

  for (const field of STRING_FIELDS) {
    if (field in body) updateData[field] = body[field] ? String(body[field]).trim() : null;
  }
  for (const field of EMAIL_FIELDS) {
    if (field in body) {
      const value = body[field] ? String(body[field]).trim() : '';
      if (value && !EMAIL_RE.test(value)) {
        return Response.json({ error: `Invalid email for ${field}` }, { status: 400 });
      }
      updateData[field] = value || null;
    }
  }
  for (const field of PHONE_FIELDS) {
    if (field in body) {
      const value = body[field] ? String(body[field]).trim() : '';
      if (value && !isValidPhone(value)) {
        return Response.json({ error: `Invalid phone for ${field}` }, { status: 400 });
      }
      updateData[field] = value || null;
    }
  }
  if ('zip' in body) {
    const value = body.zip ? String(body.zip).trim() : '';
    if (value && !ZIP_RE.test(value)) {
      return Response.json({ error: 'Invalid ZIP code' }, { status: 400 });
    }
    updateData.zip = value || null;
  }
  if ('preferred_language' in body) {
    updateData.preferred_language = body.preferred_language ? String(body.preferred_language).trim() : null;
  }

  // The address editor always submits address/city/state/zip together, so any
  // request touching one of these fields is treated as a full address write:
  // line 1 is required whenever any of them is present, and city/state/zip
  // are required whenever line 1 is present. This never fires for requests
  // that don't touch address fields at all (e.g. parent-only edits).
  const addressFieldsTouched = ['address', 'city', 'state', 'zip'].some(f => f in updateData);
  if (addressFieldsTouched && !updateData.address) {
    return Response.json({ error: 'Address line 1 is required' }, { status: 400 });
  }
  if (updateData.address && (!updateData.city || !updateData.state || !updateData.zip)) {
    return Response.json({ error: 'City, state, and ZIP are required when an address is provided' }, { status: 400 });
  }

  const { data, error } = await admin
    .from('cm_visitor_families')
    .update(updateData)
    .eq('id', id)
    .eq('church_id', auth.churchId)
    .select('*')
    .single();

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ family: data });
}
