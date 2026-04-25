import { createClient } from '@supabase/supabase-js';
import { type NextRequest } from 'next/server';

function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization') ?? '';
  const bearerToken = authHeader.replace('Bearer ', '');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || bearerToken !== cronSecret) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = adminClient();
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  // Find all active seasons across all churches
  const { data: seasons } = await admin
    .from('children_ministry_seasons')
    .select('id, church_id')
    .eq('status', 'active');

  if (!seasons?.length) return Response.json({ sent: 0, mode: 'cron', reason: 'No active seasons' });

  let totalSent = 0;

  for (const season of seasons) {
    // Check if pastor has filled in this week's parent update
    const { data: update } = await admin
      .from('children_ministry_parent_updates')
      .select('*')
      .eq('church_id', season.church_id)
      .eq('season_id', season.id)
      .eq('session_date', todayStr)
      .is('sent_at', null)
      .maybeSingle();

    if (!update) continue; // No update for today, skip

    // Lazy import to avoid circular issues
    const { sendParentEmails } = await import('@/app/api/children-ministry/parent-update/route');

    const sent = await sendParentEmails(admin, season.church_id, season.id, todayStr, {
      memoryVerse: update.memory_verse ?? '',
      lessonSummary: update.lesson_summary ?? '',
      conversationStarter: update.conversation_starter ?? '',
      specialNotes: update.special_notes ?? '',
    }, '');

    await admin
      .from('children_ministry_parent_updates')
      .update({ sent_at: new Date().toISOString() })
      .eq('id', update.id);

    totalSent += sent;
  }

  return Response.json({ sent: totalSent, mode: 'cron' });
}
