import { type NextRequest } from 'next/server';
import { getAuthContext, adminClient } from '@/lib/api-auth';
import { Resend } from 'resend';

export async function GET(request: NextRequest) {
  const ctx = await getAuthContext(request);
  if (!ctx) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { churchId } = ctx;

  const admin = adminClient();
  const { data, error } = await admin
    .from('children_ministry_parent_updates')
    .select('*')
    .eq('church_id', churchId)
    .order('session_date', { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ updates: data ?? [] });
}

export async function POST(request: NextRequest) {
  const ctx = await getAuthContext(request);
  if (!ctx) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { churchId } = ctx;

  const body = await request.json();
  const { sessionDate, memoryVerse, lessonSummary, conversationStarter, specialNotes, sendNow } = body;

  if (!sessionDate) return Response.json({ error: 'Session date required' }, { status: 400 });

  const admin = adminClient();

  const { data: existing } = await admin
    .from('children_ministry_parent_updates')
    .select('id')
    .eq('church_id', churchId)
    .eq('session_date', sessionDate)
    .maybeSingle();

  let updateRecord: any;
  if (existing) {
    const { data } = await admin
      .from('children_ministry_parent_updates')
      .update({
        memory_verse: memoryVerse?.trim() || null,
        lesson_summary: lessonSummary?.trim() || null,
        conversation_starter: conversationStarter?.trim() || null,
        special_notes: specialNotes?.trim() || null,
      })
      .eq('id', existing.id)
      .select('*')
      .single();
    updateRecord = data;
  } else {
    const { data } = await admin
      .from('children_ministry_parent_updates')
      .insert({
        church_id: churchId,
        session_date: sessionDate,
        memory_verse: memoryVerse?.trim() || null,
        lesson_summary: lessonSummary?.trim() || null,
        conversation_starter: conversationStarter?.trim() || null,
        special_notes: specialNotes?.trim() || null,
      })
      .select('*')
      .single();
    updateRecord = data;
  }

  if (!sendNow) return Response.json({ update: updateRecord });

  const emailsSent = await sendParentEmails(admin, churchId, sessionDate, {
    memoryVerse: memoryVerse?.trim() || '',
    lessonSummary: lessonSummary?.trim() || '',
    conversationStarter: conversationStarter?.trim() || '',
    specialNotes: specialNotes?.trim() || '',
  });

  if (updateRecord) {
    await admin.from('children_ministry_parent_updates').update({ sent_at: new Date().toISOString() }).eq('id', updateRecord.id);
  }

  return Response.json({ update: updateRecord, emailsSent });
}

export async function sendParentEmails(
  admin: ReturnType<typeof adminClient>,
  churchId: string,
  sessionDate: string,
  content: { memoryVerse: string; lessonSummary: string; conversationStarter: string; specialNotes: string }
): Promise<number> {
  try {
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) return 0;

    const { data: church } = await admin.from('churches').select('name').eq('id', churchId).single();
    const churchName = church?.name ?? 'Your Church';

    const { data: children } = await admin
      .from('children_ministry_children')
      .select('*')
      .eq('church_id', churchId)
      .eq('active', true);

    if (!children?.length) return 0;

    const resend = new Resend(resendKey);
    const dateDisplay = new Date(sessionDate + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    });
    let sent = 0;

    for (const child of children) {
      const recipients: string[] = [child.parent1_email, child.parent2_email].filter(Boolean);
      if (recipients.length === 0) continue;

      const html = `
        <div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;color:#1f2937;">
          <div style="background:#7B2CBF;padding:28px 32px;border-radius:12px 12px 0 0;">
            <h1 style="color:white;margin:0;font-size:22px;font-weight:normal;">${churchName}</h1>
            <p style="color:rgba(255,255,255,0.9);margin:6px 0 0;font-size:15px;">This Week in Children's Ministry · ${dateDisplay}</p>
          </div>
          <div style="background:white;padding:36px 32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">

            <div style="background:#f5f3ff;border-left:4px solid #7B2CBF;padding:16px 20px;border-radius:0 8px 8px 0;margin-bottom:28px;">
              <h2 style="color:#4c1d95;margin:0;font-size:18px;">${child.first_name} ${child.last_name}</h2>
            </div>

            ${content.memoryVerse ? `
            <div style="margin-bottom:24px;">
              <h3 style="color:#1A4A2E;font-size:16px;margin:0 0 8px;">📖 Memory Verse This Week</h3>
              <p style="font-size:15px;font-style:italic;color:#374151;line-height:1.6;margin:0;">"${content.memoryVerse}"</p>
            </div>` : ''}

            ${content.lessonSummary ? `
            <div style="margin-bottom:24px;">
              <h3 style="color:#1A4A2E;font-size:16px;margin:0 0 8px;">✝️ This Week's Lesson</h3>
              <p style="font-size:15px;color:#374151;line-height:1.7;margin:0;">${content.lessonSummary}</p>
            </div>` : ''}

            ${content.conversationStarter ? `
            <div style="margin-bottom:24px;background:#f8fafc;border-radius:8px;padding:16px 20px;">
              <h3 style="color:#1A4A2E;font-size:16px;margin:0 0 8px;">💬 Conversation Starter</h3>
              <p style="font-size:15px;color:#374151;font-style:italic;margin:0;">Ask ${child.first_name}: "${content.conversationStarter}"</p>
            </div>` : ''}

            ${content.specialNotes ? `
            <div style="margin-bottom:24px;">
              <h3 style="color:#1A4A2E;font-size:16px;margin:0 0 8px;">📢 Special Notes</h3>
              <p style="font-size:15px;color:#374151;line-height:1.7;margin:0;">${content.specialNotes}</p>
            </div>` : ''}

            <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
            <p style="font-size:12px;color:#9ca3af;text-align:center;margin:0;">Sent with love by ${churchName} Children's Ministry · Powered by ShepherdKids</p>
          </div>
        </div>`;

      try {
        await resend.emails.send({
          from: `${churchName} <onboarding@resend.dev>`,
          to: recipients,
          subject: `${child.first_name}'s Week in Children's Ministry — ${dateDisplay}`,
          html,
        });
        sent++;
      } catch (_) {
        // Never block on email failure
      }
    }

    return sent;
  } catch (_) {
    return 0;
  }
}
