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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const { data: member } = await adminClient()
    .from('members')
    .select('id, first_name, last_name, email, portal_token')
    .eq('id', id)
    .eq('church_id', churchId)
    .maybeSingle();

  if (!member) return Response.json({ error: 'Member not found' }, { status: 404 });
  if (!member.email) return Response.json({ error: 'Member has no email address on file' }, { status: 400 });
  if (!member.portal_token) return Response.json({ error: 'Member has no prayer link yet. Regenerate to create one.' }, { status: 400 });

  const { data: church } = await adminClient()
    .from('churches')
    .select('name')
    .eq('id', churchId)
    .maybeSingle();

  const churchName = church?.name ?? 'Your Church';
  const prayerUrl = `https://shepherd-well.vercel.app/pray/${member.portal_token}`;
  const firstName = member.first_name;

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return Response.json({ error: 'Email service not configured' }, { status: 503 });

  const resend = new Resend(resendKey);

  const htmlBody = `
    <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; background: #f9f7f4; padding: 32px; border-radius: 12px;">
      <div style="background: #1A4A2E; padding: 32px 24px; border-radius: 8px; text-align: center; margin-bottom: 32px;">
        <p style="color: rgba(255,255,255,0.7); margin: 0 0 8px; font-size: 13px; letter-spacing: 0.05em; text-transform: uppercase;">ShepherdWell</p>
        <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: normal;">Your Personal Prayer Button</h1>
        <p style="color: rgba(255,255,255,0.75); margin: 8px 0 0; font-size: 15px;">${churchName}</p>
      </div>

      <p style="color: #374151; font-size: 16px; line-height: 1.7; margin: 0 0 16px;">
        Dear ${firstName},
      </p>
      <p style="color: #374151; font-size: 16px; line-height: 1.7; margin: 0 0 16px;">
        Your church loves you and wants to pray for you. Whenever you need prayer — day or night — your personal prayer button is always available.
      </p>
      <p style="color: #374151; font-size: 16px; line-height: 1.7; margin: 0 0 24px;">
        Simply tap the button below, share what's on your heart, and choose how privately you'd like it shared. Your request goes directly to your pastoral team.
      </p>

      <div style="text-align: center; margin: 32px 0;">
        <a href="${prayerUrl}"
           style="display: inline-block; background: #1A4A2E; color: white; text-decoration: none; padding: 18px 40px; border-radius: 12px; font-size: 18px; font-weight: bold; letter-spacing: 0.02em;">
          🙏 Send a Prayer Request
        </a>
      </div>

      <div style="background: white; border-radius: 8px; padding: 20px 24px; border: 1px solid #e5e7eb; margin-bottom: 24px;">
        <p style="color: #6b7280; font-size: 12px; margin: 0 0 6px; text-transform: uppercase; letter-spacing: 0.05em;">Your personal prayer link</p>
        <p style="color: #374151; font-size: 13px; margin: 0; word-break: break-all; font-family: monospace;">${prayerUrl}</p>
      </div>

      <p style="color: #9ca3af; font-size: 13px; line-height: 1.6; text-align: center; margin: 0;">
        This link is personal to you. You can share your prayer requests anonymously or with your name — the choice is always yours.<br><br>
        With love, <strong style="color: #6b7280;">${churchName}</strong>
      </p>
    </div>
  `;

  try {
    await resend.emails.send({
      from: 'ShepherdWell <noreply@shepherdwell.church>',
      to: member.email,
      subject: `Your personal prayer button is ready — ${churchName}`,
      html: htmlBody,
    });
  } catch (err: any) {
    return Response.json({ error: 'Failed to send email: ' + (err?.message ?? 'Unknown error') }, { status: 500 });
  }

  return Response.json({ success: true });
}
