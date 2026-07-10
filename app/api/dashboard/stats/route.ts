import { type NextRequest } from 'next/server';
import { getAuthContext, adminClient } from '@/lib/api-auth';
import { getReviewStatus } from '@/lib/family-safety-review';

export async function GET(request: NextRequest) {
  const ctx = await getAuthContext(request);
  if (!ctx) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = adminClient();
  const { churchId } = ctx;

  const [familiesCountRes, childrenRes, familiesDataRes, reviewsRes] = await Promise.all([
    admin
      .from('cm_visitor_families')
      .select('id', { count: 'exact', head: true })
      .eq('church_id', churchId),
    admin
      .from('cm_visitor_children')
      .select('id', { count: 'exact', head: true })
      .eq('church_id', churchId),
    admin
      .from('cm_visitor_families')
      .select('id, visit_date, created_at')
      .eq('church_id', churchId),
    admin
      .from('cm_family_safety_reviews')
      .select('family_id, completed_at')
      .eq('church_id', churchId)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false }),
  ]);

  // Build most-recent-review map
  const lastReviewMap = new Map<string, string>();
  for (const r of reviewsRes.data ?? []) {
    if (!lastReviewMap.has(r.family_id)) {
      lastReviewMap.set(r.family_id, r.completed_at);
    }
  }

  // Count families whose review is due or overdue
  const now = new Date();
  let familySafetyReviewsDue = 0;
  for (const family of familiesDataRes.data ?? []) {
    const regDate: string | null = family.visit_date ?? family.created_at?.slice(0, 10) ?? null;
    if (!regDate) continue;
    const { status } = getReviewStatus(regDate, lastReviewMap.get(family.id) ?? null, now);
    if (status === 'due' || status === 'overdue') familySafetyReviewsDue++;
  }

  return Response.json({
    activeFamilies: familiesCountRes.count ?? 0,
    totalChildren: childrenRes.count ?? 0,
    familyCareNeeds: 0,
    familySafetyReviewsDue,
  });
}
