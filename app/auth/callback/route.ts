import { createClient } from '@supabase/supabase-js';
import { type NextRequest } from 'next/server';
import { redirect } from 'next/navigation';

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const next = request.nextUrl.searchParams.get('next');

  if (code) {
    const authClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data } = await authClient.auth.exchangeCodeForSession(code);

    if (data.user) {
      const admin = adminClient();
      const { data: cu } = await admin
        .from('church_users')
        .select('role')
        .eq('user_id', data.user.id)
        .maybeSingle();

      if (cu?.role === 'admin') {
        redirect('/dashboard');
      } else if (cu?.role === 'ministry_leader') {
        const { data: dl } = await admin
          .from('department_leaders')
          .select('department_id')
          .eq('user_id', data.user.id)
          .maybeSingle();
        if (dl?.department_id) {
          redirect(`/shepherd/${dl.department_id}`);
        }
      } else if (!cu && next) {
        redirect(next);
      }
    }
  }

  redirect(next ?? '/dashboard');
}
