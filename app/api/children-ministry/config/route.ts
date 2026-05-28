import { type NextRequest } from 'next/server';
import { getAuthContext, adminClient } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  const auth = await getAuthContext(request);
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data } = await adminClient()
    .from('cm_ministry_config')
    .select('*')
    .eq('church_id', auth.churchId)
    .maybeSingle();

  return Response.json({ config: data ?? null });
}

export async function POST(request: NextRequest) {
  const auth = await getAuthContext(request);
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { sidebarLabel, gradeLevels } = await request.json();
  if (typeof sidebarLabel !== 'string' || !Array.isArray(gradeLevels)) {
    return Response.json({ error: 'sidebarLabel and gradeLevels required' }, { status: 400 });
  }

  const { data, error } = await adminClient()
    .from('cm_ministry_config')
    .upsert(
      {
        church_id: auth.churchId,
        sidebar_label: sidebarLabel,
        grade_levels: gradeLevels,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'church_id' },
    )
    .select('*')
    .single();

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ config: data });
}
