import { createClient } from '@supabase/supabase-js';
import { type NextRequest } from 'next/server';
import { MINISTRY_CONFIG } from '@/lib/ministry-config';

function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}
async function getAuthUser(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user } } = await adminClient().auth.getUser(token);
  return user ?? null;
}
async function getChurchId(userId: string) {
  const { data } = await adminClient().from('church_users').select('church_id').eq('user_id', userId).maybeSingle();
  return data?.church_id ?? null;
}

const PARENT_TYPES = new Set(['childrens']);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const { memberId } = await params;
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const ministryType = request.nextUrl.searchParams.get('ministry_type') ?? '';
  const groupId = request.nextUrl.searchParams.get('group_id') ?? '';
  const admin = adminClient();

  const [memberRes, churchRes] = await Promise.all([
    admin.from('members').select('id, first_name, last_name, address, city, state, zip').eq('id', memberId).eq('church_id', churchId).maybeSingle(),
    admin.from('churches').select('name').eq('id', churchId).single(),
  ]);

  const member = memberRes.data;
  const church = churchRes.data;
  if (!member) return Response.json({ error: 'Member not found' }, { status: 404 });

  // Fetch volunteer name from group if provided
  let volunteerName = 'Your Volunteer';
  if (groupId) {
    const { data: group } = await admin.from('shepherd_groups').select('volunteer_name').eq('id', groupId).maybeSingle();
    if (group?.volunteer_name) volunteerName = group.volunteer_name;
  }

  const cfg = MINISTRY_CONFIG[ministryType];
  const ministryName = cfg?.name ?? 'Ministry';
  const churchName = church?.name ?? 'Our Church';
  const date = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const addressBlock = [member.address, [member.city, member.state].filter(Boolean).join(', ')].filter(Boolean).join('\n');

  // Check for custom template
  const { data: template } = await admin
    .from('letter_templates')
    .select('body_html')
    .eq('church_id', churchId)
    .eq('template_type', `shepherd-${ministryType}`)
    .maybeSingle();

  let bodyHtml: string;

  if (template?.body_html) {
    bodyHtml = template.body_html
      .replace(/\{first_name\}/g, member.first_name)
      .replace(/\{kid_first_name\}/g, member.first_name)
      .replace(/\{last_name\}/g, member.last_name)
      .replace(/\{volunteer_name\}/g, volunteerName)
      .replace(/\{church_name\}/g, churchName)
      .replace(/\{date\}/g, date)
      .replace(/\{ministry_name\}/g, ministryName);
  } else if (PARENT_TYPES.has(ministryType)) {
    // Addressed to parents (childrens ministry)
    const body = `It has been such a joy having ${member.first_name} in our Children's Ministry. Your child is a gift to our group, and we are grateful for the trust you place in us each week.\n\nI wanted to personally reach out and let you know that ${member.first_name} is loved and prayed for. We do not take lightly the privilege of investing in your child's faith journey.\n\nPlease feel free to reach out to me any time. We are here for your family.`;

    bodyHtml = `
<p style="color:#6b7280;margin:0 0 32px;">${date}</p>
${addressBlock ? `<p style="white-space:pre-line;margin:0 0 32px;color:#6b7280;">${addressBlock}</p>` : ''}
<p style="margin:0 0 16px;">Dear Parent or Guardian of ${member.first_name},</p>
${body.split('\n').filter(Boolean).map(p => `<p style="margin:0 0 16px;">${p}</p>`).join('')}
<p style="margin:32px 0 8px;">With love and prayer,</p>
<p style="margin:0;font-weight:bold;">${volunteerName}</p>
<p style="margin:4px 0 0;color:#6b7280;">${ministryName} · ${churchName}</p>`;
  } else {
    // Addressed directly to the student (middle-school / high-school)
    const body = ministryType === 'middle-school'
      ? `I have been thinking about you lately and wanted to write you a personal note to tell you how much I value you. You bring something unique and irreplaceable to our group, and I am genuinely grateful that you are a part of it.\n\nMiddle school is a wild ride — and you are navigating it with more grace than you probably realize. I see you growing, and I am proud of the person you are becoming.\n\nIf you ever need someone to talk to, want to hang out, or just need a person in your corner — I am here. Do not hesitate to reach out.\n\nKeep going. You are doing better than you know.`
      : `I do not say this enough, but I wanted to write it down so you have it: you matter to me, and you matter to this group. Your presence, your personality, your faith — they all make our ministry stronger.\n\nI know this season of life is full of pressure, questions, and a lot of noise telling you who you should be. I just want to remind you that who you already are is worth showing up for.\n\nGod has a real plan for your life — not a vague, generic plan, but one that is specific to you. And I am honored to be one small part of helping you discover it.\n\nI am praying for you. Reach out any time.`;

    bodyHtml = `
<p style="color:#6b7280;margin:0 0 32px;">${date}</p>
${addressBlock ? `<p style="white-space:pre-line;margin:0 0 32px;color:#6b7280;">${addressBlock}</p>` : ''}
<p style="margin:0 0 16px;">Dear ${member.first_name},</p>
${body.split('\n').filter(Boolean).map(p => `<p style="margin:0 0 16px;">${p}</p>`).join('')}
<p style="margin:32px 0 8px;">Your friend and volunteer,</p>
<p style="margin:0;font-weight:bold;">${volunteerName}</p>
<p style="margin:4px 0 0;color:#6b7280;">${ministryName} · ${churchName}</p>`;
  }

  return Response.json({ html: bodyHtml, member, volunteerName, churchName, date, ministryName });
}
