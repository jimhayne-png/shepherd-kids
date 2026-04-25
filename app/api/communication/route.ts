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

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const cu = await getChurchUser(user.id);
  if (!cu) return Response.json({ error: 'No church found' }, { status: 403 });

  const departmentId = request.nextUrl.searchParams.get('department_id');
  const admin = adminClient();

  let query = admin
    .from('communication_posts')
    .select(`
      id, title, body, status, scheduled_at, notify_email,
      published_at, read_count, created_at, author_email,
      department_id, departments(name, icon, color)
    `)
    .eq('church_id', cu.church_id)
    .order('created_at', { ascending: false });

  if (departmentId === 'church_wide') {
    query = query.is('department_id', null);
  } else if (departmentId) {
    query = query.eq('department_id', departmentId);
  }

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 400 });

  return Response.json({ posts: data ?? [] });
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const cu = await getChurchUser(user.id);
  if (!cu) return Response.json({ error: 'No church found' }, { status: 403 });

  const body = await request.json();
  const { title, postBody, departmentId, status, scheduledAt, notifyEmail } = body;

  if (!title?.trim()) return Response.json({ error: 'Title is required' }, { status: 400 });
  if (!postBody?.trim()) return Response.json({ error: 'Message body is required' }, { status: 400 });

  const admin = adminClient();

  const insertData: Record<string, any> = {
    church_id: cu.church_id,
    title: title.trim(),
    body: postBody.trim(),
    department_id: departmentId || null,
    status: status ?? 'published',
    scheduled_at: scheduledAt || null,
    notify_email: notifyEmail ?? true,
    author_email: user.email ?? '',
    published_at: status !== 'draft' && status !== 'scheduled' ? new Date().toISOString() : null,
    read_count: 0,
  };

  const { data: post, error: insertError } = await admin
    .from('communication_posts')
    .insert(insertData)
    .select('id')
    .single();

  if (insertError) return Response.json({ error: insertError.message }, { status: 400 });

  // Send emails if published and notify_email = true
  if (insertData.status === 'published' && notifyEmail) {
    try {
      const resendKey = process.env.RESEND_API_KEY;
      if (!resendKey) throw new Error('No Resend key');

      const { data: church } = await admin.from('churches').select('name').eq('id', cu.church_id).single();
      const churchName = church?.name ?? 'Your Church';

      let recipientEmails: string[] = [];

      if (!departmentId) {
        // Church-wide: all members with email
        const { data: members } = await admin
          .from('members')
          .select('email')
          .eq('church_id', cu.church_id)
          .not('email', 'is', null);
        recipientEmails = (members ?? []).map((m: any) => m.email).filter(Boolean);
      } else {
        // Department members only
        const { data: deptMembers } = await admin
          .from('member_departments')
          .select('members(email)')
          .eq('department_id', departmentId);
        recipientEmails = (deptMembers ?? [])
          .map((m: any) => m.members?.email)
          .filter(Boolean);
      }

      if (recipientEmails.length > 0) {
        const resend = new Resend(resendKey);
        await resend.emails.send({
          from: 'ShepherdWell <onboarding@resend.dev>',
          to: recipientEmails,
          subject: `${churchName} — ${title.trim()}`,
          html: `
            <div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; color: #1f2937;">
              <div style="background: #1A4A2E; padding: 28px 32px; border-radius: 12px 12px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 22px; font-weight: normal;">${churchName}</h1>
              </div>
              <div style="background: white; padding: 36px 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
                <h2 style="color: #1A4A2E; font-size: 22px; margin: 0 0 20px; font-weight: bold;">${title.trim()}</h2>
                <div style="font-size: 16px; line-height: 1.7; color: #374151; white-space: pre-wrap;">${postBody.trim()}</div>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 28px 0;" />
                <p style="font-size: 13px; color: #9ca3af; text-align: center;">Sent via ShepherdWell</p>
              </div>
            </div>
          `,
        });
      }
    } catch (_) {
      // Email failure never blocks post creation
    }
  }

  return Response.json({ success: true, id: post.id });
}
