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

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return Response.json({ error: 'Email not configured' }, { status: 500 });

  const admin = adminClient();

  const [{ data: form }, { data: church }] = await Promise.all([
    admin.from('youth_permission_forms')
      .select('*, youth_students(first_name, last_name, grade, date_of_birth)')
      .eq('id', id)
      .eq('church_id', churchId)
      .single(),
    admin.from('churches').select('name, logo_url').eq('id', churchId).single(),
  ]);

  if (!form) return Response.json({ error: 'Form not found' }, { status: 404 });
  if (!form.parent_email) return Response.json({ error: 'No parent email on file' }, { status: 400 });

  const churchName = church?.name ?? 'Our Church';
  const student = form.youth_students as any;
  const studentName = student ? `${student.first_name} ${student.last_name}` : 'your child';

  const perm = (val: boolean) => val
    ? `<span style="color:#16a34a;font-weight:bold;">✓ Granted</span>`
    : `<span style="color:#dc2626;font-weight:bold;">✗ Not Granted</span>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Permission Form</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Georgia,serif;">
  <div style="max-width:600px;margin:32px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:#1a3a5c;padding:36px 40px;text-align:center;">
      <p style="margin:0 0 8px;font-size:11px;color:#C8A951;letter-spacing:3px;text-transform:uppercase;font-family:Arial,sans-serif;font-weight:bold;">Youth Ministry</p>
      <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:normal;letter-spacing:1px;">${churchName}</h1>
      <div style="width:40px;height:2px;background:#C8A951;margin:16px auto 0;"></div>
    </div>
    <div style="padding:40px 48px 32px;color:#1f2937;font-size:16px;line-height:1.85;">
      <p>Dear ${form.parent_name || 'Parent/Guardian'},</p>
      <p>Please review and return the signed permission form for <strong>${studentName}</strong>. A physical signature is required for your child to participate in youth ministry activities.</p>

      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:24px;margin:24px 0;">
        <h2 style="margin:0 0 16px;font-size:18px;color:#1a3a5c;border-bottom:2px solid #C8A951;padding-bottom:8px;">Permission Summary</h2>
        <table style="width:100%;border-collapse:collapse;font-size:15px;">
          <tr><td style="padding:6px 0;color:#64748b;">Student</td><td style="padding:6px 0;font-weight:600;">${studentName}</td></tr>
          ${student?.grade ? `<tr><td style="padding:6px 0;color:#64748b;">Grade</td><td style="padding:6px 0;">${student.grade}</td></tr>` : ''}
          <tr><td style="padding:6px 0;color:#64748b;">Parent</td><td style="padding:6px 0;">${form.parent_name || '—'}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b;">Valid Through</td><td style="padding:6px 0;font-weight:600;">${form.expires_at ? new Date(form.expires_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—'}</td></tr>
        </table>
        <h3 style="margin:20px 0 12px;font-size:15px;color:#1a3a5c;">Activity Permissions</h3>
        <table style="width:100%;border-collapse:collapse;font-size:15px;">
          <tr><td style="padding:5px 0;color:#64748b;">On-Campus Activities</td><td style="padding:5px 0;">${perm(form.on_campus)}</td></tr>
          <tr><td style="padding:5px 0;color:#64748b;">Off-Campus Activities</td><td style="padding:5px 0;">${perm(form.off_campus)}</td></tr>
          <tr><td style="padding:5px 0;color:#64748b;">Overnight Events</td><td style="padding:5px 0;">${perm(form.overnight)}</td></tr>
          <tr><td style="padding:5px 0;color:#64748b;">Photo Permission</td><td style="padding:5px 0;">${perm(form.photo_permission)}</td></tr>
          <tr><td style="padding:5px 0;color:#64748b;">Video Permission</td><td style="padding:5px 0;">${perm(form.video_permission)}</td></tr>
        </table>
        ${form.allergies ? `<p style="margin:16px 0 0;font-size:14px;color:#64748b;"><strong>Allergies:</strong> ${form.allergies}</p>` : ''}
        ${form.medications ? `<p style="margin:8px 0 0;font-size:14px;color:#64748b;"><strong>Medications:</strong> ${form.medications}</p>` : ''}
      </div>

      <p style="color:#64748b;font-size:14px;">Please print, sign, and return this form to your youth pastor. You may also reply to this email with any questions.</p>
    </div>
    <div style="padding:24px 48px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
      <p style="margin:0;font-size:12px;color:#9ca3af;font-family:Arial,sans-serif;">This message was sent by ${churchName} Youth Ministry</p>
    </div>
  </div>
</body>
</html>`;

  try {
    const resend = new Resend(resendKey);
    await resend.emails.send({
      from: `${churchName} <onboarding@resend.dev>`,
      to: form.parent_email,
      subject: `Youth Ministry Permission Form — ${studentName}`,
      html,
    });
    return Response.json({ success: true });
  } catch (err: any) {
    return Response.json({ error: err.message ?? 'Failed to send' }, { status: 500 });
  }
}
