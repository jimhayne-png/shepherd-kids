import { type NextRequest } from 'next/server';
import { getAuthContext, adminClient } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  const ctx = await getAuthContext(request);
  if (!ctx) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = adminClient();
  const { churchId } = ctx;

  const [familiesRes, childrenRes] = await Promise.all([
    admin
      .from('cm_visitor_families')
      .select('id', { count: 'exact', head: true })
      .eq('church_id', churchId),
    admin
      .from('cm_visitor_children')
      .select('id', { count: 'exact', head: true })
      .eq('church_id', churchId),
  ]);

  return Response.json({
    activeFamilies: familiesRes.count ?? 0,
    totalChildren: childrenRes.count ?? 0,
    familyCareNeeds: 0,
  });
}
