import { type NextRequest } from 'next/server';
import { getAuthContext, adminClient } from '@/lib/api-auth';

const DEFAULT_SUBJECT = "Welcome to Children's Ministry, {parent_name}!";
const DEFAULT_BODY = `<p>Dear {parent_name},</p>
<p>We were so blessed to have {child_name} join us this past {visit_date}! It was wonderful to meet your family and we hope you felt welcomed.</p>
<p>Our Children's Ministry is a place where kids grow in faith, make friends, and have fun learning about God's love. We would love to see {child_name} again soon!</p>
<p>If you have any questions or would like to learn more about our programs, please don't hesitate to reach out.</p>
<p>With warm regards,</p>
<p>{pastor_name}<br/>{church_name}</p>`;

export async function GET(request: NextRequest) {
  const auth = await getAuthContext(request);
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = adminClient();
  const { data, error } = await admin
    .from('letter_templates')
    .select('*')
    .eq('church_id', auth.churchId)
    .eq('template_type', 'cm_visitor_welcome')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return Response.json({ error: error.message }, { status: 400 });

  if (!data) {
    return Response.json({
      template: {
        id: null,
        church_id: auth.churchId,
        template_type: 'cm_visitor_welcome',
        subject: DEFAULT_SUBJECT,
        body_html: DEFAULT_BODY,
        is_default: true,
      },
    });
  }

  return Response.json({ template: data });
}

export async function POST(request: NextRequest) {
  const auth = await getAuthContext(request);
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { subject, body_html } = await request.json();
  if (!subject?.trim() || !body_html?.trim()) {
    return Response.json({ error: 'subject and body_html required' }, { status: 400 });
  }

  const admin = adminClient();

  const { data: existing } = await admin
    .from('letter_templates')
    .select('id')
    .eq('church_id', auth.churchId)
    .eq('template_type', 'cm_visitor_welcome')
    .maybeSingle();

  let result;
  if (existing) {
    const { data, error } = await admin
      .from('letter_templates')
      .update({ subject: subject.trim(), body_html: body_html.trim(), is_default: true })
      .eq('id', existing.id)
      .select('*')
      .single();
    if (error) return Response.json({ error: error.message }, { status: 400 });
    result = data;
  } else {
    const { data, error } = await admin
      .from('letter_templates')
      .insert({
        church_id: auth.churchId,
        template_type: 'cm_visitor_welcome',
        subject: subject.trim(),
        body_html: body_html.trim(),
        is_default: true,
      })
      .select('*')
      .single();
    if (error) return Response.json({ error: error.message }, { status: 400 });
    result = data;
  }

  return Response.json({ template: result });
}
