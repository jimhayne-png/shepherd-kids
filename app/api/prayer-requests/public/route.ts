import { createClient } from '@supabase/supabase-js';
import { type NextRequest } from 'next/server';
import { Resend } from 'resend';

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function getPrayerTeamEmails(churchId: string): Promise<string[]> {
  const { data } = await adminClient()
    .from('prayer_team_members')
    .select('members(email)')
    .eq('church_id', churchId);
  if (!data) return [];
  return data.map((r: any) => r.members?.email).filter(Boolean) as string[];
}

async function lookupMemberByToken(portalToken: string) {
  const { data: member } = await adminClient()
    .from('members')
    .select('id, first_name, last_name, church_id')
    .eq('portal_token', portalToken)
    .maybeSingle();
  if (!member) return null;

  const { data: church } = await adminClient()
    .from('churches')
    .select('name, pastor_email')
    .eq('id', member.church_id)
    .maybeSingle();

  return { member, church };
}

// GET /api/prayer-requests/public?token=xxx — validate token and return church name
export async function GET(request: NextRequest) {
  const token = new URL(request.url).searchParams.get('token');
  if (!token) return Response.json({ valid: false }, { status: 400 });

  const result = await lookupMemberByToken(token);
  if (!result) return Response.json({ valid: false }, { status: 404 });

  return Response.json({ valid: true, church_name: result.church?.name ?? 'Your Church' });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { memberToken, privacyLevel, requestText, isUrgent } = body;

  if (!requestText?.trim()) return Response.json({ error: 'Request text is required' }, { status: 400 });
  if (!privacyLevel) return Response.json({ error: 'Privacy level is required' }, { status: 400 });
  if (!memberToken) return Response.json({ error: 'Member token is required' }, { status: 400 });

  const result = await lookupMemberByToken(memberToken);
  if (!result) return Response.json({ error: 'This prayer link is no longer active.' }, { status: 404 });

  const { member, church } = result;
  const churchId = member.church_id;
  const churchName = church?.name ?? 'Your Church';
  const pastorEmail = church?.pastor_email ?? null;
  const memberName = privacyLevel !== 'anonymous'
    ? `${member.first_name} ${member.last_name}`
    : null;

  const { data, error } = await adminClient()
    .from('prayer_requests')
    .insert({
      church_id: churchId,
      member_id: privacyLevel === 'anonymous' ? null : member.id,
      privacy_level: privacyLevel,
      request_text: requestText.trim(),
      is_urgent: isUrgent ?? false,
      status: 'open',
    })
    .select('id')
    .single();

  if (error) return Response.json({ error: error.message }, { status: 400 });

  try {
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey && pastorEmail) {
      const resend = new Resend(resendKey);
      const displayName = memberName ?? 'Anonymous Member';

      const subjectMap: Record<string, string> = {
        anonymous: 'A member has submitted a prayer request',
        private: `${displayName} has submitted a prayer request`,
        prayer_team: `${displayName} requests prayer team support`,
        congregation: `New congregation prayer request from ${displayName}`,
      };

      const prayerTeamEmails = await getPrayerTeamEmails(churchId);
      const recipientMap: Record<string, string[]> = {
        anonymous: [pastorEmail],
        private: [pastorEmail],
        prayer_team: [pastorEmail, ...prayerTeamEmails],
        congregation: [pastorEmail, ...prayerTeamEmails],
      };

      const recipients = [...new Set(recipientMap[privacyLevel] ?? [pastorEmail])].filter(Boolean);
      const subject = subjectMap[privacyLevel] ?? 'New prayer request';

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
            <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0; font-style: italic;">"${requestText.trim()}"</p>
          </div>
          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
            Submitted through the ShepherdKids Prayer Button.
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
          subject: `URGENT: Prayer needed now — ${displayName}`,
          html: htmlBody,
        });
      }
    }
  } catch {
    // Email failure doesn't block creation
  }

  return Response.json({ success: true, id: data.id, church_name: churchName });
}
