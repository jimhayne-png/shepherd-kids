import { type NextRequest } from 'next/server';
import { getAuthContext, adminClient } from '@/lib/api-auth';

export async function PATCH(request: NextRequest) {
  const auth = await getAuthContext(request);
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { recordId, touchNumber, completed } = await request.json() as {
    recordId: string;
    touchNumber: 1 | 2 | 3;
    completed: boolean;
  };

  if (!recordId || ![1, 2, 3].includes(touchNumber)) {
    return Response.json({ error: 'recordId and touchNumber (1|2|3) required' }, { status: 400 });
  }

  const admin = adminClient();
  const now = new Date().toISOString();
  const touchKey = `touch${touchNumber}_completed`;
  const touchAtKey = `touch${touchNumber}_completed_at`;

  const { data: existing } = await admin
    .from('cm_child_shepherd_touches')
    .select('id')
    .eq('church_id', auth.churchId)
    .eq('record_id', recordId)
    .maybeSingle();

  let result;
  if (existing) {
    const { data, error } = await admin
      .from('cm_child_shepherd_touches')
      .update({ [touchKey]: completed, [touchAtKey]: completed ? now : null })
      .eq('id', existing.id)
      .select('*')
      .single();
    if (error) return Response.json({ error: error.message }, { status: 400 });
    result = data;
  } else {
    const { data, error } = await admin
      .from('cm_child_shepherd_touches')
      .insert({
        church_id: auth.churchId,
        record_id: recordId,
        [touchKey]: completed,
        [touchAtKey]: completed ? now : null,
      })
      .select('*')
      .single();
    if (error) return Response.json({ error: error.message }, { status: 400 });
    result = data;
  }

  return Response.json({ touch: result });
}
