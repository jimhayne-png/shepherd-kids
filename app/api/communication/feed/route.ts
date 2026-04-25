import { createClient } from '@supabase/supabase-js';
import { type NextRequest } from 'next/server';

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Public endpoint — authenticated via member portal_token
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  if (!token) return Response.json({ error: 'token required' }, { status: 400 });

  const admin = adminClient();

  // Look up member by portal_token
  const { data: member } = await admin
    .from('members')
    .select('id, church_id, first_name, last_name')
    .eq('portal_token', token)
    .maybeSingle();

  if (!member) return Response.json({ error: 'Invalid token' }, { status: 404 });

  // Get member's department IDs
  const { data: deptMemberships } = await admin
    .from('member_departments')
    .select('department_id')
    .eq('member_id', member.id);

  const deptIds = (deptMemberships ?? []).map((d: any) => d.department_id);

  // Fetch church-wide posts + department posts the member belongs to
  const { data: posts, error } = await admin
    .from('communication_posts')
    .select(`id, title, body, published_at, created_at, department_id, departments(name, icon)`)
    .eq('church_id', member.church_id)
    .eq('status', 'published')
    .or(
      deptIds.length > 0
        ? `department_id.is.null,department_id.in.(${deptIds.join(',')})`
        : 'department_id.is.null'
    )
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return Response.json({ error: error.message }, { status: 400 });

  return Response.json({
    member_name: `${member.first_name} ${member.last_name}`,
    posts: posts ?? [],
  });
}
