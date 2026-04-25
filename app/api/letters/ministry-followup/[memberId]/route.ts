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

const LETTER_TONES: Record<string, (firstName: string, ministryName: string, churchName: string) => string> = {
  mens: (n, m, c) => `I wanted to take a moment to personally reach out and let you know that you are seen, valued, and prayed for in our ${m}.\n\nAs iron sharpens iron, so one person sharpens another. Your faithfulness and presence strengthen every man around you. We are grateful for the brotherhood you bring to ${c}.\n\nI am praying for God's blessing over your life, your family, and everything you put your hands to this season.`,
  womens: (n, m, c) => `What a joy it is to walk alongside you in this journey of faith. Your presence in our ${m} is a blessing to everyone around you.\n\nI wanted to write personally to encourage you and let you know how much you mean to our community at ${c}. You are seen, loved, and deeply appreciated.\n\nMay the Lord fill your days with peace, purpose, and His presence.`,
  seniors: (n, m, c) => `It is one of the great privileges of ministry to know and serve someone of your faithfulness and wisdom. Your years of walking with God are an inspiration to everyone in our church family.\n\nI am writing simply to say thank you — for your example, your prayers, and your steadfast spirit. You are a treasure to the ${m} at ${c}.\n\nMay God continue to bless and sustain you with His peace and joy.`,
  youth: (n, m, c) => `You are doing something remarkable — you are choosing to grow in your faith during one of the most important seasons of your life. That takes real courage.\n\nI want you to know that every leader in our ${m} believes in you and we are cheering you on every step of the way. God has an incredible plan for your life, and we are honored to be part of your journey at ${c}.\n\nKeep going. We are proud of you.`,
  'young-adults': (n, m, c) => `This season of life is full of big decisions, big dreams, and big questions — and I am so glad you are walking through it with a community of faith beside you at ${c}.\n\nI wanted to personally check in and remind you that you are deeply valued in our ${m}. Whatever you are navigating right now, you do not have to figure it out alone.\n\nGod is with you, and so is your church family.`,
  'middle-school': (n, m, c) => `Middle school is one of the most interesting and important times in life, and I am so glad you are part of our ${m} at ${c}. You bring energy, creativity, and heart to everything you do.\n\nI just wanted you to know that you are seen and valued here. We love having you with us and we are praying for you this week.\n\nKeep being exactly who God made you to be!`,
  preteen: (n, m, c) => `We are so grateful that ${n} is part of our ${m}. It is a joy to invest in young lives during this important season of growth.\n\nWe wanted to reach out personally to express our appreciation for your family and to let you know that ${n} is making a real difference in our group at ${c}.\n\nPlease know that we are praying for your entire family. Thank you for entrusting us with this season.`,
  childrens: (n, m, c) => `Thank you for entrusting ${n} to our ${m}. It is our privilege and joy to sow seeds of faith in young hearts.\n\nWe wanted to personally reach out to say how much ${n} means to our ministry family at ${c}. We pray for our children and families regularly and yours is always on our hearts.\n\nThank you for partnering with us in this important and beautiful work.`,
  drama: (n, m, c) => `Creativity is one of God's greatest gifts, and you carry it beautifully. Thank you for using your gifts in our ${m} at ${c} — your contribution brings life, joy, and meaning to everything we create together.\n\nI wanted to take a moment to acknowledge your faithfulness and encourage you to keep creating. What you do matters more than you know, and the impact reaches further than you can see.\n\nKeep shining. We are grateful for you.`,
};

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
  const admin = adminClient();

  const [memberRes, churchRes] = await Promise.all([
    admin.from('members').select('id, first_name, last_name, address, city, state, zip').eq('id', memberId).eq('church_id', churchId).maybeSingle(),
    admin.from('churches').select('name').eq('id', churchId).single(),
  ]);

  const member = memberRes.data;
  const church = churchRes.data;
  if (!member) return Response.json({ error: 'Member not found' }, { status: 404 });

  const cfg = MINISTRY_CONFIG[ministryType];
  const ministryName = cfg?.name ?? 'Ministry';
  const churchName = church?.name ?? 'Our Church';
  const date = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // Check for custom template
  const { data: template } = await admin
    .from('letter_templates')
    .select('body_html')
    .eq('church_id', churchId)
    .eq('template_type', `ministry-followup-${ministryType}`)
    .maybeSingle();

  let bodyHtml: string;
  if (template?.body_html) {
    bodyHtml = template.body_html
      .replace(/\{first_name\}/g, member.first_name)
      .replace(/\{last_name\}/g, member.last_name)
      .replace(/\{church_name\}/g, churchName)
      .replace(/\{date\}/g, date)
      .replace(/\{ministry_name\}/g, ministryName);
  } else {
    const toneBuilder = LETTER_TONES[ministryType] ?? ((n: string, m: string, c: string) =>
      `I wanted to personally reach out and let you know that you are valued and appreciated in our ${m} at ${c}.\n\nYou are prayed for and thought of often. May God bless you richly this season.`
    );
    const bodyText = toneBuilder(member.first_name, ministryName, churchName);

    const addressBlock = [member.address, [member.city, member.state].filter(Boolean).join(', '), member.zip].filter(Boolean).join('\n');

    bodyHtml = `
<p style="color:#6b7280;margin:0 0 32px;">${date}</p>
${member.first_name} ${member.last_name}<br>
${addressBlock ? `<span style="color:#6b7280;white-space:pre-line">${addressBlock}</span>` : ''}
<div style="margin:32px 0;">
  <p style="margin:0 0 14px;">Dear ${member.first_name},</p>
  ${bodyText.split('\n').filter(Boolean).map(p => `<p style="margin:0 0 16px;">${p}</p>`).join('')}
  <p style="margin:32px 0 8px;">Sincerely,</p>
  <p style="margin:0;color:#6b7280;">${churchName}</p>
</div>`;
  }

  return Response.json({ html: bodyHtml, member, churchName, date, ministryName });
}
