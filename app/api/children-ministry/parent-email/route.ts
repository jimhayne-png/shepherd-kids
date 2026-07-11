import { type NextRequest } from 'next/server';
import { getAuthContext, adminClient } from '@/lib/api-auth';
import { sendEmail, defaultFromAddress } from '@/lib/communications/email/resend';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Contact = { email: string; displayName: string; householdName: string };

function isValidEmail(e: unknown): e is string {
  return typeof e === 'string' && e.includes('@') && e.length > 3;
}

async function buildContactList(
  admin: ReturnType<typeof adminClient>,
  churchId: string,
): Promise<Contact[]> {
  const seen = new Set<string>();
  const contacts: Contact[] = [];

  const [{ data: families }, { data: children }] = await Promise.all([
    admin
      .from('cm_visitor_families')
      .select('parent1_first_name, parent1_last_name, parent1_email, parent2_first_name, parent2_last_name, parent2_email')
      .eq('church_id', churchId)
      .order('parent1_last_name', { ascending: true }),
    admin
      .from('children_ministry_children')
      .select('last_name, parent1_email, parent2_email')
      .eq('church_id', churchId)
      .eq('active', true),
  ]);

  for (const f of families ?? []) {
    const household = f.parent1_last_name ? `${f.parent1_last_name} Family` : 'Family';

    if (isValidEmail(f.parent1_email) && !seen.has(f.parent1_email.toLowerCase())) {
      seen.add(f.parent1_email.toLowerCase());
      const name = [f.parent1_first_name, f.parent1_last_name].filter(Boolean).join(' ');
      contacts.push({ email: f.parent1_email, displayName: name || f.parent1_email, householdName: household });
    }

    if (isValidEmail(f.parent2_email) && !seen.has(f.parent2_email.toLowerCase())) {
      seen.add(f.parent2_email.toLowerCase());
      const name = [f.parent2_first_name, f.parent2_last_name].filter(Boolean).join(' ');
      const household2 = f.parent1_last_name
        ? `${f.parent1_last_name} Family`
        : f.parent2_last_name
        ? `${f.parent2_last_name} Family`
        : 'Family';
      contacts.push({ email: f.parent2_email, displayName: name || f.parent2_email, householdName: household2 });
    }
  }

  for (const c of children ?? []) {
    const household = c.last_name ? `${c.last_name} Family` : 'Family';

    if (isValidEmail(c.parent1_email) && !seen.has(c.parent1_email.toLowerCase())) {
      seen.add(c.parent1_email.toLowerCase());
      contacts.push({ email: c.parent1_email, displayName: c.parent1_email, householdName: household });
    }

    if (isValidEmail(c.parent2_email) && !seen.has(c.parent2_email.toLowerCase())) {
      seen.add(c.parent2_email.toLowerCase());
      contacts.push({ email: c.parent2_email, displayName: c.parent2_email, householdName: household });
    }
  }

  return contacts;
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildHtml(
  churchName: string,
  logoUrl: string | null,
  subject: string,
  message: string,
  sigName: string,
  sigTitle: string,
): string {
  const logoHtml = logoUrl
    ? `<img src="${logoUrl}" style="max-height:70px;display:block;margin:0 auto 12px;" alt="" />`
    : '';
  const paragraphs = message
    .split('\n')
    .map(l => l.trim() ? `<p style="margin:0 0 14px;font-size:15px;color:#374151;line-height:1.7;">${l}</p>` : '')
    .join('');

  const sigNameSafe  = escHtml(sigName);
  const sigTitleSafe = escHtml(sigTitle);
  const churchSafe   = escHtml(churchName);

  const signatureHtml = `
<p style="margin:24px 0 0;font-size:15px;color:#374151;line-height:1;">Blessings,</p>
<p style="margin:14px 0 0;font-size:15px;color:#374151;line-height:1.8;">
  <strong>${sigNameSafe}</strong>${sigTitleSafe ? `<br/>${sigTitleSafe}` : ''}<br/>${churchSafe}
</p>`;

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table width="640" cellpadding="0" cellspacing="0" style="background:#ffffff;margin:40px 0;border-radius:10px;overflow:hidden;">
<tr><td style="background:#7B2CBF;padding:24px;text-align:center;color:white;font-size:24px;font-weight:bold;">
${logoHtml}${churchName}
</td></tr>
<tr><td style="padding:40px;">
<h2 style="margin-top:0;color:#1f2937;">${subject}</h2>
${paragraphs}
${signatureHtml}
</td></tr>
<tr><td style="background:#F2F2F2;padding:20px;font-size:12px;color:#666;text-align:center;">
${churchName} &mdash; Children&apos;s Ministry
</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { churchId } = ctx;

  const admin = adminClient();
  const contacts = await buildContactList(admin, churchId);

  return Response.json({ contacts });
}

export async function POST(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { churchId } = ctx;

  const body = await req.json();
  const { subject, message, recipientMode, selectedEmails } = body;

  if (!subject?.trim()) return Response.json({ error: 'Subject is required.' }, { status: 400 });
  if (!message?.trim()) return Response.json({ error: 'Message is required.' }, { status: 400 });
  if (recipientMode !== 'all' && recipientMode !== 'selected') {
    return Response.json({ error: 'Invalid recipient mode.' }, { status: 400 });
  }

  const sigName  = typeof body.signatureName  === 'string' ? body.signatureName.trim().slice(0, 100)  : '';
  const sigTitle = typeof body.signatureTitle === 'string' ? body.signatureTitle.trim().slice(0, 100) : '';

  const admin = adminClient();

  const [{ data: church }, allContacts] = await Promise.all([
    admin.from('churches').select('name, email, logo_url').eq('id', churchId).single(),
    buildContactList(admin, churchId),
  ]);

  const churchName = church?.name ?? 'Your Church';
  const allowedEmails = new Map(allContacts.map(c => [c.email.toLowerCase(), c.email]));

  let recipientEmails: string[];

  if (recipientMode === 'all') {
    recipientEmails = allContacts.map(c => c.email);
  } else {
    if (!Array.isArray(selectedEmails) || selectedEmails.length === 0) {
      return Response.json({ error: 'No recipients selected.' }, { status: 400 });
    }

    // Validate each submitted email against the church's own contact list
    const dedupedNormalized = [
      ...new Set(
        (selectedEmails as unknown[])
          .filter(isValidEmail)
          .map(e => e.toLowerCase().trim())
          .filter(e => allowedEmails.has(e)),
      ),
    ];

    if (dedupedNormalized.length === 0) {
      return Response.json({ error: 'No valid recipients found.' }, { status: 400 });
    }

    recipientEmails = dedupedNormalized.map(e => allowedEmails.get(e) ?? e);
  }

  if (recipientEmails.length === 0) {
    return Response.json({ error: 'No valid parent email addresses found.' }, { status: 400 });
  }

  const subjectTrimmed = subject.trim();
  const messageTrimmed = message.trim();
  const resolvedSigName  = sigName  || "Your Children's Ministry Team";
  const html = buildHtml(churchName, church?.logo_url ?? null, subjectTrimmed, messageTrimmed, resolvedSigName, sigTitle);
  const sigBlock = `Blessings,\n\n${resolvedSigName}${sigTitle ? '\n' + sigTitle : ''}\n${churchName}`;
  const text = `${subjectTrimmed}\n\n${messageTrimmed}\n\n${sigBlock}`;
  const from = `${churchName} Children's Ministry <${defaultFromAddress}>`;

  let sent = 0;
  for (const email of recipientEmails) {
    try {
      await sendEmail({
        to: email,
        from,
        replyTo: church?.email ?? undefined,
        subject: subjectTrimmed,
        html,
        text,
      });
      sent++;
    } catch {
      // Continue to next recipient; partial sends are acceptable
    }
  }

  return Response.json({ sent, total: recipientEmails.length });
}
