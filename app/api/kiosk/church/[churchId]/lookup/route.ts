import { type NextRequest } from 'next/server';
import { adminClient } from '@/lib/api-auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ churchId: string }> },
) {
  const { churchId } = await params;
  const phone = req.nextUrl.searchParams.get('phone');
  if (!phone) return Response.json({ error: 'phone required' }, { status: 400 });

  const normalizedPhone = phone.replace(/\D/g, '');
  const admin = adminClient();

  const { data: records } = await admin
    .from('cm_checkin_records')
    .select('parent_name, parent_phone, child_name, date_of_birth')
    .eq('church_id', churchId)
    .eq('parent_phone', normalizedPhone)
    .order('checked_in_at', { ascending: false })
    .limit(20);

  if (!records?.length) return Response.json({ found: false });

  const first = records[0];
  const parts = (first.parent_name ?? '').trim().split(/\s+/);
  const parentFirstName = parts[0] ?? '';
  const parentLastName = parts.slice(1).join(' ');

  const seen = new Set<string>();
  const children: { name: string; dateOfBirth: string | null }[] = [];
  for (const r of records) {
    if (!seen.has(r.child_name)) {
      seen.add(r.child_name);
      children.push({ name: r.child_name, dateOfBirth: r.date_of_birth ?? null });
    }
  }

  return Response.json({ found: true, parentFirstName, parentLastName, parentPhone: first.parent_phone, children });
}
