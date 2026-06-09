import { createClient } from '@supabase/supabase-js';
import { type NextRequest } from 'next/server';
import { Resend } from 'resend';
import { MINISTRY_CONFIG } from '@/lib/ministry-config';

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

const DESTINATION_MAP: Record<string, string> = {
  junior: 'middle-school',
  senior: 'high-school',
};
const SOURCE_MAP: Record<string, string> = {
  junior: 'childrens',
  senior: 'middle-school',
};

export async function POST(req: NextRequest, { params }: { params: Promise<{ cohortId: string }> }) {
  const { cohortId } = await params;
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const admin = adminClient();

  const { data: cohort } = await admin.from('metamorphosis_cohorts').select('*').eq('id', cohortId).eq('church_id', churchId).maybeSingle();
  if (!cohort) return Response.json({ error: 'Cohort not found' }, { status: 404 });

  const { data: students } = await admin.from('metamorphosis_students').select('*').eq('cohort_id', cohortId);
  if (!students?.length) return Response.json({ error: 'No students in cohort' }, { status: 400 });

  const { data: church } = await admin.from('churches').select('name').eq('id', churchId).single();
  const churchName = church?.name ?? 'Our Church';

  const destinationType = DESTINATION_MAP[cohort.cohort_type];
  const destCfg = MINISTRY_CONFIG[destinationType];
  const today = new Date().toISOString().slice(0, 10);

  let graduated = 0;
  let emailsSent = 0;

  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

  for (const student of students) {
    // Add to destination ministry roster
    if (student.member_id) {
      await admin.from('ministry_rosters').upsert({
        church_id: churchId,
        ministry_type: destinationType,
        member_id: student.member_id,
        status: 'active',
        pipeline_stage: destCfg?.stages[0] ?? null,
        joined_date: today,
      }, { onConflict: 'church_id,ministry_type,member_id', ignoreDuplicates: true });
    }

    // Mark student as graduated
    await admin.from('metamorphosis_students').update({ graduated: true, completed: true }).eq('id', student.id);
    graduated++;

    // Send graduation email — look up parent emails
    if (resend) {
      const recipients: string[] = [];

      // Try children_ministry_children for parent emails (junior cohort)
      if (student.member_id) {
        const { data: cmChild } = await admin.from('children_ministry_children').select('parent1_email, parent2_email').eq('church_id', churchId).eq('member_id', student.member_id).maybeSingle();
        if (cmChild?.parent1_email) recipients.push(cmChild.parent1_email);
        if (cmChild?.parent2_email) recipients.push(cmChild.parent2_email);

        // Fallback: member's own email (for senior cohort)
        if (!recipients.length) {
          const { data: member } = await admin.from('members').select('email').eq('id', student.member_id).maybeSingle();
          if (member?.email) recipients.push(member.email);
        }
      }

      if (recipients.length) {
        try {
          const html = `
<div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#1f2937;">
  <div style="background:#1A4A2E;padding:28px 32px;border-radius:12px 12px 0 0;text-align:center;">
    <div style="font-size:48px;margin-bottom:8px;">🦋</div>
    <h1 style="color:white;margin:0;font-size:22px;font-weight:bold;">Congratulations!</h1>
    <p style="color:#86efac;margin:6px 0 0;font-size:14px;">${churchName}</p>
  </div>
  <div style="background:white;padding:36px 32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
    <h2 style="color:#1A4A2E;font-size:20px;margin:0 0 16px;">${student.first_name} has completed Metamorphosis!</h2>
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px;">We are so proud of ${student.first_name} for completing the <strong>${cohort.name}</strong> transition program. This is a meaningful milestone in their faith journey.</p>
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px;">${student.first_name} is now transitioning to <strong>${destCfg?.name ?? destinationType}</strong>, where a whole new community is ready to welcome and walk alongside them.</p>
    <div style="background:#f0fdf4;border-left:4px solid #1A4A2E;padding:14px 18px;border-radius:0 8px 8px 0;margin:20px 0;">
      <p style="margin:0;font-size:14px;color:#166534;">Thank you for entrusting us with this season of ${student.first_name}'s growth. We are honored to walk alongside your family.</p>
    </div>
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0;">With love and celebration,<br><strong>${churchName}</strong></p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
    <p style="font-size:12px;color:#9ca3af;text-align:center;margin:0;">Sent via ShepherdKids</p>
  </div>
</div>`;
          await resend.emails.send({
            from: `${churchName} <onboarding@resend.dev>`,
            to: recipients,
            subject: `Congratulations — ${student.first_name} has completed Metamorphosis!`,
            html,
          });
          emailsSent++;
        } catch (_) { /* never block */ }
      }
    }
  }

  // Mark cohort as completed
  await admin.from('metamorphosis_cohorts').update({
    status: 'completed',
    graduation_date: today,
    graduation_celebrated: true,
  }).eq('id', cohortId);

  return Response.json({ graduated, emails_sent: emailsSent });
}
