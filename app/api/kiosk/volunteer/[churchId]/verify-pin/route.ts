import { type NextRequest } from 'next/server';
import { adminClient } from '@/lib/api-auth';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ churchId: string }> },
) {
  const { churchId } = await params;
  const { pin } = await req.json();

  if (!pin) return Response.json({ success: false, error: 'PIN required' }, { status: 400 });

  const admin = adminClient();
  const { data: church } = await admin.from('churches').select('timezone').eq('id', churchId).maybeSingle();
  const tz = (church as { timezone?: string } | null)?.timezone ?? 'America/Los_Angeles';
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date());

  const { data: sessions } = await admin
    .from('cm_checkin_sessions')
    .select('kiosk_pin')
    .eq('church_id', churchId)
    .eq('date', today)
    .eq('status', 'open');

  const match = (sessions ?? []).some(s => s.kiosk_pin === pin);

  if (match) return Response.json({ success: true });
  return Response.json({ success: false, error: 'Incorrect PIN' }, { status: 401 });
}
