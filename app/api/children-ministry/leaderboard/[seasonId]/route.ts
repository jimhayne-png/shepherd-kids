import { createClient } from '@supabase/supabase-js';
import { type NextRequest } from 'next/server';

function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

// Public endpoint — no auth required (seasonId scopes access)
export async function GET(_request: NextRequest, { params }: { params: Promise<{ seasonId: string }> }) {
  const { seasonId } = await params;

  const admin = adminClient();

  const [seasonRes, teamsRes] = await Promise.all([
    admin.from('children_ministry_seasons').select('*').eq('id', seasonId).maybeSingle(),
    admin.from('children_ministry_teams').select(`
      id, name, color, mascot, total_points, member_count,
      captain:captain_child_id(first_name, last_name),
      co_captain:co_captain_child_id(first_name, last_name)
    `).eq('season_id', seasonId).order('total_points', { ascending: false }),
  ]);

  if (!seasonRes.data) return Response.json({ error: 'Season not found' }, { status: 404 });

  return Response.json({
    season: seasonRes.data,
    teams: teamsRes.data ?? [],
    refreshedAt: new Date().toISOString(),
  });
}
