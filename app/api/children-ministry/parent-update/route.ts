import { createClient } from '@supabase/supabase-js';
import { type NextRequest } from 'next/server';
import { Resend } from 'resend';

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

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const seasonId = request.nextUrl.searchParams.get('season_id');
  const admin = adminClient();

  let query = admin.from('children_ministry_parent_updates').select('*').eq('church_id', churchId).order('session_date', { ascending: false });
  if (seasonId) query = query.eq('season_id', seasonId);

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ updates: data ?? [] });
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const body = await request.json();
  const { seasonId, sessionDate, memoryVerse, lessonSummary, conversationStarter, specialNotes, sendNow } = body;

  if (!seasonId) return Response.json({ error: 'Season required' }, { status: 400 });
  if (!sessionDate) return Response.json({ error: 'Session date required' }, { status: 400 });

  const admin = adminClient();

  // Upsert the parent update record
  const { data: existing } = await admin
    .from('children_ministry_parent_updates')
    .select('id')
    .eq('church_id', churchId)
    .eq('session_date', sessionDate)
    .maybeSingle();

  let updateRecord: any;
  if (existing) {
    const { data } = await admin
      .from('children_ministry_parent_updates')
      .update({
        season_id: seasonId,
        memory_verse: memoryVerse?.trim() || null,
        lesson_summary: lessonSummary?.trim() || null,
        conversation_starter: conversationStarter?.trim() || null,
        special_notes: specialNotes?.trim() || null,
      })
      .eq('id', existing.id)
      .select('*')
      .single();
    updateRecord = data;
  } else {
    const { data } = await admin
      .from('children_ministry_parent_updates')
      .insert({
        church_id: churchId,
        season_id: seasonId,
        session_date: sessionDate,
        memory_verse: memoryVerse?.trim() || null,
        lesson_summary: lessonSummary?.trim() || null,
        conversation_starter: conversationStarter?.trim() || null,
        special_notes: specialNotes?.trim() || null,
      })
      .select('*')
      .single();
    updateRecord = data;
  }

  if (!sendNow) return Response.json({ update: updateRecord });

  // Send emails
  const emailsSent = await sendParentEmails(admin, churchId, seasonId, sessionDate, {
    memoryVerse: memoryVerse?.trim() || '',
    lessonSummary: lessonSummary?.trim() || '',
    conversationStarter: conversationStarter?.trim() || '',
    specialNotes: specialNotes?.trim() || '',
  }, user.id);

  if (updateRecord) {
    await admin.from('children_ministry_parent_updates').update({ sent_at: new Date().toISOString() }).eq('id', updateRecord.id);
  }

  return Response.json({ update: updateRecord, emailsSent });
}

