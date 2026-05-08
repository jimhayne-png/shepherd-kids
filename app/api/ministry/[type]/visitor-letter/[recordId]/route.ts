import { createClient } from '@supabase/supabase-js';
import { type NextRequest } from 'next/server';

function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

async function getAuth(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const admin = adminClient();
  const { data: { user } } = await admin.auth.getUser(token);
  if (!user) return null;
  const { data } = await admin.from('church_users').select('church_id').eq('user_id', user.id).maybeSingle();
  if (!data?.church_id) return null;
  return { userId: user.id, churchId: data.church_id as string };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string; recordId: string }> }
) {
  const { type, recordId } = await params;
  const auth = await getAuth(request);
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = adminClient();

  const { data: record } = await admin
    .from('ministry_checkin_records')
    .select('*')
    .eq('id', recordId)
    .eq('church_id', auth.churchId)
    .maybeSingle();

  if (!record) return Response.json({ error: 'Record not found' }, { status: 404 });

  const { data: session } = await admin
    .from('ministry_checkin_sessions')
    .select('service_name, date')
    .eq('id', record.session_id)
    .maybeSingle();

  const { data: logEntry } = await admin
    .from('ministry_followup_log')
    .select('personalized_message')
    .eq('record_id', recordId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: church } = await admin
    .from('churches')
    .select('name')
    .eq('id', auth.churchId)
    .maybeSingle();

  const ministryMap: Record<string, string> = { childrens: "Children's Ministry", 'middle-school': "Middle School Ministry", 'high-school': "High School Ministry", 'young-adults': "Young Adults Ministry", mens: "Men's Ministry", womens: "Women's Ministry", seniors: "Senior Ministry", ushers: "Ushers Ministry", drama: "Drama Ministry", 'music-choir': "Music & Choir Ministry" };
  const ministryName = ministryMap[type] ?? `${type} Ministry`;

  return Response.json({
    record,
    session: session ?? null,
    followupLog: logEntry ?? null,
    churchName: church?.name ?? 'Our Church',
    ministryName,
  });
}
