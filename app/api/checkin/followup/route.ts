import { type NextRequest } from 'next/server';
import { getAuthContext, adminClient } from '@/lib/api-auth';
import { Resend } from 'resend';

function buildEmailHtml(churchName: string, parentName: string, childList: string, customMsg?: string | null): string {
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
      Hi ${firstName}, it was such a blessing to have ${childList} with us. We hope ${childList.includes(',') ? 'the kids' : childList} had a wonderful time and felt right at home.
    </p>
    ${customMsg ? `<div style="background:#fff7ed;border-left:4px solid #F28C28;padding:16px 20px;border-radius:0 8px 8px 0;margin:0 0 20px;">
      <p style="margin:0;font-size:15px;color:#9a3412;line-height:1.7;">${customMsg}</p>
    </div>` : ''}
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px;">
      Our Children's Ministry meets every Sunday. We would love to make ${churchName} your family's church home — come join us again soon!
    </p>
    <div style="background:#f9fafb;border-radius:8px;padding:16px 20px;margin:0 0 20px;">
      <p style="margin:0 0 6px;font-size:13px;font-weight:bold;color:#374151;">Questions? Contact us:</p>
      <p style="margin:0;font-size:14px;color:#6b7280;">${churchName} Children's Ministry</p>
    </div>
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0;">With love,<br><strong>${churchName} Children's Ministry Team</strong></p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0;">
    <p style="font-size:12px;color:#9ca3af;text-align:center;margin:0;">Sent via ShepherdWell</p>
  </div>
</div>`;
}

export async function POST(request: NextRequest) {
  const auth = await getAuthContext(request);
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const {
    sessionId, recordIds, parentName, parentEmail,
    childNames, followUpType, personalizedMessage,
  } = await request.json() as {
    sessionId: string;
    recordIds: string[];
    parentName: string;
    parentEmail?: string;
    childNames: string[];
    followUpType: 'email' | 'letter' | 'both' | 'skip';
    personalizedMessage?: string;
  };

  if (!sessionId || !recordIds?.length) {
    return Response.json({ error: 'sessionId and recordIds required' }, { status: 400 });
  }

  const admin = adminClient();
  const now = new Date().toISOString();

  const isSkip = followUpType === 'skip';
  const sendEmail = !isSkip && (followUpType === 'email' || followUpType === 'both') && !!parentEmail?.trim();

  if (sendEmail) {
    const { data: church } = await admin.from('churches').select('name').eq('id', auth.churchId).maybeSingle();
    const churchName = church?.name ?? 'Our Church';
    const childList = childNames.join(', ') || 'your child';
    const html = buildEmailHtml(churchName, parentName, childList, personalizedMessage);
    const resend = new Resend(process.env.RESEND_API_KEY!);
    try {
      await resend.emails.send({
        from: `${churchName} <onboarding@resend.dev>`,
        to: [parentEmail!],
        subject: 'We are so glad your family joined us!',
        html,
      });
    } catch (err: any) {
      return Response.json({ error: err?.message ?? 'Email send failed' }, { status: 500 });
    }
  }

  const logStatus = isSkip ? 'skipped' : 'sent';
  const logType = isSkip ? 'email' : followUpType;

  for (const rid of recordIds) {
    await admin.from('cm_followup_log').insert({
      church_id: auth.churchId,
      session_id: sessionId,
      record_id: rid,
      parent_email: parentEmail ?? null,
      parent_name: parentName ?? null,
      child_names: childNames ?? [],
      follow_up_type: logType,
      status: logStatus,
      personalized_message: personalizedMessage ?? null,
      auto_send: false,
      sent_at: sendEmail ? now : null,
    });
  }

  return Response.json({ ok: true, sent: sendEmail, status: logStatus });
}
