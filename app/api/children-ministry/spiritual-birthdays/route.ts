import { type NextRequest } from 'next/server';
import { getAuthContext, adminClient } from '@/lib/api-auth';

type MilestoneRow = {
  id: string;
  child_id: string;
  completed_at: string;
  notes: string | null;
};

type ChildRow = {
  id: string;
  first_name: string;
  last_name: string;
};

export async function GET(request: NextRequest) {
  const ctx = await getAuthContext(request);
  if (!ctx) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { churchId } = ctx;

  const admin = adminClient();

  const { data, error } = await admin
    .from('faith_milestones')
    .select('id, child_id, completed_at, notes')
    .eq('church_id', churchId)
    .eq('milestone_type', 'salvation')
    .eq('is_completed', true)
    .not('child_id', 'is', null)
    .not('completed_at', 'is', null);

  if (error) return Response.json({ error: error.message }, { status: 400 });

  const rows = (data ?? []) as MilestoneRow[];
  if (!rows.length) return Response.json({ entries: [] });

  const childIds = [...new Set(rows.map((m) => m.child_id))];

  const { data: childrenData } = await admin
    .from('cm_visitor_children')
    .select('id, first_name, last_name')
    .in('id', childIds);

  const childMap: Record<string, ChildRow> = {};
  for (const c of (childrenData ?? []) as ChildRow[]) {
    childMap[c.id] = c;
  }

  const entries = rows.map((m) => ({
    id: m.id,
    child_id: m.child_id,
    completed_at: m.completed_at,
    notes: m.notes,
    first_name: childMap[m.child_id]?.first_name ?? '',
    last_name: childMap[m.child_id]?.last_name ?? '',
  }));

  return Response.json({ entries });
}
