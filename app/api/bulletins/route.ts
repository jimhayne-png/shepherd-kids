import { createClient } from '@supabase/supabase-js';
import { type NextRequest } from 'next/server';

function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}
async function getAuthUser(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user } } = await adminClient().auth.getUser(token);
  return user ?? null;
}
async function getChurchId(userId: string) {
  const { data } = await adminClient().from('church_users').select('church_id').eq('user_id', userId).maybeSingle();
  return data?.church_id ?? null;
}

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const admin = adminClient();
  const { data: bulletins, error } = await admin
    .from('bulletins')
    .select('*')
    .eq('church_id', churchId)
    .order('service_date', { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 400 });

  const bulletinIds = (bulletins ?? []).map((b: any) => b.id);
  const [sectionsRes, announcementsRes] = await Promise.all([
    bulletinIds.length ? admin.from('bulletin_sections').select('bulletin_id').in('bulletin_id', bulletinIds) : { data: [] },
    bulletinIds.length ? admin.from('bulletin_announcements').select('bulletin_id').in('bulletin_id', bulletinIds) : { data: [] },
  ]);

  const sectionCount: Record<string, number> = {};
  const announcementCount: Record<string, number> = {};
  for (const s of sectionsRes.data ?? []) sectionCount[s.bulletin_id] = (sectionCount[s.bulletin_id] ?? 0) + 1;
  for (const a of announcementsRes.data ?? []) announcementCount[a.bulletin_id] = (announcementCount[a.bulletin_id] ?? 0) + 1;

  const enriched = (bulletins ?? []).map((b: any) => ({
    ...b, section_count: sectionCount[b.id] ?? 0, announcement_count: announcementCount[b.id] ?? 0,
  }));

  return Response.json({ bulletins: enriched });
}

const DEFAULT_SECTIONS = [
  { section_type: 'order_of_service', title: 'Order of Service', content: '• Welcome\n• Opening Prayer\n• Worship\n• Sermon\n• Offering\n• Closing Prayer', sort_order: 1 },
  { section_type: 'sermon', title: 'Sermon', content: '', sort_order: 2 },
  { section_type: 'scripture', title: 'Scripture Reading', content: '', sort_order: 3 },
  { section_type: 'giving', title: 'Tithes & Offerings', content: 'Thank you for your faithful giving. Every gift makes a difference.', sort_order: 4 },
  { section_type: 'prayer', title: 'Closing Prayer', content: '', sort_order: 5 },
];

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const { service_date, title } = await req.json();
  if (!service_date) return Response.json({ error: 'service_date required' }, { status: 400 });
  if (!title?.trim()) return Response.json({ error: 'title required' }, { status: 400 });

  const admin = adminClient();
  const { data: bulletin, error } = await admin.from('bulletins').insert({
    church_id: churchId, service_date, title: title.trim(), created_by: user.id,
  }).select('*').single();
  if (error) return Response.json({ error: error.message }, { status: 400 });

  await admin.from('bulletin_sections').insert(
    DEFAULT_SECTIONS.map(s => ({ ...s, church_id: churchId, bulletin_id: bulletin.id }))
  );

  return Response.json({ bulletin });
}
