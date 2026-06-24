import { type NextRequest } from 'next/server';
import { getAuthContext, adminClient } from '@/lib/api-auth';

// GET — return wizard state, creating the row if it doesn't exist yet.
export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = adminClient();

  // Upsert so the row always exists after this call.
  await admin.from('church_setup_wizard').upsert(
    { church_id: ctx.churchId },
    { onConflict: 'church_id', ignoreDuplicates: true }
  );

  const { data, error } = await admin
    .from('church_setup_wizard')
    .select('current_step, completed_steps, is_complete')
    .eq('church_id', ctx.churchId)
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ wizard: data });
}

// PATCH — advance step, mark complete, or reset.
// Body: { action: 'complete_step', step: number }
//       { action: 'go_to_step',    step: number }
//       { action: 'complete' }
//       { action: 'reset' }
export async function PATCH(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { action, step } = body as { action?: string; step?: number };

  const admin = adminClient();

  // Ensure row exists first.
  await admin.from('church_setup_wizard').upsert(
    { church_id: ctx.churchId },
    { onConflict: 'church_id', ignoreDuplicates: true }
  );

  const { data: current } = await admin
    .from('church_setup_wizard')
    .select('current_step, completed_steps, is_complete')
    .eq('church_id', ctx.churchId)
    .single();

  if (!current) return Response.json({ error: 'Wizard not found' }, { status: 404 });

  let update: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (action === 'complete_step' && typeof step === 'number') {
    const done = new Set<number>(current.completed_steps ?? []);
    done.add(step);
    const nextStep = step + 1;
    update = {
      ...update,
      completed_steps: Array.from(done),
      current_step: Math.max(current.current_step, nextStep),
    };
  } else if (action === 'go_to_step' && typeof step === 'number') {
    update = { ...update, current_step: step };
  } else if (action === 'complete') {
    const allSteps = [1, 2, 3, 4, 5, 6, 7, 8];
    update = {
      ...update,
      completed_steps: allSteps,
      current_step: 8,
      is_complete: true,
    };
  } else if (action === 'reset') {
    update = {
      ...update,
      current_step: 1,
      completed_steps: [],
      is_complete: false,
    };
  } else {
    return Response.json({ error: 'Invalid action' }, { status: 400 });
  }

  const { data, error } = await admin
    .from('church_setup_wizard')
    .update(update)
    .eq('church_id', ctx.churchId)
    .select('current_step, completed_steps, is_complete')
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ wizard: data });
}
