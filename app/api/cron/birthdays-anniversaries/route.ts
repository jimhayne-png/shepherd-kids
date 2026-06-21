import { createClient } from '@supabase/supabase-js';
import { type NextRequest } from 'next/server';
import { Resend } from 'resend';

const BIRTHDAY_MILESTONES           = new Set([1, 5, 10, 16, 18, 21, 25, 30, 40, 50, 60, 70, 75, 80, 85, 90]);
const SPIRITUAL_BIRTHDAY_MILESTONES = new Set([1, 5, 10, 15, 20, 25, 30, 40, 50]);

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function getAuthUser(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user } } = await adminClient().auth.getUser(token);
  return user ?? null;
}

async function getChurchId(userId: string) {
  const { data } = await adminClient()
    .from('church_users')
    .select('church_id')
    .eq('user_id', userId)
    .maybeSingle();
  return data?.church_id ?? null;
}

function getMilestoneYears(eventType: string, years: number): number | null {
  if (eventType === 'birthday') return BIRTHDAY_MILESTONES.has(years) ? years : null;
  return SPIRITUAL_BIRTHDAY_MILESTONES.has(years) ? years : null;
}

async function getChurchAdminEmails(churchId: string): Promise<string[]> {
  const admin = adminClient();
  const { data: cuList } = await admin
    .from('church_users')
    .select('user_id')
    .eq('church_id', churchId);

  const emails: string[] = [];
  for (const cu of cuList ?? []) {
    const { data: { user } } = await admin.auth.admin.getUserById(cu.user_id);
    if (user?.email) emails.push(user.email);
  }
  return emails;
}

type EventEntry = {
  memberId: string;
  firstName: string;
  lastName: string;
  eventType: 'birthday' | 'spiritual_birthday';
  years: number | null;
  isMilestone: boolean;
  milestoneYears: number | null;
  logId: string;
};

