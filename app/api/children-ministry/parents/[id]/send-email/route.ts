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
      html: body,
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
