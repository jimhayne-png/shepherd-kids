import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient as createSSRClient } from '@/lib/supabase/server';
import { type NextRequest } from 'next/server';

export function adminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export type AuthContext = { userId: string; churchId: string };

/**
 * Resolves the authenticated user and their church_id from a route handler request.
 *
 * Auth resolution order:
 * 1. Bearer token (kiosk / cron / legacy callers that still send Authorization headers)
 * 2. SSR cookie session (dashboard pages that send credentials: "include")
 *
 * Church resolution order:
 * 1. If user is a platform admin AND x-selected-church-id header is present,
 *    that church_id is used directly (platform admin impersonation).
 * 2. Otherwise, looks up church_id from church_users for the authenticated user.
 */
export async function getAuthContext(request: NextRequest): Promise<AuthContext | null> {
  const admin = adminClient();
  let userId: string | null = null;

  // 1. Try Bearer token first (kiosk, cron, and other server-to-server callers)
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (token) {
    const { data: { user } } = await admin.auth.getUser(token);
    userId = user?.id ?? null;
  }

  // 2. Fall back to SSR cookie session (browser dashboard)
  if (!userId) {
    const ssrClient = await createSSRClient();
    const { data: { user } } = await ssrClient.auth.getUser();
    userId = user?.id ?? null;
  }

  if (!userId) return null;

  // 3. Platform admin church override via x-selected-church-id header
  const selectedChurchId = request.headers.get('x-selected-church-id');
  if (selectedChurchId) {
    const { data: adminRow } = await admin
      .from('platform_admins')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();

    if (adminRow) {
      const { data: church } = await admin
        .from('churches')
        .select('id')
        .eq('id', selectedChurchId)
        .maybeSingle();

      if (church) {
        return { userId, churchId: selectedChurchId };
      }
    }
  }

  // 4. Normal church_users lookup
  const { data } = await admin
    .from('church_users')
    .select('church_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (!data?.church_id) return null;
  return { userId, churchId: data.church_id as string };
}
