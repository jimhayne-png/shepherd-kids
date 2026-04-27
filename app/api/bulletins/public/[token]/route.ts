import { createClient } from '@supabase/supabase-js';
import { type NextRequest } from 'next/server';

function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const admin = adminClient();

  const { data: bulletin } = await admin.from('bulletins').select('*').eq('access_token', token).eq('status', 'published').maybeSingle();
  if (!bulletin) return Response.json({ error: 'Bulletin not found or not published' }, { status: 404 });

  const { data: church } = await admin.from('churches').select('name').eq('id', bulletin.church_id).single();

  const [sectionsRes, announcementsRes] = await Promise.all([
    admin.from('bulletin_sections').select('*').eq('bulletin_id', bulletin.id).eq('is_visible', true).order('sort_order'),
    admin.from('bulletin_announcements').select('*').eq('bulletin_id', bulletin.id).eq('is_visible', true).order('sort_order'),
  ]);

  return Response.json({
    bulletin,
    church_name: church?.name ?? 'Our Church',
    sections: sectionsRes.data ?? [],
    announcements: announcementsRes.data ?? [],
  });
}
