import { type NextRequest } from 'next/server';
import { adminClient } from '@/lib/api-auth';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ churchId: string }> },
) {
  await params; // satisfy Next.js param contract
  const { recordId, action } = await req.json();

  if (!recordId || (action !== 'checkout' && action !== 'undo')) {
    return Response.json({ error: 'recordId and action ("checkout" | "undo") required' }, { status: 400 });
  }

  const update =
    action === 'checkout'
      ? { checked_out_at: new Date().toISOString(), checked_out_by: 'Volunteer' }
      : { checked_out_at: null, checked_out_by: null };

  const { error } = await adminClient()
    .from('cm_checkin_records')
    .update(update)
    .eq('id', recordId);

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ success: true });
}
