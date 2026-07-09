import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient as createSSRClient } from '@/lib/supabase/server';
import { type NextRequest } from 'next/server';

const MASTER_ADMIN_EMAIL = 'jim@gratefulconsultinggroup.com';

export function adminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export type AuthContext = { userId: string; churchId: string };

function isAllowedMasterAdmin(email: string) {
  const masterAdminEnv = (process.env.MASTER_ADMIN_EMAIL ?? '').trim().toLowerCase();
  const ownerEmails = (process.env.OWNER_EMAILS ?? '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);

  const allowed = new Set([
    MASTER_ADMIN_EMAIL,
    masterAdminEnv,
    ...ownerEmails,
  ].filter(Boolean));

  return allowed.has(email.toLowerCase());
}

export async function getAuthContext(request: NextRequest): Promise<AuthContext | null> {
  const admin = adminClient();
  let userId: string | null = null;

  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (token) {
    const { data: { user } } = await admin.auth.getUser(token);
    userId = user?.id ?? null;
  }

  if (!userId) {
    const ssrClient = await createSSRClient();
    const { data: { user } } = await ssrClient.auth.getUser();
    userId = user?.id ?? null;
  }

  if (!userId) return null;

  const selectedChurchId = request.headers.get('x-selected-church-id');

  if (selectedChurchId) {
    const { data: { user } } = await admin.auth.admin.getUserById(userId);
    const email = user?.email ?? '';

    if (email && isAllowedMasterAdmin(email)) {
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

  const { data } = await admin
    .from('church_users')
    .select('church_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (!data?.church_id) return null;

  return { userId, churchId: data.church_id as string };
}