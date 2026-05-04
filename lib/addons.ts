import { createClient } from '@supabase/supabase-js';

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function hasMinistryPro(churchId: string): Promise<boolean> {
  const { data } = await adminClient()
    .from('church_addons')
    .select('active')
    .eq('church_id', churchId)
    .eq('addon_key', 'ministry_pro')
    .maybeSingle();
  return data?.active === true;
}
