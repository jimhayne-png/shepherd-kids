import { type NextRequest } from 'next/server';
import { getAuthContext, adminClient } from '@/lib/api-auth';
import { sendEmail, defaultFromAddress } from '@/lib/communications/email/resend';
import { buildCertificateEmail } from '@/lib/communications/email/templates';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const CERT_TYPE_LABEL: Record<string, string> = {
  birthday: 'Birthday Celebration',
  spiritual_birthday: 'Spiritual Birthday',
  baptism: 'Baptism Celebration',
  faith_milestone: 'Faith Milestone',
  scripture_memory: 'Scripture Memory Award',
  promotion: 'Promotion Sunday',
  servant_heart: 'Servant Heart Award',
  kindness: 'Kindness Award',
  helper: 'Helper Award',
  attendance: 'Attendance Award',
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ctx = await getAuthContext(req);
  if (!ctx) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { churchId } = ctx;

  const { pdfData, filename, force } = await req.json();

  if (!pdfData || typeof pdfData !== 'string') {
    return Response.json({ error: 'Missing PDF data' }, { status: 400 });
  }

  const admin = adminClient();

  const [{ data: cert }, { data: church }] = await Promise.all([
    admin
      .from('cm_certificates')
      .select('status, parent_email, child_name, cert_type, minister_name, minister_title, child_id')
      .eq('id', id)
      .eq('church_id', churchId)
      .single(),
    admin
      .from('churches')
      .select('name, email, logo_url')
      .eq('id', churchId)
      .single(),
  ]);

  if (!cert) return Response.json({ error: 'Not found' }, { status: 404 });

  const allowedStatuses = ['presented', 'email_scheduled', 'email_sent'];
  if (!allowedStatuses.includes(cert.status) && !force) {
    return Response.json(
      { error: 'not_presented', message: 'Certificate has not been marked as Presented.' },
      { status: 422 },
    );
  }

  if (!cert.parent_email) {
    return Response.json({ error: 'No parent email on this certificate' }, { status: 400 });
  }

  // Resolve family last name: cert → cm_visitor_children → cm_visitor_families
  let familyGreeting = 'Parent';
  if (cert.child_id) {
    const { data: child } = await admin
      .from('cm_visitor_children')
      .select('family_id')
      .eq('id', cert.child_id)
      .single();

    if (child?.family_id) {
      const { data: family } = await admin
        .from('cm_visitor_families')
        .select('parent1_last_name')
        .eq('id', child.family_id)
        .single();

      if (family?.parent1_last_name) {
        familyGreeting = `${family.parent1_last_name} Family`;
      }
    }
  }

  const churchName = church?.name ?? 'Your Church';
  const from = `${churchName} Children's Ministry <${defaultFromAddress}>`;

  const template = buildCertificateEmail({
    childName: cert.child_name,
    certTypeLabel: CERT_TYPE_LABEL[cert.cert_type] ?? cert.cert_type,
    churchName,
    churchLogoUrl: church?.logo_url ?? undefined,
    ministerName: cert.minister_name ?? undefined,
    ministerTitle: cert.minister_title ?? undefined,
    familyGreeting,
  });

  const pdfBuffer = Buffer.from(pdfData, 'base64');
  const safeFilename = filename ?? `${cert.child_name.replace(/\s+/g, '-').toLowerCase()}-certificate.pdf`;

  await sendEmail({
    to: cert.parent_email,
    from,
    replyTo: church?.email ?? undefined,
    subject: template.subject,
    html: template.html,
    text: template.text,
    attachments: [{ filename: safeFilename, content: pdfBuffer }],
  });

  const now = new Date().toISOString();
  await admin
    .from('cm_certificates')
    .update({ status: 'email_sent', parent_email_sent_at: now, updated_at: now })
    .eq('id', id)
    .eq('church_id', churchId);

  return Response.json({ success: true });
}
