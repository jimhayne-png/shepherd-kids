import { createClient } from '@supabase/supabase-js';
import { type NextRequest } from 'next/server';
import { Resend } from 'resend';

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function getAuthUser(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user } } = await adminClient().auth.getUser(token);
  return user ?? null;
}

async function getChurchUser(userId: string) {
  const { data } = await adminClient()
    .from('church_users')
    .select('church_id, role')
    .eq('user_id', userId)
    .maybeSingle();
  return data ?? null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ departmentId: string }> }
) {
  const { departmentId } = await params;
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const cu = await getChurchUser(user.id);
  if (!cu || cu.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const { member_id } = body;
  if (!member_id) return Response.json({ error: 'member_id required' }, { status: 400 });

  const admin = adminClient();

  const [memberRes, deptRes, churchRes] = await Promise.all([
    admin.from('members').select('id, first_name, last_name, email').eq('id', member_id).eq('church_id', cu.church_id).single(),
    admin.from('departments').select('id, name').eq('id', departmentId).eq('church_id', cu.church_id).single(),
    admin.from('churches').select('name').eq('id', cu.church_id).single(),
  ]);

  if (memberRes.error || !memberRes.data) return Response.json({ error: 'Member not found' }, { status: 404 });
  if (deptRes.error || !deptRes.data) return Response.json({ error: 'Department not found' }, { status: 404 });
  if (!memberRes.data.email) return Response.json({ error: 'Member has no email address on file' }, { status: 400 });

  const member = memberRes.data;
  const dept = deptRes.data;
  const churchName = churchRes.data?.name ?? 'Your Church';

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://shepherd-well.vercel.app';
  const acceptUrl = `${siteUrl}/accept-invite?department_id=${departmentId}`;
  const redirectTo = `${siteUrl}/auth/callback?next=${encodeURIComponent(acceptUrl)}`;

  // Generate Supabase magic link
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: member.email,
    options: { redirectTo },
  });

  if (linkError || !linkData?.properties?.action_link) {
    return Response.json({ error: linkError?.message ?? 'Failed to generate invite link' }, { status: 500 });
  }

  const magicLink = linkData.properties.action_link;
  const firstName = member.first_name;

  // Send invite email via Resend
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    const resend = new Resend(resendKey);
    await resend.emails.send({
      from: 'ShepherdWell <onboarding@resend.dev>',
      to: member.email,
      subject: `You've been invited to lead ${dept.name} at ${churchName}`,
      html: `
        <div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; color: #1f2937;">
          <div style="background: #1A4A2E; padding: 32px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px; font-weight: normal;">ShepherdWell</h1>
          </div>
          <div style="background: white; padding: 40px; border: 1px solid #e5e7eb; border-radius: 0 0 12px 12px;">
            <p style="font-size: 18px; margin-top: 0;">Dear ${firstName},</p>
            <p style="font-size: 16px; line-height: 1.7; color: #374151;">
              You have been invited to serve as the ministry leader for <strong>${dept.name}</strong> at <strong>${churchName}</strong>.
            </p>
            <p style="font-size: 16px; line-height: 1.7; color: #374151;">
              As a shepherd for this department, you'll help ensure every member receives regular care —
              through emails, phone calls, and personal notes — so no one in our church family feels forgotten.
            </p>
            <div style="text-align: center; margin: 40px 0;">
              <a href="${magicLink}" style="background: #1A4A2E; color: white; padding: 16px 40px; border-radius: 10px; text-decoration: none; font-size: 17px; display: inline-block;">
                Accept Invitation
              </a>
            </div>
            <p style="font-size: 14px; color: #9ca3af; line-height: 1.6;">
              This link will sign you in to ShepherdWell and take you directly to your dashboard.
              If you did not expect this invitation, you can safely ignore this email.
            </p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;" />
            <p style="font-size: 13px; color: #9ca3af; text-align: center;">
              "Be shepherds of God's flock that is under your care" — 1 Peter 5:2
            </p>
          </div>
        </div>
      `,
    });
  }

  // Upsert department leader record (link member to department for post-login setup)
  await admin.from('department_invitations').upsert({
    department_id: departmentId,
    member_id: member_id,
    church_id: cu.church_id,
    invited_email: member.email,
    invited_at: new Date().toISOString(),
  }, { onConflict: 'department_id' });

  return Response.json({ success: true });
}
