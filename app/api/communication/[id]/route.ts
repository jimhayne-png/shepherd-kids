import { createClient } from '@supabase/supabase-js';
import { type NextRequest } from 'next/server';

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const cu = await getChurchUser(user.id);
  if (!cu) return Response.json({ error: 'No church found' }, { status: 403 });

  const { data, error } = await adminClient()
    .from('communication_posts')
    .select(`id, title, body, status, scheduled_at, notify_email, published_at, read_count, created_at, author_email, department_id, departments(name, icon, color)`)
    .eq('id', id)
    .eq('church_id', cu.church_id)
    .single();

  if (error) return Response.json({ error: error.message }, { status: 404 });
  return Response.json({ post: data });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const cu = await getChurchUser(user.id);
  if (!cu) return Response.json({ error: 'No church found' }, { status: 403 });

  const body = await request.json();
  const { title, postBody, departmentId, status, scheduledAt, notifyEmail } = body;

  const updates: Record<string, any> = {};
  if (title !== undefined) updates.title = title.trim();
  if (postBody !== undefined) updates.body = postBody.trim();
  if (departmentId !== undefined) updates.department_id = departmentId || null;
  if (status !== undefined) {
    updates.status = status;
    if (status === 'published' && !updates.published_at) {
      updates.published_at = new Date().toISOString();
    }
  }
  if (scheduledAt !== undefined) updates.scheduled_at = scheduledAt || null;
  if (notifyEmail !== undefined) updates.notify_email = notifyEmail;

  const { error } = await adminClient()
    .from('communication_posts')
    .update(updates)
    .eq('id', id)
    .eq('church_id', cu.church_id);

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ success: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const cu = await getChurchUser(user.id);
  if (!cu) return Response.json({ error: 'No church found' }, { status: 403 });

  const { error } = await adminClient()
    .from('communication_posts')
    .delete()
    .eq('id', id)
    .eq('church_id', cu.church_id);

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ success: true });
}
