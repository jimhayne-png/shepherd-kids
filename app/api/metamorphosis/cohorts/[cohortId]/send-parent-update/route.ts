import { createClient } from '@supabase/supabase-js';
import { type NextRequest } from 'next/server';
import { Resend } from 'resend';

function adminClient() { return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!); }
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

export async function POST(req: NextRequest, { params }: { params: Promise<{ cohortId: string }> }) {
  const { cohortId } = await params;
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const { week_number, topic, notes, memory_verse } = await req.json();
  if (!week_number) return Response.json({ error: 'week_number required' }, { status: 400 });

  const admin = adminClient();
  const { data: cohort } = await admin.from('metamorphosis_cohorts').select('*').eq('id', cohortId).eq('church_id', churchId).maybeSingle();
  if (!cohort) return Response.json({ error: 'Cohort not found' }, { status: 404 });

  const { data: students } = await admin.from('metamorphosis_students').select('*').eq('cohort_id', cohortId);
  const { data: church } = await admin.from('churches').select('name').eq('id', churchId).single();
  const churchName = church?.name ?? 'Our Church';

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return Response.json({ error: 'Email not configured' }, { status: 500 });

  const resend = new Resend(resendKey);
  let sent = 0;

  const nextWeekTopic = week_number < 6 ? `Week ${week_number + 1}` : 'Graduation Celebration';

  for (const student of students ?? []) {
    const recipients: string[] = [];
    if (student.member_id) {
      const { data: cmChild } = await admin.from('children_ministry_children').select('parent1_email, parent2_email, parent1_name').eq('church_id', churchId).eq('member_id', student.member_id).maybeSingle();
      if (cmChild?.parent1_email) recipients.push(cmChild.parent1_email);
      if (cmChild?.parent2_email) recipients.push(cmChild.parent2_email);
      if (!recipients.length) {
        const { data: member } = await admin.from('members').select('email').eq('id', student.member_id).maybeSingle();
        if (member?.email) recipients.push(member.email);
      }
    }
    if (!recipients.length) continue;

    const html = `
<div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#1f2937;">
  <div style="background:#1A4A2E;padding:24px 32px;border-radius:12px 12px 0 0;">
    <p style="color:#86efac;margin:0 0 4px;font-size:13px;">🦋 Metamorphosis Update</p>
    <h1 style="color:white;margin:0;font-size:20px;font-weight:normal;">${cohort.name}</h1>
    <p style="color:rgba(255,255,255,0.75);margin:4px 0 0;font-size:14px;">Week ${week_number} of 6</p>
  </div>
  <div style="background:white;padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
    <p style="font-size:15px;margin:0 0 16px;">Hi! Here's your Week ${week_number} update for ${student.first_name}:</p>
    ${topic ? `<div style="margin:0 0 20px;"><p style="font-weight:bold;color:#1A4A2E;margin:0 0 6px;font-size:14px;">📖 This Week's Topic</p><p style="margin:0;font-size:15px;color:#374151;">${topic}</p></div>` : ''}
    ${memory_verse ? `<div style="background:#f0fdf4;border-left:4px solid #1A4A2E;padding:12px 16px;border-radius:0 8px 8px 0;margin:0 0 20px;"><p style="margin:0 0 4px;font-size:13px;color:#166534;font-weight:bold;">Memory Verse</p><p style="margin:0;font-style:italic;color:#166534;font-size:14px;">"${memory_verse}"</p></div>` : ''}
    ${notes ? `<div style="margin:0 0 20px;"><p style="font-weight:bold;color:#1A4A2E;margin:0 0 6px;font-size:14px;">This Week's Recap</p><p style="margin:0;font-size:15px;color:#374151;line-height:1.7;">${notes}</p></div>` : ''}
    <p style="font-size:14px;color:#6b7280;margin:0 0 16px;">Next week: <strong>${nextWeekTopic}</strong></p>
    <p style="font-size:14px;color:#374151;margin:0;">Thank you for investing in ${student.first_name}'s journey!</p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;">
    <p style="font-size:12px;color:#9ca3af;text-align:center;margin:0;">Sent via ShepherdKids · ${churchName}</p>
  </div>
</div>`;

    try {
      await resend.emails.send({
        from: `${churchName} <onboarding@resend.dev>`,
        to: recipients,
        subject: `Metamorphosis Week ${week_number} Update — ${cohort.name}`,
        html,
      });
      sent++;
    } catch (_) { /* never block */ }
  }

  return Response.json({ sent });
}
