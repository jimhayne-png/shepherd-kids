import { type NextRequest } from 'next/server';
import { getAuthContext, adminClient } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { churchId } = ctx;

  const admin = adminClient();

  // Families still requiring first-visit follow-up (initial email not yet sent).
  // Children enrolled in the faith journey (all are enrolled by design).
  const [followUpRes, childrenRes] = await Promise.all([
    admin
      .from('cm_visitor_families')
      .select('id', { count: 'exact', head: true })
      .eq('church_id', churchId)
      .or('follow_up_sent.is.null,follow_up_sent.eq.false'),
    admin
      .from('cm_visitor_children')
      .select('id', { count: 'exact', head: true })
      .eq('church_id', churchId),
  ]);

  return Response.json({
    parentFirstVisitFollowUp:      followUpRes.count ?? 0,
    newChildrenFollowUp:           0, // pending: no distinct business logic yet
    kidsFaithJourney:              childrenRes.count ?? 0,
    familiesNeedingEncouragement:  0, // pending: attendance threshold not yet defined
    promotionSundayReady:          0, // pending: no promotion_ready field in DB yet
    encouragementCertificates:     0, // manual tool — no automation count
  });
}
