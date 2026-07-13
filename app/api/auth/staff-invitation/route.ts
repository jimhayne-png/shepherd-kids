import { type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ROLE_LABELS } from '@/lib/staff-permissions';
import { hashSessionToken } from '@/lib/crypto/token';

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// ── GET ?token=xxx — validate invitation token ────────────────────────────────

export async function GET(request: NextRequest) {
  const rawToken = request.nextUrl.searchParams.get('token');
  if (!rawToken) return Response.json({ valid: false, reason: 'missing_token' });

  const tokenHash = hashSessionToken(rawToken);
  const admin = adminClient();

  const { data: inv } = await admin
    .from('church_staff_invitations')
    .select('id, church_id, email, first_name, last_name, role, status, expires_at')
    .eq('invitation_token_hash', tokenHash)
    .maybeSingle();

  type InvRow = {
    id: string; church_id: string; email: string;
    first_name: string; last_name: string;
    role: string; status: string; expires_at: string;
  };
  const i = inv as unknown as InvRow | null;

  if (!i) return Response.json({ valid: false, reason: 'not_found' });
  if (i.status === 'accepted') return Response.json({ valid: false, reason: 'already_accepted' });
  if (i.status === 'revoked')  return Response.json({ valid: false, reason: 'revoked' });
  if (new Date(i.expires_at) < new Date()) return Response.json({ valid: false, reason: 'expired' });

  const { data: church } = await admin
    .from('churches')
    .select('name')
    .eq('id', i.church_id)
    .maybeSingle();

  type ChRow = { name: string };
  const churchName = (church as unknown as ChRow | null)?.name ?? 'Your Church';

  return Response.json({
    valid:      true,
    email:      i.email,
    firstName:  i.first_name,
    lastName:   i.last_name,
    role:       i.role,
    roleLabel:  ROLE_LABELS[i.role] ?? i.role,
    churchName,
  });
}

// ── POST — accept invitation ──────────────────────────────────────────────────
//
// Two flows:
//
//   New-user flow (no Authorization header):
//     Body: { token, displayName, password }
//     Creates a Supabase auth user, then adds them to church_users.
//
//   Existing-user flow (Authorization: Bearer <access_token>):
//     Body: { token }
//     Verifies the signed-in user's email matches the invitation email,
//     then adds them to church_users. No new account is created.

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const rawToken    = String(body?.token       ?? '').trim();

  if (!rawToken) return Response.json({ error: 'Missing invitation token.' }, { status: 400 });

  const tokenHash = hashSessionToken(rawToken);
  const admin = adminClient();

  // Validate token
  const { data: inv } = await admin
    .from('church_staff_invitations')
    .select('id, church_id, email, first_name, last_name, role, status, expires_at')
    .eq('invitation_token_hash', tokenHash)
    .maybeSingle();

  type InvRow = {
    id: string; church_id: string; email: string;
    first_name: string; last_name: string;
    role: string; status: string; expires_at: string;
  };
  const i = inv as unknown as InvRow | null;

  if (!i)                                  return Response.json({ error: 'Invalid invitation token.' }, { status: 400 });
  if (i.status === 'accepted')             return Response.json({ error: 'This invitation has already been accepted. Please sign in.' }, { status: 409 });
  if (i.status === 'revoked')              return Response.json({ error: 'This invitation has been revoked.' }, { status: 400 });
  if (new Date(i.expires_at) < new Date()) return Response.json({ error: 'This invitation has expired. Please ask your administrator to send a new one.' }, { status: 400 });

  // ── Existing-user flow ────────────────────────────────────────────────────
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const accessToken = authHeader.slice(7);
    const { data: { user }, error: authErr } = await admin.auth.getUser(accessToken);

    if (authErr || !user) {
      return Response.json({ error: 'Your session is invalid. Please sign in and try again.' }, { status: 401 });
    }

    // Email must match the invitation
    if (user.email?.toLowerCase() !== i.email.toLowerCase()) {
      return Response.json({
        error: `You are signed in as ${user.email}. This invitation was sent to ${i.email}. Please sign out and sign in with the correct account.`,
      }, { status: 403 });
    }

    // Check not already a member
    const { data: alreadyMember } = await admin
      .from('church_users')
      .select('id')
      .eq('church_id', i.church_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!alreadyMember) {
      const { error: cuErr } = await admin.from('church_users').insert({
        church_id:    i.church_id,
        user_id:      user.id,
        role:         i.role,
        password_set: true,
      });
      if (cuErr) return Response.json({ error: cuErr.message }, { status: 500 });
    }

    await admin
      .from('church_staff_invitations')
      .update({ status: 'accepted', accepted_at: new Date().toISOString() })
      .eq('id', i.id);

    await admin.from('church_audit_logs').insert({
      church_id:    i.church_id,
      actor_id:     user.id,
      actor_email:  i.email,
      action:       'invitation_accepted',
      target_id:    user.id,
      target_email: i.email,
      details:      { role: i.role, invitationId: i.id, flow: 'existing_user' },
    });

    return Response.json({ success: true, alreadyMember: !!alreadyMember });
  }

  // ── New-user flow ─────────────────────────────────────────────────────────
  const displayName = String(body?.displayName ?? '').trim();
  const password    = String(body?.password    ?? '');

  if (!displayName) return Response.json({ error: 'Display name is required.' }, { status: 400 });
  if (!password || password.length < 8) {
    return Response.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
  }

  // Try to create the Supabase auth user
  const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
    email:         i.email,
    password,
    email_confirm: true,
    user_metadata: { full_name: displayName },
  });

  let userId: string;

  if (createErr) {
    if (createErr.message.toLowerCase().includes('already')) {
      // Account exists — they must use the existing-user flow (sign in first)
      return Response.json({
        error: 'An account with this email already exists. Please sign in first, then follow the invitation link again.',
        code:  'existing_account',
      }, { status: 409 });
    }
    return Response.json({ error: createErr.message }, { status: 500 });
  } else {
    userId = newUser.user!.id;
  }

  const { error: cuErr } = await admin.from('church_users').insert({
    church_id:    i.church_id,
    user_id:      userId,
    role:         i.role,
    password_set: true,
  });

  if (cuErr) {
    return Response.json({ error: cuErr.message }, { status: 500 });
  }

  await admin
    .from('church_staff_invitations')
    .update({ status: 'accepted', accepted_at: new Date().toISOString() })
    .eq('id', i.id);

  await admin.from('church_audit_logs').insert({
    church_id:    i.church_id,
    actor_id:     userId,
    actor_email:  i.email,
    action:       'invitation_accepted',
    target_id:    userId,
    target_email: i.email,
    details:      { role: i.role, invitationId: i.id, flow: 'new_user' },
  });

  return Response.json({ success: true });
}
