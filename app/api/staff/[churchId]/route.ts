import { type NextRequest } from 'next/server';
import { randomBytes } from 'crypto';
import { adminClient, getAuthContextWithRole } from '@/lib/api-auth';
import { can, ROLE_LABELS } from '@/lib/staff-permissions';
import { sendStaffInvitationEmail } from '@/lib/communications/email/sendStaffInvitation';
import { hashSessionToken } from '@/lib/crypto/token';

// ── GET — list staff members + pending invitations + subscription summary ─────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ churchId: string }> },
) {
  const { churchId } = await params;
  const ctx = await getAuthContextWithRole(request);
  if (!ctx || ctx.churchId !== churchId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!can(ctx.role, 'manage_staff')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const admin = adminClient();

  // Staff members
  const { data: cuRows } = await admin
    .from('church_users')
    .select('id, user_id, role, created_at')
    .eq('church_id', churchId);

  type CURow = { id: string; user_id: string; role: string; created_at: string };
  const rows = (cuRows ?? []) as unknown as CURow[];

  // Fetch auth user details in one call
  const { data: usersPage } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const authMap = new Map(
    (usersPage?.users ?? []).map(u => [u.id, u])
  );

  const members = rows.map(r => {
    const au = authMap.get(r.user_id);
    return {
      userId:      r.user_id,
      churchUserId: r.id,
      email:       au?.email ?? '',
      displayName: (au?.user_metadata as Record<string, string> | null)?.full_name ?? '',
      phone:       (au?.user_metadata as Record<string, string> | null)?.phone ?? '',
      role:        r.role,
      roleLabel:   ROLE_LABELS[r.role] ?? r.role,
      lastSignInAt: au?.last_sign_in_at ?? null,
      createdAt:   r.created_at,
    };
  });

  // Pending invitations
  const { data: invRows } = await admin
    .from('church_staff_invitations')
    .select('id, email, first_name, last_name, phone, role, status, expires_at, created_at, invited_by_email')
    .eq('church_id', churchId)
    .in('status', ['pending', 'accepted', 'expired', 'revoked'])
    .order('created_at', { ascending: false })
    .limit(50);

  type InvRow = {
    id: string; email: string; first_name: string; last_name: string;
    phone: string | null; role: string; status: string;
    expires_at: string; created_at: string; invited_by_email: string | null;
  };
  const invitations = ((invRows ?? []) as unknown as InvRow[]).map(r => ({
    id:           r.id,
    email:        r.email,
    firstName:    r.first_name,
    lastName:     r.last_name,
    phone:        r.phone ?? '',
    role:         r.role,
    roleLabel:    ROLE_LABELS[r.role] ?? r.role,
    status:       new Date(r.expires_at) < new Date() && r.status === 'pending' ? 'expired' : r.status,
    expiresAt:    r.expires_at,
    createdAt:    r.created_at,
    invitedBy:    r.invited_by_email ?? '',
  }));

  // Subscription summary for transfer wizard + billing review state
  const { data: sub } = await admin
    .from('church_subscriptions')
    .select('status, stripe_customer_id, current_period_end, billing_review_required, billing_review_requested_at, billing_review_reason')
    .eq('church_id', churchId)
    .maybeSingle();

  const { data: church } = await admin
    .from('churches')
    .select('name, subscription_status, subscription_tier, trial_ends_at')
    .eq('id', churchId)
    .maybeSingle();

  type SubRow = {
    status: string; stripe_customer_id: string | null; current_period_end: string | null;
    billing_review_required: boolean; billing_review_requested_at: string | null;
    billing_review_reason: string | null;
  };
  const s = sub as unknown as SubRow | null;
  type ChurchRow = { name: string; subscription_status: string; subscription_tier: string | null; trial_ends_at: string | null };
  const c = church as unknown as ChurchRow | null;

  const subscription = {
    status:         s?.status ?? c?.subscription_status ?? 'trial',
    tier:           c?.subscription_tier ?? null,
    trialEndsAt:    c?.trial_ends_at ?? null,
    hasStripe:      !!s?.stripe_customer_id,
    periodEnd:      s?.current_period_end ?? null,
    churchName:     c?.name ?? '',
    billingReviewRequired:    s?.billing_review_required ?? false,
    billingReviewRequestedAt: s?.billing_review_requested_at ?? null,
    billingReviewReason:      s?.billing_review_reason ?? null,
  };

  return Response.json({ members, invitations, subscription });
}

// ── POST — send invitation ────────────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ churchId: string }> },
) {
  const { churchId } = await params;
  const ctx = await getAuthContextWithRole(request);
  if (!ctx || ctx.churchId !== churchId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!can(ctx.role, 'invite_staff')) {
    return Response.json({ error: 'Forbidden. Your role cannot invite staff.' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const firstName = String(body?.firstName ?? '').trim();
  const lastName  = String(body?.lastName  ?? '').trim();
  const email     = String(body?.email     ?? '').trim().toLowerCase();
  const phone     = String(body?.phone     ?? '').trim();
  const role      = String(body?.role      ?? '').trim();

  if (!firstName || !lastName || !email || !role) {
    return Response.json({ error: 'firstName, lastName, email, and role are required.' }, { status: 400 });
  }
  if (!['church_admin', 'children_staff', 'checkin_staff'].includes(role)) {
    return Response.json({ error: 'Invalid role.' }, { status: 400 });
  }

  const admin = adminClient();

  // Check if email is already a staff member
  const { data: existing } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const existingUser = existing?.users.find(u => u.email?.toLowerCase() === email);
  if (existingUser) {
    const { data: alreadyMember } = await admin
      .from('church_users')
      .select('id')
      .eq('church_id', churchId)
      .eq('user_id', existingUser.id)
      .maybeSingle();
    if (alreadyMember) {
      return Response.json({ error: 'This person is already a staff member.' }, { status: 409 });
    }
  }

  // Check for duplicate pending invitation
  const { data: dupInv } = await admin
    .from('church_staff_invitations')
    .select('id, status, expires_at')
    .eq('church_id', churchId)
    .eq('email', email)
    .eq('status', 'pending')
    .maybeSingle();

  type InvRow = { id: string; status: string; expires_at: string };
  const dup = dupInv as unknown as InvRow | null;
  if (dup && new Date(dup.expires_at) > new Date()) {
    return Response.json({ error: 'A pending invitation for this email already exists.' }, { status: 409 });
  }

  // Get inviter display name
  const { data: inviterData } = await admin.auth.admin.getUserById(ctx.userId);
  const inviterName  = (inviterData?.user?.user_metadata as Record<string,string> | null)?.full_name ?? inviterData?.user?.email ?? 'Your administrator';
  const inviterEmail = inviterData?.user?.email ?? '';

  // Get church name
  const { data: churchRow } = await admin.from('churches').select('name').eq('id', churchId).maybeSingle();
  type ChRow = { name: string };
  const churchName = (churchRow as unknown as ChRow | null)?.name ?? 'Your Church';

  // Generate secure token — store only the SHA-256 hash; send raw token in email
  const rawToken  = randomBytes(32).toString('hex');
  const tokenHash = hashSessionToken(rawToken);

  const { data: inv, error: invErr } = await admin
    .from('church_staff_invitations')
    .insert({
      church_id:            churchId,
      invited_by_id:        ctx.userId,
      invited_by_email:     inviterEmail,
      email,
      first_name:           firstName,
      last_name:            lastName,
      phone:                phone || null,
      role,
      invitation_token_hash: tokenHash,
      status:               'pending',
    })
    .select('id')
    .single();

  if (invErr) {
    return Response.json({ error: invErr.message }, { status: 500 });
  }

  // Audit log
  await admin.from('church_audit_logs').insert({
    church_id:    churchId,
    actor_id:     ctx.userId,
    actor_email:  inviterEmail,
    action:       'invitation_sent',
    target_email: email,
    details:      { role, firstName, lastName, invitationId: (inv as unknown as { id: string }).id },
  });

  // Send invitation email with raw token
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/$/, '');
  const inviteUrl = `${baseUrl}/auth/accept-staff-invitation?token=${rawToken}`;

  try {
    await sendStaffInvitationEmail({ to: email, firstName, churchName, inviterName, role, inviteUrl });
  } catch (err) {
    console.error('[staff invite] Email send failed:', err);
    // Non-fatal — invitation is created, admin can resend
  }

  return Response.json({ success: true, invitationId: (inv as unknown as { id: string }).id });
}
