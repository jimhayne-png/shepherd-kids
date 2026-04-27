import { createClient } from '@supabase/supabase-js';
import { type NextRequest } from 'next/server';
import { CURRENT_YEAR } from '@/lib/pastor-touch';

function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}
async function getAuthUser(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user } } = await adminClient().auth.getUser(token);
  return user ?? null;
}
async function getChurchId(userId: string) {
  const { data } = await adminClient().from('church_users').select('church_id').eq('user_id', userId).maybeSingle();
  return data?.church_id ?? null;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ memberId: string }> }) {
  const { memberId } = await params;
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const year = parseInt(req.nextUrl.searchParams.get('year') ?? String(CURRENT_YEAR));
  const admin = adminClient();

  const [memberRes, churchRes, assignRes, logRes] = await Promise.all([
    admin.from('members').select('id, first_name, last_name, address, city, state, zip').eq('id', memberId).eq('church_id', churchId).maybeSingle(),
    admin.from('churches').select('name').eq('id', churchId).single(),
    admin.from('annual_pastor_touch_assignments').select('pastor_id').eq('church_id', churchId).eq('member_id', memberId).eq('year', year).maybeSingle(),
    admin.from('annual_pastor_touch_log').select('letter_edited_content').eq('church_id', churchId).eq('member_id', memberId).eq('year', year).maybeSingle(),
  ]);

  const member = memberRes.data;
  if (!member) return Response.json({ error: 'Member not found' }, { status: 404 });

  const church = churchRes.data;
  const churchName = church?.name ?? 'Our Church';

  // Get pastor name from assignment
  let pastorName = 'Pastor';
  if (assignRes.data?.pastor_id) {
    const { data: staff } = await admin.from('pastoral_staff').select('name, title').eq('id', assignRes.data.pastor_id).maybeSingle();
    if (staff) pastorName = staff.title ? `${staff.title} ${staff.name}` : staff.name;
  }

  // Check for saved edited content
  const savedContent = logRes.data?.letter_edited_content ?? null;

  // Check for custom template
  const { data: template } = await admin.from('letter_templates').select('body_html').eq('church_id', churchId).eq('template_type', 'pastor-touch').maybeSingle();

  const date = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  let body: string;
  if (template?.body_html) {
    body = template.body_html
      .replace(/\{first_name\}/g, member.first_name)
      .replace(/\{last_name\}/g, member.last_name)
      .replace(/\{church_name\}/g, churchName)
      .replace(/\{pastor_name\}/g, pastorName)
      .replace(/\{date\}/g, date);
  } else {
    body = `Dear ${member.first_name},

I wanted to take a moment to personally reach out and let you know that you are being lifted up in prayer by your pastor and the entire ${churchName} family.

Ministry is about more than programs — it is about people. And you, ${member.first_name}, are one of the people I am specifically praying for this season. I thank God for placing you in our congregation, and I am grateful for the blessing you are to this church family.

If there is anything on your heart — a prayer request, a question, or simply a need for encouragement — please do not hesitate to reach out. My door and my heart are always open.

May the Lord bless you and keep you in this season. You are seen, you are valued, and you are prayed for.

In His service,`;
  }

  return Response.json({ body, member, churchName, pastorName, date, savedContent });
}
