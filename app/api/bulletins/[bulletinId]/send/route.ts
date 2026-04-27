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

export async function POST(req: NextRequest, { params }: { params: Promise<{ bulletinId: string }> }) {
  const { bulletinId } = await params;
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const admin = adminClient();
  const { data: bulletin } = await admin.from('bulletins').select('*').eq('id', bulletinId).eq('church_id', churchId).maybeSingle();
  if (!bulletin) return Response.json({ error: 'Bulletin not found' }, { status: 404 });
  if (bulletin.status !== 'published') return Response.json({ error: 'Bulletin must be published before sending' }, { status: 400 });

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return Response.json({ error: 'Email not configured' }, { status: 500 });

  const { data: church } = await admin.from('churches').select('name').eq('id', churchId).single();
  const churchName = church?.name ?? 'Your Church';

  const { data: members } = await admin.from('members').select('email').eq('church_id', churchId).eq('status', 'active').not('email', 'is', null);
  const emails = (members ?? []).map((m: any) => m.email).filter(Boolean) as string[];
  if (!emails.length) return Response.json({ sent: 0 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://shepherd-well.vercel.app';
  const bulletinUrl = `${appUrl}/bulletin/${bulletin.access_token}`;
  const serviceDate = new Date(bulletin.service_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  // Use qrserver API for QR image in email (no server-side qrcode package needed)
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&color=1A4A2E&bgcolor=ffffff&data=${encodeURIComponent(bulletinUrl)}`;

  const html = `
<div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#1f2937;">
  <div style="background:#1A4A2E;padding:28px 32px;border-radius:12px 12px 0 0;text-align:center;">
    <h1 style="color:white;margin:0;font-size:22px;font-weight:normal;">${churchName}</h1>
    <p style="color:#86efac;margin:8px 0 0;font-size:15px;">This Week's Bulletin</p>
  </div>
  <div style="background:white;padding:36px 32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;text-align:center;">
    <h2 style="color:#1A4A2E;font-size:20px;margin:0 0 6px;">${bulletin.title}</h2>
    <p style="color:#6b7280;font-size:14px;margin:0 0 28px;">${serviceDate}</p>
    <a href="${bulletinUrl}" style="display:inline-block;background:#F28C28;color:white;padding:14px 32px;border-radius:10px;text-decoration:none;font-size:16px;font-weight:bold;margin-bottom:28px;">
      📋 View This Week's Bulletin
    </a>
    <p style="color:#6b7280;font-size:13px;margin:0 0 16px;">Or scan the QR code below:</p>
    <img src="${qrUrl}" alt="Scan to view bulletin" width="160" height="160" style="border-radius:8px;border:1px solid #e5e7eb;" />
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0;" />
    <p style="font-size:12px;color:#9ca3af;margin:0;">Sent by ${churchName} · Powered by ShepherdWell</p>
  </div>
</div>`;

  try {
    const resend = new Resend(resendKey);
    await resend.emails.send({
      from: `${churchName} <onboarding@resend.dev>`,
      to: user.email ?? 'onboarding@resend.dev',
      bcc: emails,
      subject: `This Week's Bulletin — ${serviceDate} — ${churchName}`,
      html,
    });

    await admin.from('bulletins').update({ sent_at: new Date().toISOString() }).eq('id', bulletinId);
    return Response.json({ sent: emails.length });
  } catch (err: any) {
    return Response.json({ error: err.message ?? 'Failed to send' }, { status: 500 });
  }
}
