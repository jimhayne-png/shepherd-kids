import { createClient } from '@supabase/supabase-js';
import { type NextRequest } from 'next/server';
import { Resend } from 'resend';

function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

// GET — validate token, return church info for welcome screen
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const admin = adminClient();

  const { data: tokenRow } = await admin
    .from('cm_visitor_checkin_tokens')
    .select('id, church_id, label, is_active')
    .eq('token', token)
    .maybeSingle();

  if (!tokenRow || !tokenRow.is_active) {
    return Response.json({ error: 'Check-in point not found or inactive' }, { status: 404 });
  }

  const { data: church } = await admin
    .from('churches')
    .select('name')
    .eq('id', tokenRow.church_id)
    .single();

  return Response.json({
    church_name: church?.name ?? 'Our Church',
    label: tokenRow.label,
    church_id: tokenRow.church_id,
  });
}

// POST — submit family + children, send welcome email
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const admin = adminClient();

  const { data: tokenRow } = await admin
    .from('cm_visitor_checkin_tokens')
    .select('church_id, is_active')
    .eq('token', token)
    .maybeSingle();

  if (!tokenRow || !tokenRow.is_active) {
    return Response.json({ error: 'Invalid check-in point' }, { status: 404 });
  }

  const body = await req.json();
  const {
    parent1_first_name, parent1_last_name, parent1_email, parent1_phone,
    parent2_first_name, parent2_last_name, parent2_email, parent2_phone,
    how_did_you_hear, children = [],
  } = body;

  if (!parent1_first_name?.trim() || !parent1_last_name?.trim()) {
    return Response.json({ error: 'Parent first and last name required' }, { status: 400 });
  }
  if (!children.length) {
    return Response.json({ error: 'At least one child is required' }, { status: 400 });
  }

  const churchId = tokenRow.church_id;

  // Create family record
  const { data: family, error: familyErr } = await admin
    .from('cm_visitor_families')
    .insert({
      church_id: churchId,
      parent1_first_name: parent1_first_name.trim(),
      parent1_last_name: parent1_last_name.trim(),
      parent1_email: parent1_email?.trim() || null,
      parent1_phone: parent1_phone?.trim() || null,
      parent2_first_name: parent2_first_name?.trim() || null,
      parent2_last_name: parent2_last_name?.trim() || null,
      parent2_email: parent2_email?.trim() || null,
      parent2_phone: parent2_phone?.trim() || null,
      how_did_you_hear: how_did_you_hear?.trim() || null,
      visit_date: new Date().toISOString().slice(0, 10),
    })
    .select('id')
    .single();

  if (familyErr || !family) {
    return Response.json({ error: familyErr?.message ?? 'Failed to create record' }, { status: 400 });
  }

  // Create child records
  const childRows = children.map((c: any) => ({
    church_id: churchId,
    family_id: family.id,
    first_name: c.first_name?.trim() ?? '',
    last_name: c.last_name?.trim() ?? (parent1_last_name?.trim() ?? ''),
    date_of_birth: c.date_of_birth || null,
    grade: c.grade?.trim() || null,
    allergies: c.allergies?.trim() || null,
    medical_notes: c.medical_notes?.trim() || null,
    special_instructions: c.special_instructions?.trim() || null,
  })).filter((c: any) => c.first_name);

  if (childRows.length) {
    await admin.from('cm_visitor_children').insert(childRows);
  }

  // Mark welcome email as sent
  const recipients: string[] = [parent1_email, parent2_email].filter(Boolean) as string[];

  if (recipients.length && process.env.RESEND_API_KEY) {
    try {
      const { data: church } = await admin.from('churches').select('name').eq('id', churchId).single();
      const churchName = church?.name ?? 'Our Church';
      const childNames = childRows.map((c: any) => c.first_name).join(', ');
      const date = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

      const html = `
<div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#1f2937;">
  <div style="background:#F28C28;padding:28px 32px;border-radius:12px 12px 0 0;text-align:center;">
    <h1 style="color:white;margin:0;font-size:24px;font-weight:bold;">${churchName}</h1>
    <p style="color:rgba(255,255,255,0.9);margin:8px 0 0;font-size:15px;">Children's Ministry</p>
  </div>
  <div style="background:white;padding:36px 32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
    <h2 style="color:#1f2937;font-size:22px;margin:0 0 16px;">Welcome to the family, ${parent1_first_name}! 🎉</h2>
    <p style="color:#374151;font-size:16px;line-height:1.7;margin:0 0 16px;">We are so glad <strong>${childNames}</strong> joined us today${date ? ` on ${date}` : ''}. It was a joy to have your family with us!</p>
    <p style="color:#374151;font-size:16px;line-height:1.7;margin:0 0 16px;">Our Children's Ministry team poured so much love and energy into today's experience, and we hope your children had a wonderful time.</p>
    <div style="background:#fff7ed;border-left:4px solid #F28C28;padding:16px 20px;border-radius:0 8px 8px 0;margin:24px 0;">
      <p style="margin:0;font-size:15px;color:#9a3412;font-weight:bold;">📅 What's next?</p>
      <p style="margin:8px 0 0;font-size:14px;color:#9a3412;">We'd love to see your family again this Sunday. Our doors are always open!</p>
    </div>
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px;">If you have any questions about our Children's Ministry or want to learn more about ${churchName}, please don't hesitate to reach out. We're here for you.</p>
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0;">With joy,<br><strong>${churchName} Children's Ministry</strong></p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0;">
    <p style="font-size:12px;color:#9ca3af;text-align:center;margin:0;">You're receiving this because your family visited ${churchName}.</p>
  </div>
</div>`;

      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: `${churchName} <onboarding@resend.dev>`,
        to: recipients,
        subject: `Welcome to ${churchName} Children's Ministry!`,
        html,
      });

      await admin.from('cm_visitor_families').update({
        follow_up_sent: true,
        follow_up_sent_at: new Date().toISOString(),
      }).eq('id', family.id);
    } catch (_) {
      // Email failure never blocks form submission
    }
  }

  return Response.json({ success: true, family_id: family.id });
}