async function processChurch(churchId: string, today: Date, resend: Resend, baseUrl: string): Promise<number> {
  const admin = adminClient();
  const month = today.getMonth() + 1;
  const day = today.getDate();
  const year = today.getFullYear();

  // Fetch all active members with birthdate or anniversary
  const { data: members } = await admin
    .from('members')
    .select('id, first_name, last_name, birthdate, anniversary, spiritual_birthday')
    .eq('church_id', churchId)
    .eq('status', 'active');

  if (!members?.length) return 0;

  // Find today's birthday/anniversary/spiritual_birthday members
  const todayEvents: { memberId: string; firstName: string; lastName: string; eventType: 'birthday' | 'spiritual_birthday'; originalDate: string }[] = [];

  for (const m of members) {
    const checks: Array<{ date: string | null; type: 'birthday' | 'spiritual_birthday' }> = [
      { date: m.birthdate,          type: 'birthday' },
      { date: m.spiritual_birthday, type: 'spiritual_birthday' },
    ];
    for (const { date, type } of checks) {
      if (!date) continue;
      const d = new Date(date + 'T00:00:00');
      if (d.getMonth() + 1 === month && d.getDate() === day) {
        todayEvents.push({ memberId: m.id, firstName: m.first_name, lastName: m.last_name, eventType: type, originalDate: date });
      }
    }
  }

  if (!todayEvents.length) return 0;

  // Check which are already logged this year
  const memberIds = todayEvents.map(e => e.memberId);
  const { data: existingLogs } = await admin
    .from('birthday_anniversary_log')
    .select('member_id, event_type')
    .in('member_id', memberIds)
    .eq('church_id', churchId)
    .eq('year', year);

  const loggedSet = new Set((existingLogs ?? []).map(l => `${l.member_id}:${l.event_type}`));

  // Process new events
  const newEntries: EventEntry[] = [];

  for (const ev of todayEvents) {
    const key = `${ev.memberId}:${ev.eventType}`;
    if (loggedSet.has(key)) continue;

    const originalYear = new Date(ev.originalDate + 'T00:00:00').getFullYear();
    const years = originalYear > 1900 ? year - originalYear : null;
    const milestoneYears = years !== null ? getMilestoneYears(ev.eventType, years) : null;
    const isMilestone = milestoneYears !== null;

    const eventDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    const { data: log, error } = await admin
      .from('birthday_anniversary_log')
      .insert({
        church_id: churchId,
        member_id: ev.memberId,
        event_type: ev.eventType,
        event_date: eventDate,
        year,
        is_milestone: isMilestone,
        milestone_years: milestoneYears,
        pastor_notified_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (!error && log) {
      newEntries.push({
        memberId: ev.memberId,
        firstName: ev.firstName,
        lastName: ev.lastName,
        eventType: ev.eventType,
        years,
        isMilestone,
        milestoneYears,
        logId: log.id,
      });
    }
  }

  if (!newEntries.length) return 0;

  // Send one digest email to all church admins
  const { data: church } = await admin.from('churches').select('name').eq('id', churchId).maybeSingle();
  const churchName = church?.name ?? 'Your Church';
  const adminEmails = await getChurchAdminEmails(churchId);

  if (adminEmails.length > 0) {
    const dateStr = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    const birthdays          = newEntries.filter(e => e.eventType === 'birthday');
    const spiritualBirthdays = newEntries.filter(e => e.eventType === 'spiritual_birthday');

    const renderRow = (e: EventEntry) => {
      const letterUrl = `${baseUrl}/dashboard/birthdays/letter/${e.logId}`;
      const detail = e.years !== null ? ` — ${e.years} ${e.eventType === 'birthday' ? 'years old' : 'years'}` : '';
      const milestone = e.isMilestone ? ` <span style="background:#F28C28;color:white;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:bold;">🎉 MILESTONE</span>` : '';
      return `
        <tr style="border-bottom:1px solid #f3f4f6;">
          <td style="padding:12px 0;font-size:15px;color:#111827;font-weight:500;">${e.firstName} ${e.lastName}${detail}${milestone}</td>
          <td style="padding:12px 0;text-align:right;">
            <a href="${letterUrl}" style="background:#1A4A2E;color:white;padding:6px 14px;border-radius:6px;text-decoration:none;font-size:13px;font-weight:600;">Print Letter</a>
          </td>
        </tr>`;
    };

    const html = `
      <div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;color:#1f2937;">
        <div style="background:#1A4A2E;padding:28px 32px;border-radius:12px 12px 0 0;">
          <h1 style="color:white;margin:0;font-size:22px;font-weight:normal;">${churchName}</h1>
          <p style="color:#86efac;margin:6px 0 0;font-size:14px;">Birthday & Spiritual Birthday Digest — ${dateStr}</p>
        </div>
        <div style="background:white;padding:36px 32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
          ${birthdays.length > 0 ? `
            <h2 style="color:#1A4A2E;font-size:18px;margin:0 0 12px;">🎂 Birthdays Today</h2>
            <table style="width:100%;border-collapse:collapse;margin-bottom:28px;">
              ${birthdays.map(renderRow).join('')}
            </table>` : ''}
          ${spiritualBirthdays.length > 0 ? `
            <h2 style="color:#1A4A2E;font-size:18px;margin:0 0 12px;">✝️ Spiritual Birthdays Today</h2>
            <table style="width:100%;border-collapse:collapse;margin-bottom:28px;">
              ${spiritualBirthdays.map(renderRow).join('')}
            </table>` : ''}
          <p style="font-size:14px;color:#6b7280;line-height:1.6;">Click <strong>Print Letter</strong> next to each name to open a print-ready letter you can sign and mail. These letters are personalized and milestone-aware.</p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
          <p style="font-size:12px;color:#9ca3af;text-align:center;">Sent via ShepherdKids · <a href="${baseUrl}/dashboard/birthdays" style="color:#9ca3af;">View all upcoming</a></p>
        </div>
      </div>`;

    try {
      await resend.emails.send({
        from: 'ShepherdKids <onboarding@resend.dev>',
        to: adminEmails,
        subject: `${churchName} — ${newEntries.length} Birthday${newEntries.length !== 1 ? '/Spiritual Birthday' : ''} Today`,
        html,
      });
    } catch (_) {
      // Email failure never blocks log creation
    }
  }

  return newEntries.length;
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization') ?? '';
  const bearerToken = authHeader.replace('Bearer ', '');
  const cronSecret = process.env.CRON_SECRET;
  const resend = new Resend(process.env.RESEND_API_KEY!);
  const today = new Date();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://shepherd-kids.vercel.app';

  // Cron mode: secret matches → process all churches
  if (cronSecret && bearerToken === cronSecret) {
    const admin = adminClient();
    const { data: churches } = await admin.from('churches').select('id');
    let total = 0;
    for (const church of churches ?? []) {
      total += await processChurch(church.id, today, resend, baseUrl);
    }
    return Response.json({ processed: total, mode: 'cron' });
  }

  // User mode: valid session → process their church only
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const processed = await processChurch(churchId, today, resend, baseUrl);
  return Response.json({ processed, mode: 'manual' });
}
