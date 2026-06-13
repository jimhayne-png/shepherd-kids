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
  const todayStr = new Date().toISOString().slice(0, 10);

  const { data: updates } = await admin
    .from('children_ministry_parent_updates')
    .select('*')
    .eq('session_date', todayStr)
    .is('sent_at', null);

  if (!updates?.length) return Response.json({ sent: 0, mode: 'cron', reason: 'No pending updates for today' });

  let totalSent = 0;

  for (const update of updates) {
    const { sendParentEmails } = await import('@/app/api/children-ministry/parent-update/route');

    const sent = await sendParentEmails(admin, update.church_id, todayStr, {
      memoryVerse: update.memory_verse ?? '',
      lessonSummary: update.lesson_summary ?? '',
      conversationStarter: update.conversation_starter ?? '',
      specialNotes: update.special_notes ?? '',
    });

    await admin
      .from('children_ministry_parent_updates')
      .update({ sent_at: new Date().toISOString() })
      .eq('id', update.id);

    totalSent += sent;
  }

  return Response.json({ sent: totalSent, mode: 'cron' });
}
