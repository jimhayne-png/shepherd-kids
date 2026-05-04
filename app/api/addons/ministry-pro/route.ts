import { createClient } from '@supabase/supabase-js';
import { type NextRequest } from 'next/server';
import { hasMinistryPro } from '@/lib/addons';

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = adminClient();
  const { data: { user } } = await admin.auth.getUser(token);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: cu } = await admin
    .from('church_users')
    .select('church_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!cu) return Response.json({ active: false });

  const active = await hasMinistryPro(cu.church_id);
  return Response.json({ active });
}
