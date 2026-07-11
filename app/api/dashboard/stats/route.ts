import { type NextRequest } from 'next/server';
import { getAuthContext, adminClient } from '@/lib/api-auth';
import { getReviewStatus } from '@/lib/family-safety-review';

export async function GET(request: NextRequest) {
  const ctx = await getAuthContext(request);
  if (!ctx) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = adminClient();
  const { churchId } = ctx;
  const now = new Date();

  const fortyTwoDaysAgo = new Date(now.getTime() - 42 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const sevenDaysAgo    = new Date(now.getTime() -  7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [familiesCountRes, childrenRes, familiesDataRes, reviewsRes, candidateFamiliesRes] = await Promise.all([
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
    // Families in the 7–42 day "waiting to return" window
    admin
      .from('cm_visitor_families')
      .select('id, parent1_phone, parent2_phone, visit_date')
      .eq('church_id', churchId)
      .gte('visit_date', fortyTwoDaysAgo)
      .lte('visit_date', sevenDaysAgo),
  ]);

  // Build most-recent-review map
  const lastReviewMap = new Map<string, string>();
  for (const r of reviewsRes.data ?? []) {
    if (!lastReviewMap.has(r.family_id)) {
      lastReviewMap.set(r.family_id, r.completed_at);
    }
  }

  // Count families whose review is due or overdue
  let familySafetyReviewsDue = 0;
  for (const family of familiesDataRes.data ?? []) {
    const regDate: string | null = family.visit_date ?? family.created_at?.slice(0, 10) ?? null;
    if (!regDate) continue;
    const { status } = getReviewStatus(regDate, lastReviewMap.get(family.id) ?? null, now);
    if (status === 'due' || status === 'overdue') familySafetyReviewsDue++;
  }

  // Compute waitingVisitors: candidate families with no return attendance after visit_date
  let waitingVisitors = 0;
  const candidateFamilies = candidateFamiliesRes.data ?? [];
  if (candidateFamilies.length > 0) {
    const phones = [
      ...new Set(
        candidateFamilies
          .flatMap((f) => [f.parent1_phone as string | null, f.parent2_phone as string | null])
          .map((p) => String(p ?? "").replace(/\D/g, ""))
          .filter(Boolean),
      ),
    ];

    if (phones.length > 0) {
      const { data: recs } = await admin
        .from('cm_checkin_records')
        .select('session_id, parent_phone')
        .eq('church_id', churchId)
        .in('parent_phone', phones);

      const sessIds = [...new Set((recs ?? []).map((r) => r.session_id as string).filter(Boolean))];
      const { data: sess } = sessIds.length
        ? await admin.from('cm_checkin_sessions').select('id, date').in('id', sessIds)
        : { data: [] };

      const sessByPhone = new Map<string, string[]>();
      const sessDateMap = new Map<string, string>();
      for (const s of sess ?? []) sessDateMap.set(s.id as string, s.date as string);
      for (const r of recs ?? []) {
        const ph = String((r.parent_phone as string | null) ?? "").replace(/\D/g, "");
        const dt = r.session_id ? sessDateMap.get(r.session_id as string) : undefined;
        if (!ph || !dt) continue;
        if (!sessByPhone.has(ph)) sessByPhone.set(ph, []);
        sessByPhone.get(ph)!.push(dt);
      }

      for (const f of candidateFamilies) {
        const ph = String((f.parent1_phone as string | null) ?? "").replace(/\D/g, "");
        const visitDate = (f.visit_date ?? "") as string;
        const dates = sessByPhone.get(ph) ?? [];
        const hasReturn = dates.some((d) => d > visitDate);
        if (!hasReturn) waitingVisitors++;
      }
    } else {
      waitingVisitors = candidateFamilies.length;
    }
  }

  return Response.json({
    activeFamilies: familiesCountRes.count ?? 0,
    totalChildren: childrenRes.count ?? 0,
    familyCareNeeds: 0,
    familySafetyReviewsDue,
    waitingVisitors,
  });
}
