import { createClient } from '@supabase/supabase-js';
import { type NextRequest } from 'next/server';
import { Resend } from 'resend';

function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

function buildEmailHtml(churchName: string, ministryName: string, visitorName: string): string {
  const firstName = visitorName.split(' ')[0] || visitorName;
  return `
<div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#1f2937;">
  <div style="background:#F28C28;padding:28px 32px;border-radius:12px 12px 0 0;text-align:center;">
    <h1 style="color:white;margin:0;font-size:22px;font-weight:bold;">${churchName}</h1>
    <p style="color:rgba(255,255,255,0.9);margin:8px 0 0;font-size:14px;">${ministryName}</p>
  </div>
  <div style="background:white;padding:36px 32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
    <h2 style="color:#1f2937;font-size:20px;margin:0 0 16px;">We are so glad you joined us! 🎉</h2>
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px;">
      Hi ${firstName}, it was such a blessing to have you with us on Sunday. We hope you felt welcomed and right at home.
    </p>
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px;">
      Our ${ministryName} meets regularly and we would love to see you again. Come as you are — there's always a place for you here!
    </p>
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0;">With love,<br><strong>${churchName} — ${ministryName}</strong></p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0;">
    <p style="font-size:12px;color:#9ca3af;text-align:center;margin:0;">Sent via ShepherdKids</p>
  </div>
</div>`;
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization') ?? '';
  if (!process.env.CRON_SECRET || authHeader.replace('Bearer ', '') !== process.env.CRON_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = adminClient();
  const resend = new Resend(process.env.RESEND_API_KEY!);
  const now = new Date();

  const windowStart = new Date(now.getTime() - 25 * 60 * 60 * 1000).toISOString();
  const windowEnd = new Date(now.getTime() - 23 * 60 * 60 * 1000).toISOString();

  const { data: sessions } = await admin
    .from('ministry_checkin_sessions')
    .select('id, ministry_type, church_id, service_name')
    .eq('auto_followup', true);

  if (!sessions?.length) return Response.json({ sent: 0 });

  const ministryMap: Record<string, string> = { childrens: "Children's Ministry", 'middle-school': "Middle School Ministry", 'high-school': "High School Ministry", 'young-adults': "Young Adults Ministry", mens: "Men's Ministry", womens: "Women's Ministry", seniors: "Senior Ministry", ushers: "Ushers Ministry", drama: "Drama Ministry", 'music-choir': "Music & Choir Ministry" };

  let totalSent = 0;

  for (const session of sessions) {
    const { data: records } = await admin
      .from('ministry_checkin_records')
      .select('*')
      .eq('session_id', session.id)
      .eq('church_id', session.church_id)
      .eq('is_new_visitor', true)
      .gte('checked_in_at', windowStart)
      .lte('checked_in_at', windowEnd);

    if (!records?.length) continue;

    const recordIds = records.map((r: any) => r.id as string);
    const { data: existingLogs } = await admin
      .from('ministry_visitor_followup_log')
      .select('record_id')
      .in('record_id', recordIds);

    const alreadySent = new Set((existingLogs ?? []).map((l: any) => l.record_id as string));

    const { data: church } = await admin.from('churches').select('name').eq('id', session.church_id).maybeSingle();
    const churchName = church?.name ?? 'Our Church';
    const ministryName = ministryMap[session.ministry_type] ?? `${session.ministry_type} Ministry`;
    const logNow = new Date().toISOString();

    for (const r of records as any[]) {
      if (alreadySent.has(r.id)) continue;
      const email = r.visitor_email ?? null;
      if (email) {
        const html = buildEmailHtml(churchName, ministryName, r.visitor_name ?? 'Friend');
        try {
          await resend.emails.send({
            from: `${churchName} <onboarding@resend.dev>`,
            to: [email],
            subject: 'We are so glad you joined us!',
            html,
          });
          totalSent++;
        } catch (_) {}
      }
      await admin.from('ministry_visitor_followup_log').insert({
        church_id: session.church_id,
        session_id: session.id,
        record_id: r.id,
        visitor_name: r.visitor_name ?? null,
        visitor_phone: r.visitor_phone ?? null,
        visitor_email: email,
        follow_up_type: 'email',
        status: email ? 'sent' : 'skipped',
        sent_at: email ? logNow : null,
      });
    }
  }

  return Response.json({ sent: totalSent, checked_at: now.toISOString() });
}
