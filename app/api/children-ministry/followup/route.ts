import { type NextRequest } from "next/server";
import { getAuthContext, adminClient } from "@/lib/api-auth";
import { Resend } from "resend";

export async function GET(request: NextRequest) {
  const auth = await getAuthContext(request);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const admin = adminClient();

  const { data: church } = await admin
    .from("churches")
    .select("id, name")
    .eq("id", auth.churchId)
    .maybeSingle();

  const { data: records, error } = await admin
    .from("cm_checkin_records")
    .select("*")
    .eq("church_id", auth.churchId)
    .order("checked_in_at", { ascending: false })
    .limit(500);

  if (error) return Response.json({ error: error.message }, { status: 400 });
  if (!records?.length) return Response.json({ church, sessions: [] });

  const phones = [
    ...new Set(
      records
        .map((r: any) => r.parent_phone as string | null)
        .filter(Boolean) as string[],
    ),
  ];

  const familyMap: Record<string, any> = {};
  if (phones.length) {
    const phoneList = phones.join(",");
    const { data: visitorFamilies } = await admin
      .from("cm_visitor_families")
      .select(
        "id, parent1_phone, parent1_email, parent2_phone, parent2_email, follow_up_sent, next_day_sent, status, visit_date",
      )
      .eq("church_id", auth.churchId)
      .or(`parent1_phone.in.(${phoneList}),parent2_phone.in.(${phoneList})`);

    for (const vf of visitorFamilies ?? []) {
      if (vf.parent1_phone) familyMap[vf.parent1_phone] = vf;
      if (vf.parent2_phone) familyMap[vf.parent2_phone] = vf;
    }
  }

  const followupRecords = records.filter((r: any) => {
    const fam = familyMap[r.parent_phone];
    if (!fam) return r.is_new_visitor === true;
    return fam.status === "new" || fam.follow_up_sent === false || fam.follow_up_sent === null;
  });

  if (!followupRecords.length) return Response.json({ church, sessions: [] });

  const sessionIds = [...new Set(followupRecords.map((r: any) => r.session_id as string))];

  const { data: sessions } = await admin
    .from("cm_checkin_sessions")
    .select("id, service_name, date, auto_followup")
    .in("id", sessionIds)
    .order("date", { ascending: false });

  const sessionMap: Record<string, any> = {};
  for (const s of sessions ?? []) sessionMap[s.id] = s;

  const roomIds = [
    ...new Set(followupRecords.map((r: any) => r.room_id).filter(Boolean) as string[]),
  ];

  const roomNameMap: Record<string, string> = {};
  if (roomIds.length) {
    const { data: rooms } = await admin
      .from("cm_checkin_rooms")
      .select("id, name")
      .in("id", roomIds);

    for (const room of rooms ?? []) roomNameMap[room.id] = room.name;
  }

  const recordIds = followupRecords.map((r: any) => r.id as string);

  const { data: logs } = await admin
    .from("cm_followup_log")
    .select("id, record_id, status, follow_up_type, sent_at, parent_email")
    .in("record_id", recordIds)
    .order("created_at", { ascending: false });

  const logMap: Record<string, any> = {};
  for (const log of logs ?? []) {
    if (!logMap[log.record_id]) logMap[log.record_id] = log;
  }

  const { data: touches } = await admin
    .from("cm_child_shepherd_touches")
    .select("*")
    .eq("church_id", auth.churchId)
    .in("record_id", recordIds);

  const touchMap: Record<string, any> = {};
  for (const t of touches ?? []) touchMap[t.record_id] = t;

  const visitCounts: Record<string, number> = {};
  if (phones.length) {
    const { data: allVisits } = await admin
      .from("cm_checkin_records")
      .select("parent_phone, session_id")
      .eq("church_id", auth.churchId)
      .in("parent_phone", phones);

    const visitMap = new Map<string, Set<string>>();

    for (const v of allVisits ?? []) {
      if (!visitMap.has(v.parent_phone)) visitMap.set(v.parent_phone, new Set());
      visitMap.get(v.parent_phone)!.add(v.session_id);
    }

    for (const [phone, sSet] of visitMap) visitCounts[phone] = sSet.size;
  }

  const emailMap: Record<string, string> = {};
  for (const [phone, fam] of Object.entries(familyMap)) {
    if (fam.parent1_phone === phone && fam.parent1_email) emailMap[phone] = fam.parent1_email;
    if (fam.parent2_phone === phone && fam.parent2_email) emailMap[phone] = fam.parent2_email;
  }

  const grouped: Record<string, Record<string, any[]>> = {};

  for (const r of followupRecords) {
    if (!grouped[r.session_id]) grouped[r.session_id] = {};
    if (!grouped[r.session_id][r.parent_phone]) grouped[r.session_id][r.parent_phone] = [];
    grouped[r.session_id][r.parent_phone].push(r);
  }

  const result = sessionIds
    .filter((sid) => sessionMap[sid])
    .map((sid) => {
      const families = Object.entries(grouped[sid] ?? {}).map(([phone, recs]) => {
        const first = (recs as any[])[0];
        const familyLog = (recs as any[]).map((r) => logMap[r.id]).find(Boolean) ?? null;

        return {
          parentName: first.parent_name as string,
          parentPhone: phone,
          parentEmail: emailMap[phone] ?? null,
          primaryRecordId: first.id as string,
          children: (recs as any[]).map((r) => ({
            id: r.id,
            child_name: r.child_name,
            room_name: r.room_id ? roomNameMap[r.room_id] ?? null : null,
            checked_in_at: r.checked_in_at,
            touches: touchMap[r.id] ?? null,
          })),
          followupLog: familyLog,
          visitCount: visitCounts[phone] ?? 1,
        };
      });

      return { session: sessionMap[sid], families };
    });

  return Response.json({ church, sessions: result });
}

