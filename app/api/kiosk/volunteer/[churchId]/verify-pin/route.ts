import { type NextRequest } from 'next/server';
import { adminClient } from '@/lib/api-auth';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ churchId: string }> },
) {
  const { churchId } = await params;
  const { pin } = await req.json();

  if (!pin) return Response.json({ success: false, error: 'PIN required' }, { status: 400 });

  const today = new Date().toISOString().slice(0, 10);
  const admin = adminClient();

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
