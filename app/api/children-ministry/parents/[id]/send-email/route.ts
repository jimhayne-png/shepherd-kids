import { type NextRequest } from 'next/server';
import { getAuthContext, adminClient } from '@/lib/api-auth';
import { Resend } from 'resend';

function buildEmailHtml(churchName: string, subject: string, body: string, logoUrl: string | null, pastorName: string): string {
  const escapedSubject = subject.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const filledBody = body
    .replace(/\{church_name\}/g, churchName)
    .replace(/\{pastor_name\}/g, pastorName)
    .replace(/Pastor/g, pastorName);
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
      ${logoUrl ? `<img src="${logoUrl}" style="max-height:70px;margin-bottom:12px;display:block;margin-left:auto;margin-right:auto;" alt="${churchName} logo" />` : ''}
      <p style="margin:0 0 8px;font-size:11px;color:#C8A951;letter-spacing:3px;text-transform:uppercase;font-family:Arial,sans-serif;font-weight:bold;">Children's Ministry</p>
      <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:normal;letter-spacing:1px;">${churchName}</h1>
      <div style="width:40px;height:2px;background:#C8A951;margin:16px auto 0;"></div>
    </div>

    <div style="padding:40px 48px 36px;color:#1f2937;font-size:16px;line-height:1.85;">
      ${filledBody}
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
  const ctx = await getAuthContext(req);
  if (!ctx) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { churchId } = ctx;

  const { subject, body, email } = await req.json();
  if (!email) return Response.json({ error: 'No email address provided' }, { status: 400 });

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return Response.json({ error: 'Email not configured' }, { status: 500 });

  const admin = adminClient();
  const { data: church } = await admin.from('churches').select('name, logo_url, children_pastor, senior_pastor').eq('id', churchId).single();
  const churchName = church?.name ?? 'Our Church';
  const logoUrl = church?.logo_url ?? null;
  const pastorName = church?.children_pastor ?? church?.senior_pastor ?? "Your Children's Pastor";

  try {
    const resend = new Resend(resendKey);
    await resend.emails.send({
      from: `${churchName} <onboarding@resend.dev>`,
      to: email,
      subject,
      html: buildEmailHtml(churchName, subject, body, logoUrl, pastorName),
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