async function sendParentEmails(
  admin: ReturnType<typeof adminClient>,
  churchId: string,
  seasonId: string,
  sessionDate: string,
  content: { memoryVerse: string; lessonSummary: string; conversationStarter: string; specialNotes: string },
  awardedBy: string
): Promise<number> {
  try {
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) return 0;

    const { data: church } = await admin.from('churches').select('name').eq('id', churchId).single();
    const churchName = church?.name ?? 'Your Church';

    const { data: season } = await admin.from('children_ministry_seasons').select('*').eq('id', seasonId).single();

    // Fetch all active children with team memberships
    const { data: children } = await admin
      .from('children_ministry_children')
      .select('*')
      .eq('church_id', churchId)
      .eq('active', true);

    if (!children?.length) return 0;

    const childIds = children.map((c: any) => c.id);

    // Get team memberships for this season
    const { data: memberships } = await admin
      .from('children_ministry_team_members')
      .select('child_id, team_id, children_ministry_teams(name, color, total_points)')
      .eq('season_id', seasonId)
      .in('child_id', childIds);

    const teamMap: Record<string, any> = {};
    for (const m of memberships ?? []) {
      teamMap[m.child_id] = m.children_ministry_teams;
    }

    // Get points earned this week for each child
    const weekAgo = new Date(sessionDate + 'T00:00:00');
    weekAgo.setDate(weekAgo.getDate() - 6);
    const { data: weeklyPoints } = await admin
      .from('children_ministry_points')
      .select('child_id, points, category')
      .eq('season_id', seasonId)
      .in('child_id', childIds)
      .gte('created_at', weekAgo.toISOString());

    const weeklyPointsMap: Record<string, number> = {};
    for (const p of weeklyPoints ?? []) {
      if (p.child_id) weeklyPointsMap[p.child_id] = (weeklyPointsMap[p.child_id] ?? 0) + Number(p.points);
    }

    // Get attendance streaks
    const { data: latestAtt } = await admin
      .from('children_ministry_attendance')
      .select('child_id, consecutive_weeks')
      .eq('season_id', seasonId)
      .in('child_id', childIds)
      .order('session_date', { ascending: false });

    const streakMap: Record<string, number> = {};
    for (const a of latestAtt ?? []) {
      if (!streakMap[a.child_id]) streakMap[a.child_id] = a.consecutive_weeks;
    }

    // Get team standings (sorted by points)
    const { data: teams } = await admin
      .from('children_ministry_teams')
      .select('id, name, total_points')
      .eq('season_id', seasonId)
      .order('total_points', { ascending: false });

    const teamRankMap: Record<string, number> = {};
    (teams ?? []).forEach((t: any, i: number) => { teamRankMap[t.id] = i + 1; });

    const resend = new Resend(resendKey);
    const dateDisplay = new Date(sessionDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    let sent = 0;

    for (const child of children) {
      const recipients: string[] = [child.parent1_email, child.parent2_email].filter(Boolean);
      if (recipients.length === 0) continue;

      const team = teamMap[child.id];
      const weekPts = weeklyPointsMap[child.id] ?? 0;
      const streak = streakMap[child.id] ?? 0;
      const teamRank = team ? teamRankMap[team.id] : null;
      const ordinal = (n: number) => ['', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'][n] ?? `${n}th`;

      const html = `
        <div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;color:#1f2937;">
          <div style="background:#F28C28;padding:28px 32px;border-radius:12px 12px 0 0;">
            <h1 style="color:white;margin:0;font-size:22px;font-weight:normal;">${churchName}</h1>
            <p style="color:rgba(255,255,255,0.9);margin:6px 0 0;font-size:15px;">This Week in Children's Ministry · ${dateDisplay}</p>
          </div>
          <div style="background:white;padding:36px 32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">

            <div style="background:#fff7ed;border-left:4px solid #F28C28;padding:16px 20px;border-radius:0 8px 8px 0;margin-bottom:28px;">
              <h2 style="color:#9a3412;margin:0 0 8px;font-size:18px;">${child.first_name} ${child.last_name}</h2>
              ${team ? `<p style="margin:0;font-size:15px;color:#374151;">Team <strong style="color:${team.color}">${team.name}</strong>${teamRank ? ` · <strong>${ordinal(teamRank)} place</strong>` : ''} · <strong>${Number(team.total_points).toLocaleString()} pts</strong> total</p>` : '<p style="margin:0;font-size:15px;color:#6b7280;">Not assigned to a team this season</p>'}
            </div>

            ${weekPts > 0 ? `
            <div style="margin-bottom:24px;">
              <h3 style="color:#1A4A2E;font-size:16px;margin:0 0 8px;">🏆 Points Earned This Week</h3>
              <p style="font-size:24px;font-weight:bold;color:#F28C28;margin:0;">+${weekPts.toLocaleString()} pts</p>
            </div>` : ''}

            ${streak > 0 ? `
            <div style="margin-bottom:24px;background:#f0fdf4;border-radius:8px;padding:14px 18px;">
              <p style="margin:0;font-size:15px;color:#166534;">🔥 <strong>${child.first_name}</strong> has attended <strong>${streak} week${streak !== 1 ? 's' : ''}</strong> in a row!</p>
            </div>` : ''}

            ${content.memoryVerse ? `
            <div style="margin-bottom:24px;">
              <h3 style="color:#1A4A2E;font-size:16px;margin:0 0 8px;">📖 Memory Verse This Week</h3>
              <p style="font-size:15px;font-style:italic;color:#374151;line-height:1.6;margin:0;">"${content.memoryVerse}"</p>
            </div>` : ''}

            ${content.lessonSummary ? `
            <div style="margin-bottom:24px;">
              <h3 style="color:#1A4A2E;font-size:16px;margin:0 0 8px;">✝️ This Week's Lesson</h3>
              <p style="font-size:15px;color:#374151;line-height:1.7;margin:0;">${content.lessonSummary}</p>
            </div>` : ''}

            ${content.conversationStarter ? `
            <div style="margin-bottom:24px;background:#f8fafc;border-radius:8px;padding:16px 20px;">
              <h3 style="color:#1A4A2E;font-size:16px;margin:0 0 8px;">💬 Conversation Starter</h3>
              <p style="font-size:15px;color:#374151;font-style:italic;margin:0;">Ask ${child.first_name}: "${content.conversationStarter}"</p>
            </div>` : ''}

            ${season?.reward_description ? `
            <div style="margin-bottom:24px;background:#fef3c7;border-radius:8px;padding:14px 18px;">
              <p style="margin:0;font-size:14px;color:#92400e;">🎉 Working toward: <strong>${season.reward_description}</strong>${season.reward_date ? ` · ${new Date(season.reward_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}` : ''}</p>
            </div>` : ''}

            ${content.specialNotes ? `
            <div style="margin-bottom:24px;">
              <h3 style="color:#1A4A2E;font-size:16px;margin:0 0 8px;">📢 Special Notes</h3>
              <p style="font-size:15px;color:#374151;line-height:1.7;margin:0;">${content.specialNotes}</p>
            </div>` : ''}

            <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
            <p style="font-size:12px;color:#9ca3af;text-align:center;margin:0;">Sent with love by ${churchName} Children's Ministry · Powered by ShepherdWell</p>
          </div>
        </div>`;

      try {
        await resend.emails.send({
          from: `${churchName} <onboarding@resend.dev>`,
          to: recipients,
          subject: `${child.first_name}'s Week in Children's Ministry — ${dateDisplay}`,
          html,
        });
        sent++;
      } catch (_) {
        // Never block on email failure
      }
    }

    return sent;
  } catch (_) {
    return 0;
  }
}

export { sendParentEmails };
