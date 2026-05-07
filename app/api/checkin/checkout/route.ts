import { createClient } from '@supabase/supabase-js';
import { type NextRequest } from 'next/server';

function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

export async function POST(request: NextRequest) {
  const { recordId, checkedOutBy } = await request.json();
  if (!recordId) return Response.json({ error: 'recordId required' }, { status: 400 });

  const { data, error } = await adminClient()
    .from('cm_checkin_records')
    .update({ checked_out_at: new Date().toISOString(), checked_out_by: checkedOutBy ?? 'staff' })
    .eq('id', recordId)
    .is('checked_out_at', null)
    .select('*')
    .single();

  if (error) return Response.json({ error: error.message }, { status: 400 });
  if (!data) return Response.json({ error: 'Record not found or already checked out' }, { status: 404 });
  return Response.json({ record: data });
}
