import { createClient } from '@supabase/supabase-js';
import { type NextRequest } from 'next/server';

const BIRTHDAY_MILESTONES          = new Set([1, 5, 10, 16, 18, 21, 25, 30, 40, 50, 60, 70, 75, 80, 85, 90]);
const ANNIVERSARY_MILESTONES       = new Set([1, 5, 10, 15, 20, 25, 30, 40, 50]);
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

function milestoneSetFor(eventType: string) {
  if (eventType === 'birthday') return BIRTHDAY_MILESTONES;
  if (eventType === 'anniversary') return ANNIVERSARY_MILESTONES;
  return SPIRITUAL_BIRTHDAY_MILESTONES;
}

function rawDateFor(m: Record<string, string | null>, eventType: string): string | null {
  if (eventType === 'birthday') return m.birthdate;
  if (eventType === 'anniversary') return m.anniversary;
  return m.spiritual_birthday;
}

// GET: upcoming birthdays / anniversaries / spiritual birthdays in next N days (default 30)
export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const days = parseInt(request.nextUrl.searchParams.get('days') ?? '30');
  const admin = adminClient();

  const { data: members } = await admin
    .from('members')
    .select('id, first_name, last_name, birthdate, anniversary, spiritual_birthday')
    .eq('church_id', churchId)
    .eq('status', 'active');

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayYear = today.getFullYear();

  const events: any[] = [];

  for (const m of members ?? []) {
    for (const eventType of ['birthday', 'anniversary', 'spiritual_birthday'] as const) {
      const rawDate = rawDateFor(m, eventType);
      if (!rawDate) continue;

      const original = new Date(rawDate + 'T00:00:00');
      const originalYear = original.getFullYear();

      for (const tryYear of [todayYear, todayYear + 1]) {
        const occurrence = new Date(tryYear, original.getMonth(), original.getDate());
        const daysAway = Math.floor((occurrence.getTime() - today.getTime()) / 86400000);
        if (daysAway >= 0 && daysAway <= days) {
          const years = originalYear > 1900 ? tryYear - originalYear : null;
          const ms = milestoneSetFor(eventType);
          const milestoneYears = years !== null && ms.has(years) ? years : null;
          events.push({
            memberId: m.id,
            firstName: m.first_name,
            lastName: m.last_name,
            eventType,
            eventDate: `${tryYear}-${String(original.getMonth() + 1).padStart(2, '0')}-${String(original.getDate()).padStart(2, '0')}`,
            originalDate: rawDate,
            years,
            isMilestone: milestoneYears !== null,
            milestoneYears,
            daysAway,
          });
          break;
        }
      }
    }
  }

  events.sort((a, b) => a.daysAway - b.daysAway);

  const memberIds = [...new Set(events.map(e => e.memberId))];
  let logMap: Record<string, string> = {};
  if (memberIds.length > 0) {
    const { data: logs } = await admin
      .from('birthday_anniversary_log')
      .select('id, member_id, event_type')
      .in('member_id', memberIds)
      .eq('church_id', churchId)
      .eq('year', todayYear);
    for (const l of logs ?? []) {
      logMap[`${l.member_id}:${l.event_type}`] = l.id;
    }
  }

  const enriched = events.map(e => ({ ...e, logId: logMap[`${e.memberId}:${e.eventType}`] ?? null }));

  const thisMonthStart = new Date(todayYear, today.getMonth(), 1);
  const thisMonthEnd   = new Date(todayYear, today.getMonth() + 1, 0);
  const thisMonth = enriched.filter(e => {
    const d = new Date(e.eventDate);
    return d >= thisMonthStart && d <= thisMonthEnd;
  });

  return Response.json({
    events: enriched,
    stats: {
      totalThisMonth: thisMonth.length,
      milestonesThisMonth: thisMonth.filter(e => e.isMilestone).length,
      todayCount: enriched.filter(e => e.daysAway === 0).length,
    },
  });
}

// POST: create/upsert a log entry for a specific member+event (for on-demand letter printing)
export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const body = await request.json();
  const { memberId, eventType } = body;

  if (!memberId || !['birthday', 'anniversary', 'spiritual_birthday'].includes(eventType)) {
    return Response.json({ error: 'memberId and eventType required' }, { status: 400 });
  }

  const admin = adminClient();
  const today = new Date();
  const year = today.getFullYear();

  const { data: member } = await admin
    .from('members')
    .select('id, first_name, last_name, birthdate, anniversary, spiritual_birthday')
    .eq('id', memberId)
    .eq('church_id', churchId)
    .maybeSingle();

  if (!member) return Response.json({ error: 'Member not found' }, { status: 404 });

  const rawDate = rawDateFor(member, eventType);
  if (!rawDate) return Response.json({ error: 'No date set for this member' }, { status: 400 });

  const original = new Date(rawDate + 'T00:00:00');
  const originalYear = original.getFullYear();
  const eventDate = `${year}-${String(original.getMonth() + 1).padStart(2, '0')}-${String(original.getDate()).padStart(2, '0')}`;
  const years = originalYear > 1900 ? year - originalYear : null;
  const ms = milestoneSetFor(eventType);
  const milestoneYears = years !== null && ms.has(years) ? years : null;

  const { data: existing } = await admin
    .from('birthday_anniversary_log')
    .select('id')
    .eq('member_id', memberId)
    .eq('event_type', eventType)
    .eq('year', year)
    .maybeSingle();

  if (existing) {
    await admin.from('birthday_anniversary_log')
      .update({ letter_generated_at: new Date().toISOString() })
      .eq('id', existing.id);
    return Response.json({ logId: existing.id });
  }

  const { data: log, error } = await admin
    .from('birthday_anniversary_log')
    .insert({
      church_id: churchId,
      member_id: memberId,
      event_type: eventType,
      event_date: eventDate,
      year,
      is_milestone: milestoneYears !== null,
      milestone_years: milestoneYears,
      letter_generated_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ logId: log.id });
}
