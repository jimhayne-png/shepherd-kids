import { createClient } from '@supabase/supabase-js';
import { type NextRequest } from 'next/server';
import { Resend } from 'resend';

function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}
async function getAuthUser(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user } } = await adminClient().auth.getUser(token);
  return user ?? null;
}
async function getChurchId(userId: string) {
  const { data } = await adminClient().from('church_users').select('church_id').eq('user_id', userId).maybeSingle();
  return data?.church_id ?? null;
}

function buildEmailHtml(churchName: string, subject: string, body: string): string {
  const escapedSubject = subject.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapedSubject}</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:Georgia,serif;">
  <div style="max-width:600px;margin:32px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

    <div style="background:#1a3a5c;padding:36px 40px;text-align:center;">
      <p style="margin:0 0 8px;font-size:11px;color:#C8A951;letter-spacing:3px;text-transform:uppercase;font-family:Arial,sans-serif;font-weight:bold;">Children's Ministry</p>
      <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:normal;letter-spacing:1px;">${churchName}</h1>
      <div style="width:40px;height:2px;background:#C8A951;margin:16px auto 0;"></div>
    </div>

    <div style="padding:40px 48px 36px;color:#1f2937;font-size:16px;line-height:1.85;">
      ${body}
    </div>

    <div style="padding:24px 48px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
      <p style="margin:0;font-size:12px;color:#9ca3af;font-family:Arial,sans-serif;">
        This message was sent by ${churchName} Children's Ministry
      </p>
    </div>

  </div>
</body>
</html>`;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const { subject, body, email } = await req.json();
  if (!email) return Response.json({ error: 'No email address provided' }, { status: 400 });

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return Response.json({ error: 'Email not configured' }, { status: 500 });

  const admin = adminClient();
  const { data: church } = await admin.from('churches').select('name').eq('id', churchId).single();
  const churchName = church?.name ?? 'Our Church';

  try {
    const resend = new Resend(resendKey);
    await resend.emails.send({
      from: `${churchName} <onboarding@resend.dev>`,
      to: email,
      subject,
      html: buildEmailHtml(churchName, subject, body),
    });

    await admin
      .from('cm_visitor_families')
      .update({ follow_up_sent: true, follow_up_sent_at: new Date().toISOString() })
      .eq('id', id)
      .eq('church_id', churchId);

    return Response.json({ success: true });
  } catch (err: any) {
    return Response.json({ error: err.message ?? 'Failed to send' }, { status: 500 });
  }
}
