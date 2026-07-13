import { sendEmail, defaultFromAddress } from './resend';
import { ROLE_LABELS } from '@/lib/staff-permissions';

export async function sendStaffInvitationEmail({
  to,
  firstName,
  churchName,
  inviterName,
  role,
  inviteUrl,
}: {
  to: string;
  firstName: string;
  churchName: string;
  inviterName: string;
  role: string;
  inviteUrl: string;
}) {
  const roleLabel = ROLE_LABELS[role] ?? role;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Georgia,serif;background:#08060D;margin:0;padding:40px 20px;">
  <div style="max-width:520px;margin:0 auto;background:#120A1F;border:1px solid rgba(212,175,55,0.25);border-radius:12px;padding:36px 40px;">
    <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#D4AF37;">ShepherdKids</p>
    <h1 style="margin:0 0 20px;font-size:22px;font-weight:700;color:#ffffff;">You've been invited</h1>
    <p style="margin:0 0 16px;font-size:14px;color:rgba(255,255,255,0.78);line-height:1.6;">
      Hi ${firstName},
    </p>
    <p style="margin:0 0 16px;font-size:14px;color:rgba(255,255,255,0.78);line-height:1.6;">
      <strong style="color:#ffffff;">${inviterName}</strong> has invited you to manage
      <strong style="color:#ffffff;">${churchName}</strong> on ShepherdKids as a
      <strong style="color:#D4AF37;">${roleLabel}</strong>.
    </p>
    <p style="margin:0 0 28px;font-size:14px;color:rgba(255,255,255,0.78);line-height:1.6;">
      Click the button below to set up your account and get started.
    </p>
    <a href="${inviteUrl}" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#7B2CBF,#9D4EDD);color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:700;font-family:Georgia,serif;">
      Accept Invitation
    </a>
    <p style="margin:28px 0 0;font-size:12px;color:rgba(255,255,255,0.45);line-height:1.6;">
      This invitation expires in 7 days. If you did not expect this invitation, you can safely ignore this email.
    </p>
    <hr style="border:none;border-top:1px solid rgba(212,175,55,0.15);margin:24px 0;">
    <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.35);">
      ShepherdKids · Children's Ministry Administration
    </p>
  </div>
</body>
</html>`;

  const text = `Hi ${firstName},\n\n${inviterName} has invited you to manage ${churchName} on ShepherdKids as a ${roleLabel}.\n\nAccept your invitation: ${inviteUrl}\n\nThis invitation expires in 7 days.`;

  await sendEmail({
    to,
    subject: `You've been invited to manage ${churchName} on ShepherdKids`,
    html,
    text,
    from: `ShepherdKids <${defaultFromAddress}>`,
  });
}
