import { adminClient } from '@/lib/api-auth';

export async function getFamilyForChurch(familyId: string, churchId: string) {
  const admin = adminClient();
  const { data } = await admin
    .from('cm_visitor_families')
    .select('id')
    .eq('id', familyId)
    .eq('church_id', churchId)
    .maybeSingle();
  return data as { id: string } | null;
}

export async function getActorName(userId: string): Promise<string | null> {
  const admin = adminClient();
  const { data } = await admin.auth.admin.getUserById(userId);
  const meta = data?.user?.user_metadata as Record<string, string> | null;
  return meta?.full_name ?? data?.user?.email ?? null;
}

export async function logChurchAudit(opts: {
  churchId: string;
  actorId: string;
  actorEmail?: string | null;
  action: string;
  targetId?: string;
  details?: Record<string, unknown>;
}) {
  const admin = adminClient();
  await admin.from('church_audit_logs').insert({
    church_id: opts.churchId,
    actor_id: opts.actorId,
    actor_email: opts.actorEmail ?? null,
    action: opts.action,
    target_id: opts.targetId ?? null,
    details: opts.details ?? null,
  });
}