function plainToHtml(text: string): string {
  return text
    .split(/\n\n+/)
    .map(
      (para) =>
        `<p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px;">${para.replace(/\n/g, "<br>")}</p>`,
    )
    .join("");
}

export async function POST(request: NextRequest) {
  const auth = await getAuthContext(request);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const {
    sessionId,
    recordIds,
    parentName,
    parentEmail,
    childNames,
    followUpType,
    subject,
    bodyText,
  } = (await request.json()) as {
    sessionId: string;
    recordIds: string[];
    parentName: string;
    parentEmail?: string;
    childNames: string[];
    followUpType: "email" | "marked";
    subject?: string;
    bodyText?: string;
  };

  if (!sessionId || !recordIds?.length) {
    return Response.json({ error: "sessionId and recordIds required" }, { status: 400 });
  }

  const admin = adminClient();
  const now = new Date().toISOString();
  const sendEmail = followUpType === "email" && !!parentEmail?.trim();

  if (sendEmail) {
    const { data: church } = await admin
      .from("churches")
      .select("name")
      .eq("id", auth.churchId)
      .maybeSingle();

    const churchName = church?.name ?? "Our Church";

    const html = `
<div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#1f2937;">
  <div style="background:#7B2CBF;padding:28px 32px;border-radius:12px 12px 0 0;text-align:center;">
    <h1 style="color:white;margin:0;font-size:22px;font-weight:bold;">${churchName}</h1>
    <p style="color:rgba(255,255,255,0.9);margin:8px 0 0;font-size:14px;">Children's Ministry</p>
  </div>
  <div style="background:white;padding:36px 32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
    ${plainToHtml(bodyText ?? "")}
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0;">
    <p style="font-size:12px;color:#9ca3af;text-align:center;margin:0;">Sent via ShepherdKids</p>
  </div>
</div>`;

    const resend = new Resend(process.env.RESEND_API_KEY!);

    try {
      await resend.emails.send({
        from: `${churchName} Children's Ministry <onboarding@resend.dev>`,
        to: [parentEmail!],
        subject: subject ?? "Welcome to our Children's Ministry!",
        html,
      });
    } catch (err: any) {
      return Response.json({ error: err?.message ?? "Email send failed" }, { status: 500 });
    }
  }

  for (const rid of recordIds) {
    await admin.from("cm_followup_log").insert({
      church_id: auth.churchId,
      session_id: sessionId,
      record_id: rid,
      parent_email: parentEmail ?? null,
      parent_name: parentName ?? null,
      child_names: childNames ?? [],
      follow_up_type: followUpType,
      status: "sent",
      personalized_message: bodyText ?? null,
      auto_send: false,
      sent_at: sendEmail ? now : null,
    });
  }

  return Response.json({ ok: true, sent: sendEmail });
}