import { createClient } from '@supabase/supabase-js';
import { type NextRequest } from 'next/server';
import { Resend } from 'resend';

function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

function buildEmailHtml(churchName: string, parentName: string, childList: string): string {
  const firstName = parentName.split(' ')[0] || parentName;
  return `
<div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#1f2937;">
  <div style="background:#F28C28;padding:28px 32px;border-radius:12px 12px 0 0;text-align:center;">
    <h1 style="color:white;margin:0;font-size:22px;font-weight:bold;">${churchName}</h1>
    <p style="color:rgba(255,255,255,0.9);margin:8px 0 0;font-size:14px;">Children's Ministry</p>
  </div>
  <div style="background:white;padding:36px 32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
    <h2 style="color:#1f2937;font-size:20px;margin:0 0 16px;">We are so glad your family joined us! 🎉</h2>
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px;">
      Hi ${firstName}, it was such a blessing to have ${childList} with us on Sunday. We hope ${childList.includes(',') ? 'the kids' : childList} had a wonderful time.
    </p>
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px;">
      Our Children's Ministry meets every Sunday. We would love to make ${churchName} your family's church home — come join us again!
    </p>
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0;">With love,<br><strong>${churchName} Children's Ministry Team</strong></p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0;">
    <p style="font-size:12px;color:#9ca3af;text-align:center;margin:0;">Sent via ShepherdWell</p>
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

  // 24 hours ago window (23–25h to be safe)
  const windowStart = new Date(now.getTime() - 25 * 60 * 60 * 1000).toISOString();
  const windowEnd = new Date(now.getTime() - 23 * 60 * 60 * 1000).toISOString();

  // Find open sessions with auto_followup = true
  const { data: sessions } = await admin
    .from('cm_checkin_sessions')
    .select('id, service_name, church_id')
    .eq('auto_followup', true);

  if (!sessions?.length) return Response.json({ sent: 0 });

  let totalSent = 0;

  for (const session of sessions) {
    // Find new visitor records checked in ~24 hours ago for this session
    const { data: records } = await admin
      .from('cm_checkin_records')
      .select('*')
      .eq('session_id', session.id)
      .eq('church_id', session.church_id)
      .eq('is_new_visitor', true)
      .gte('checked_in_at', windowStart)
      .lte('checked_in_at', windowEnd);

    if (!records?.length) continue;

    // Get existing log entries so we don't double-send
    const recordIds = records.map((r: any) => r.id as string);
    const { data: existingLogs } = await admin
      .from('cm_followup_log')
      .select('record_id')
      .in('record_id', recordIds);

    const alreadySent = new Set((existingLogs ?? []).map((l: any) => l.record_id as string));

    // Get church name
    const { data: church } = await admin
      .from('churches').select('name').eq('id', session.church_id).maybeSingle();
    const churchName = church?.name ?? 'Our Church';

    // Group by parent_phone to get families
    const familyMap: Record<string, any[]> = {};
    for (const r of records) {
      if (alreadySent.has(r.id)) continue;
      if (!familyMap[r.parent_phone]) familyMap[r.parent_phone] = [];
      familyMap[r.parent_phone].push(r);
    }

    for (const [phone, recs] of Object.entries(familyMap)) {
      const first = (recs as any[])[0];

      // Try to find email from cm_visitor_families via matching phone
      const { data: visitorFamily } = await admin
        .from('cm_visitor_families')
        .select('parent1_email, parent2_email')
        .eq('church_id', session.church_id)
        .or(`parent1_phone.ilike.%${phone}%,parent2_phone.ilike.%${phone}%`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const email = visitorFamily?.parent1_email ?? visitorFamily?.parent2_email ?? null;

      const childNames = (recs as any[]).map((r: any) => r.child_name as string);
      const childList = childNames.join(', ');
      const logNow = new Date().toISOString();

      if (email) {
        const html = buildEmailHtml(churchName, first.parent_name, childList);
        try {
          await resend.emails.send({
            from: `${churchName} <onboarding@resend.dev>`,
            to: [email],
            subject: 'We are so glad your family joined us!',
            html,
          });
          totalSent++;
        } catch (_) { /* log failure but continue */ }
      }

      for (const r of recs as any[]) {
        await admin.from('cm_followup_log').insert({
          church_id: session.church_id,
          session_id: session.id,
          record_id: r.id,
          parent_email: email ?? null,
          parent_name: first.parent_name,
          child_names: childNames,
          follow_up_type: 'email',
          status: email ? 'sent' : 'skipped',
          auto_send: true,
          sent_at: email ? logNow : null,
        });
      }
    }
  }

  return Response.json({ sent: totalSent, checked_at: now.toISOString() });
}
