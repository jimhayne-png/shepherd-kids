import { createClient } from '@supabase/supabase-js';
import { type NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  const { email } = await request.json();

  if (!email) {
    return Response.json({ error: 'Email is required' }, { status: 400 });
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log('Using URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);

  const { error } = await supabaseAdmin.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: 'https://shepherd-well.vercel.app',
    },
  });

  if (error) {
    console.log('Supabase error:', error.message);
    return Response.json({ error: error.message }, { status: 400 });
  }

  return Response.json({ success: true });
}
