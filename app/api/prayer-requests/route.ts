import { createClient } from '@supabase/supabase-js';
import { type NextRequest } from 'next/server';
import { Resend } from 'resend';

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function getAuthUser(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user } } = await adminClient().auth.getUser(token);
  return user ?? null;
}

async function getChurchId(userId: string) {
  const { data } = await adminClient()
    .from('church_users')
    .select('church_id')
    .eq('user_id', userId)
    .maybeSingle();
  return data?.church_id ?? null;
}

async function getChurchDetails(churchId: string) {
  const { data } = await adminClient()
    .from('churches')
    .select('name, pastor_email')
    .eq('id', churchId)
    .maybeSingle();
  return data ?? null;
}

async function getPrayerTeamEmails(churchId: string): Promise<string[]> {
  const { data } = await adminClient()
    .from('prayer_team_members')
    .select('members(email)')
    .eq('church_id', churchId);
  if (!data) return [];
  return data
    .map((r: any) => r.members?.email)
    .filter((e: string | null) => !!e) as string[];
}

async function sendPrayerEmails(opts: {
  privacyLevel: string;
  memberName: string | null;
  requestText: string;
  isUrgent: boolean;
  churchName: string;
  pastorEmail: string | null;
  prayerTeamEmails: string[];
}) {
  const { privacyLevel, memberName, requestText, isUrgent, churchName, pastorEmail, prayerTeamEmails } = opts;
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey || !pastorEmail) return;

  const resend = new Resend(resendKey);
  const displayName = memberName ?? 'Anonymous Member';

  const subjectMap: Record<string, string> = {
    anonymous: 'A member has submitted a prayer request',
    private: `${displayName} has submitted a prayer request`,
    prayer_team: `${displayName} requests prayer team support`,
    congregation: `New congregation prayer request from ${displayName}`,
  };

  const subject = subjectMap[privacyLevel] ?? 'New prayer request';

  const recipientMap: Record<string, string[]> = {
    anonymous: [pastorEmail],
    private: [pastorEmail],
    prayer_team: [pastorEmail, ...prayerTeamEmails],
    congregation: [pastorEmail, ...prayerTeamEmails],
  };

  const recipients = [...new Set(recipientMap[privacyLevel] ?? [pastorEmail])].filter(Boolean);

  const htmlBody = `
    <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; background: #f9f7f4; padding: 32px; border-radius: 12px;">
      <div style="background: #1A4A2E; padding: 24px; border-radius: 8px; text-align: center; margin-bottom: 24px;">
        <h1 style="color: #ffffff; margin: 0; font-size: 22px;">🙏 Prayer Request</h1>
        <p style="color: rgba(255,255,255,0.75); margin: 4px 0 0; font-size: 14px;">${churchName}</p>
      </div>
      ${isUrgent ? '<div style="background: #fef2f2; border: 1px solid #fca5a5; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; text-align: center;"><strong style="color: #dc2626;">⚠️ URGENT REQUEST — Immediate prayer needed</strong></div>' : ''}
      <div style="background: white; border-radius: 8px; padding: 24px; margin-bottom: 16px; border: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 13px; margin: 0 0 4px;">From</p>
        <p style="color: #111827; font-size: 16px; font-weight: 600; margin: 0 0 16px;">${privacyLevel === 'anonymous' ? 'Anonymous Member' : displayName}</p>
        <p style="color: #6b7280; font-size: 13px; margin: 0 0 4px;">Prayer Request</p>
        <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0; font-style: italic;">"${requestText}"</p>
      </div>
      <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
        This request was submitted through ShepherdKids. Please respond with prayer and pastoral care.
      </p>
    </div>
  `;

  await resend.emails.send({
    from: 'ShepherdKids <noreply@shepherdwell.church>',
    to: recipients,
    subject,
    html: htmlBody,
  });

  if (isUrgent) {
    await resend.emails.send({
      from: 'ShepherdKids <noreply@shepherdwell.church>',
      to: recipients,
      subject: `URGENT: Prayer needed now — ${privacyLevel === 'anonymous' ? 'Anonymous Member' : displayName}`,
      html: htmlBody.replace('🙏 Prayer Request', '⚠️ URGENT Prayer Request'),
    });
  }
}

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const ministryType = request.nextUrl.searchParams.get('ministry_type');

  let query = adminClient()
    .from('prayer_requests')
    .select(`
      id, privacy_level, request_text, is_urgent, status,
      submitted_at, pastor_notes, assigned_to, ministry_type,
      members(id, first_name, last_name)
    `)
    .eq('church_id', churchId)
    .order('submitted_at', { ascending: false });

  if (ministryType) query = query.eq('ministry_type', ministryType);

  const { data, error } = await query;

  if (error) return Response.json({ error: error.message }, { status: 400 });

  const requests = (data ?? []).map((r: any) => ({
    ...r,
    member_name: r.privacy_level === 'anonymous'
      ? null
      : r.members ? `${r.members.first_name} ${r.members.last_name}` : null,
    members: undefined,
  }));

  return Response.json({ requests });
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const body = await request.json();
  const { memberId, privacyLevel, requestText, isUrgent } = body;

  if (!requestText?.trim()) return Response.json({ error: 'Request text is required' }, { status: 400 });
  if (!privacyLevel) return Response.json({ error: 'Privacy level is required' }, { status: 400 });

  let memberName: string | null = null;
  if (memberId && privacyLevel !== 'anonymous') {
    const { data: member } = await adminClient()
      .from('members')
      .select('first_name, last_name')
      .eq('id', memberId)
      .eq('church_id', churchId)
      .maybeSingle();
    if (member) memberName = `${member.first_name} ${member.last_name}`;
  }

  const { data, error } = await adminClient()
    .from('prayer_requests')
    .insert({
      church_id: churchId,
      member_id: privacyLevel === 'anonymous' ? null : (memberId ?? null),
      privacy_level: privacyLevel,
      request_text: requestText.trim(),
      is_urgent: isUrgent ?? false,
      status: 'open',
    })
    .select('id')
    .single();

  if (error) return Response.json({ error: error.message }, { status: 400 });

  try {
    const [church, prayerTeamEmails] = await Promise.all([
      getChurchDetails(churchId),
      getPrayerTeamEmails(churchId),
    ]);
    await sendPrayerEmails({
      privacyLevel,
      memberName,
      requestText: requestText.trim(),
      isUrgent: isUrgent ?? false,
      churchName: church?.name ?? 'Your Church',
      pastorEmail: church?.pastor_email ?? null,
      prayerTeamEmails,
    });
  } catch {
    // Email failure doesn't block creation
  }

  return Response.json({ success: true, id: data.id });
}
