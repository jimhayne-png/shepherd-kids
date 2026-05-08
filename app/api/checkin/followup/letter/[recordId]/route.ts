import { createClient } from '@supabase/supabase-js';
import { type NextRequest } from 'next/server';

function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

export async function GET(_req: NextRequest, ctx: RouteContext<'/api/checkin/followup/letter/[recordId]'>) {
  const { recordId } = await ctx.params;
  const admin = adminClient();

  const { data: record } = await admin
    .from('cm_checkin_records')
    .select('*')
    .eq('id', recordId)
    .maybeSingle();

  if (!record) return new Response('Record not found', { status: 404 });

  // Get all children in this family (same session + phone)
  const { data: siblings } = await admin
    .from('cm_checkin_records')
    .select('child_name, room_id')
    .eq('session_id', record.session_id)
    .eq('parent_phone', record.parent_phone)
    .order('child_name');

  const roomIds = [...new Set((siblings ?? []).map((s: any) => s.room_id).filter(Boolean) as string[])];
  const roomNameMap: Record<string, string> = {};
  if (roomIds.length) {
    const { data: rooms } = await admin.from('cm_checkin_rooms').select('id, name').in('id', roomIds);
    for (const r of rooms ?? []) roomNameMap[r.id] = r.name;
  }

  const { data: session } = await admin
    .from('cm_checkin_sessions')
    .select('service_name, date')
    .eq('id', record.session_id)
    .maybeSingle();

  const { data: church } = await admin
    .from('churches')
    .select('name')
    .eq('id', record.church_id)
    .maybeSingle();

  const churchName = church?.name ?? 'Our Church';
  const parentFirstName = record.parent_name.split(' ')[0] || record.parent_name;
  const serviceDateStr = session?.date
    ? new Date(session.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : 'Sunday';
  const todayStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const childRows = (siblings ?? []).map((s: any) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#374151;">${s.child_name}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#6b7280;">${s.room_id ? (roomNameMap[s.room_id] ?? '—') : '—'}</td>
    </tr>`).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Welcome Letter — ${record.parent_name}</title>
  <style>
    @media print {
      body { margin: 0; }
      .no-print { display: none !important; }
    }
    body { font-family: Georgia, serif; color: #1f2937; background: white; margin: 0; padding: 0; }
    .page { max-width: 680px; margin: 0 auto; padding: 60px 60px 80px; }
    .letterhead { border-bottom: 3px solid #F28C28; padding-bottom: 20px; margin-bottom: 32px; display: flex; align-items: center; justify-content: space-between; }
    .church-name { font-size: 22px; font-weight: bold; color: #1f2937; }
    .church-sub { font-size: 13px; color: #9ca3af; margin-top: 2px; }
    .date { font-size: 14px; color: #6b7280; text-align: right; }
    .salutation { font-size: 16px; margin: 0 0 20px; }
    p { font-size: 15px; line-height: 1.8; margin: 0 0 16px; color: #374151; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0 28px; }
    th { background: #F28C28; color: white; text-align: left; padding: 10px 12px; font-size: 13px; font-weight: bold; }
    .signature { margin-top: 40px; }
    .print-btn { position: fixed; top: 20px; right: 20px; background: #F28C28; color: white; border: none; padding: 12px 24px; border-radius: 10px; font-size: 15px; font-weight: bold; cursor: pointer; font-family: Georgia, serif; }
  </style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print()">🖨️ Print Letter</button>
  <div class="page">
    <div class="letterhead">
      <div>
        <div class="church-name">${churchName}</div>
        <div class="church-sub">Children's Ministry</div>
      </div>
      <div class="date">${todayStr}</div>
    </div>

    <p class="salutation">Dear ${record.parent_name},</p>

    <p>
      On behalf of our entire Children's Ministry team, we want to warmly welcome your family to ${churchName}.
      It was such a joy to have your children with us on <strong>${serviceDateStr}</strong>, and we pray they
      had a wonderful, memorable experience.
    </p>

    <p>Here is a summary of who attended with us:</p>

    <table>
      <thead>
        <tr>
          <th>Child</th>
          <th>Room</th>
        </tr>
      </thead>
      <tbody>
        ${childRows}
      </tbody>
    </table>

    <p>
      Our Children's Ministry meets every Sunday. We would love for your family to make ${churchName} your
      church home. Our doors are always open, and your children have a place here.
    </p>

    <p>
      If you have any questions about our programs, schedules, or how we can serve your family better,
      please don't hesitate to reach out to our Children's Ministry team.
    </p>

    <p>We look forward to seeing you again soon!</p>

    <div class="signature">
      <p style="margin:0;">With love and blessings,</p>
      <p style="margin:8px 0 0;font-weight:bold;color:#1f2937;">${churchName} Children's Ministry</p>
    </div>
  </div>
</body>
</html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
