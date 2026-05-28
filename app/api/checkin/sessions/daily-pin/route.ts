import { type NextRequest } from 'next/server';
import { getAuthContext, adminClient } from '@/lib/api-auth';

export async function PATCH(request: NextRequest) {
  const auth = await getAuthContext(request);
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { date, pin } = await request.json();

  if (!date) return Response.json({ error: 'date required' }, { status: 400 });
  if (!pin || !/^\d{4}$/.test(pin)) {
    return Response.json({ error: 'PIN must be exactly 4 digits' }, { status: 400 });
  }

  const { data, error } = await adminClient()
    .from('cm_checkin_sessions')
    .update({ kiosk_pin: pin })
    .eq('church_id', auth.churchId)
    .eq('date', date)
    .select('id');

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ success: true, updated: data?.length ?? 0 });
}
