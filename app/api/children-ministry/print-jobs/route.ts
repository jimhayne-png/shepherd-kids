import { type NextRequest } from 'next/server';
import { getAuthContext, adminClient } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  const auth = await getAuthContext(req);
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = adminClient();

  const [{ data: jobs, error }, { data: rooms }, { data: church }] = await Promise.all([
    admin
      .from('cm_label_print_jobs')
      .select('*')
      .eq('church_id', auth.churchId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true }),
    admin
      .from('cm_checkin_rooms')
      .select('id, name')
      .eq('church_id', auth.churchId),
    admin
      .from('churches')
      .select('name')
      .eq('id', auth.churchId)
      .maybeSingle(),
  ]);

  if (error) return Response.json({ error: error.message }, { status: 400 });

  const roomMap = Object.fromEntries((rooms ?? []).map((r) => [r.id, r.name]));
  const churchName = (church as { name?: string | null } | null)?.name ?? '';

  const enriched = (jobs ?? []).map((job) => ({
    ...job,
    room_name: job.room_id ? (roomMap[job.room_id] ?? null) : null,
    church_name: churchName,
  }));

  return Response.json({ jobs: enriched });
}

export async function POST(req: NextRequest) {
  const auth = await getAuthContext(req);
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { ids } = (await req.json()) as { ids?: string[] };
  if (!ids?.length) return Response.json({ error: 'ids required' }, { status: 400 });

  const admin = adminClient();
  const { error } = await admin
    .from('cm_label_print_jobs')
    .update({ status: 'printed', printed_at: new Date().toISOString() })
    .in('id', ids)
    .eq('church_id', auth.churchId);

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ updated: ids.length });
}
