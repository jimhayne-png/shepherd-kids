import { type NextRequest } from "next/server";
import { getAuthContext, adminClient } from "@/lib/api-auth";
import { Resend } from "resend";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function resolveChurchId(request: NextRequest, auth: Awaited<ReturnType<typeof getAuthContext>>) {
  return (
    request.headers.get("x-selected-church-id") ??
    request.headers.get("X-Selected-Church-Id") ??
    auth?.churchId ??
    null
  );
}

function normalizePhone(phone: string | null | undefined) {
  return String(phone ?? "").replace(/\D/g, "");
}

function childFullName(child: any) {
  return `${child.first_name ?? ""} ${child.last_name ?? ""}`.trim();
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

export async function GET(request: NextRequest) {
  const auth = await getAuthContext(request);
  const churchId = resolveChurchId(request, auth);

  if (!churchId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = adminClient();

  const { data: church } = await admin
    .from("churches")
    .select("id, name")
    .eq("id", churchId)
    .maybeSingle();

  const { data: families, error: familiesError } = await admin
    .from("cm_visitor_families")
    .select(
      "id, church_id, parent1_first_name, parent1_last_name, parent1_phone, parent1_email, parent2_phone, parent2_email, status, follow_up_sent, next_day_sent, visit_date, created_at",
    )
    .eq("church_id", churchId)
    .order("visit_date", { ascending: false });

  if (familiesError) {
    return Response.json({ error: familiesError.message }, { status: 400 });
  }

  if (!families?.length) {
    return Response.json({ church, sessions: [] });
  }

  const familyIds = families.map((f: any) => f.id);

  const { data: children, error: childrenError } = await admin
    .from("cm_visitor_children")
    .select("id, church_id, family_id, first_name, last_name, pipeline_stage, created_at")
    .eq("church_id", churchId)
    .in("family_id", familyIds)
    .order("last_name", { ascending: true });

  if (childrenError) {
    return Response.json({ error: childrenError.message }, { status: 400 });
  }

  const phones = [
    ...new Set(
      families
        .flatMap((f: any) => [f.parent1_phone, f.parent2_phone])
        .map(normalizePhone)
        .filter(Boolean),
    ),
  ];

  const { data: records } = phones.length
    ? await admin
        .from("cm_checkin_records")
        .select("*")
        .eq("church_id", churchId)
        .in("parent_phone", phones)
        .order("checked_in_at", { ascending: false })
        .limit(1000)
    : { data: [] };

  const recordIds = (records ?? []).map((r: any) => r.id as string);

  const sessionIds = [
    ...new Set((records ?? []).map((r: any) => r.session_id as string).filter(Boolean)),
  ];

  const { data: checkinSessions } = sessionIds.length
    ? await admin
        .from("cm_checkin_sessions")
        .select("id, service_name, date, auto_followup")
        .in("id", sessionIds)
    : { data: [] };

  const sessionMap: Record<string, any> = {};
  for (const s of checkinSessions ?? []) sessionMap[s.id] = s;

  const roomIds = [
    ...new Set((records ?? []).map((r: any) => r.room_id).filter(Boolean) as string[]),
  ];

  const roomNameMap: Record<string, string> = {};
  if (roomIds.length) {
    const { data: rooms } = await admin
      .from("cm_checkin_rooms")
      .select("id, name")
      .in("id", roomIds);

    for (const room of rooms ?? []) roomNameMap[room.id] = room.name;
  }

  const { data: logs } = recordIds.length
    ? await admin
        .from("cm_followup_log")
        .select("id, record_id, status, follow_up_type, sent_at, parent_email, created_at")
        .in("record_id", recordIds)
        .order("created_at", { ascending: false })
    : { data: [] };

  const logMap: Record<string, any> = {};
  for (const log of logs ?? []) {
    if (!logMap[log.record_id]) logMap[log.record_id] = log;
  }

  const { data: touches } = recordIds.length
    ? await admin
        .from("cm_child_shepherd_touches")
        .select("*")
        .eq("church_id", churchId)
        .in("record_id", recordIds)
    : { data: [] };

  const touchMap: Record<string, any> = {};
  for (const t of touches ?? []) touchMap[t.record_id] = t;

  const recordsByPhoneAndChild = new Map<string, any>();

  for (const r of records ?? []) {
    const phone = normalizePhone(r.parent_phone);
    const name = String(r.child_name ?? "").trim().toLowerCase();
    const key = `${phone}|${name}`;

    if (!recordsByPhoneAndChild.has(key)) {
      recordsByPhoneAndChild.set(key, r);
    }
  }

  const visitCounts: Record<string, number> = {};
  const visitMap = new Map<string, Set<string>>();

  for (const r of records ?? []) {
    const phone = normalizePhone(r.parent_phone);
    if (!phone) continue;
    if (!visitMap.has(phone)) visitMap.set(phone, new Set());
    visitMap.get(phone)!.add(r.session_id);
  }

  for (const [phone, sessions] of visitMap) {
    visitCounts[phone] = sessions.size;
  }

  const childrenByFamily = new Map<string, any[]>();

  for (const child of children ?? []) {
    if (!childrenByFamily.has(child.family_id)) childrenByFamily.set(child.family_id, []);
    childrenByFamily.get(child.family_id)!.push(child);
  }

  const grouped: Record<string, any> = {};

  for (const family of families) {
    const phone = normalizePhone(family.parent1_phone);
    const familyChildren = childrenByFamily.get(family.id) ?? [];

    if (!familyChildren.length) continue;

    const parentName = `${family.parent1_first_name ?? ""} ${family.parent1_last_name ?? ""}`.trim();
    const parentEmail = family.parent1_email ?? family.parent2_email ?? null;

    const childRows = familyChildren.map((child: any) => {
      const fullName = childFullName(child);
      const key = `${phone}|${fullName.toLowerCase()}`;
      const checkinRecord = recordsByPhoneAndChild.get(key) ?? null;

      return {
        id: checkinRecord?.id ?? child.id,
        child_name: fullName,
        room_name: checkinRecord?.room_id ? roomNameMap[checkinRecord.room_id] ?? null : null,
        checked_in_at: checkinRecord?.checked_in_at ?? child.created_at,
        touches: checkinRecord?.id ? touchMap[checkinRecord.id] ?? null : null,
        _session_id: checkinRecord?.session_id ?? null,
        _record_id: checkinRecord?.id ?? null,
      };
    });

    const latestRecord = childRows.find((c: any) => c._session_id);
    const sessionId = latestRecord?._session_id ?? `family-${family.id}`;
    const visitDate = family.visit_date ?? family.created_at?.slice(0, 10) ?? new Date().toISOString().slice(0, 10);

    if (!grouped[sessionId]) {
      grouped[sessionId] = {
        session:
          sessionMap[sessionId] ?? {
            id: sessionId,
            service_name: "Family Follow Up",
            date: visitDate,
            auto_followup: true,
          },
        families: [],
      };
    }

    const realRecordIds = childRows.map((c: any) => c._record_id).filter(Boolean);
    const familyLog = realRecordIds.map((rid: string) => logMap[rid]).find(Boolean) ?? null;

    grouped[sessionId].families.push({
      parentName,
      parentPhone: phone,
      parentEmail,
      primaryRecordId: realRecordIds[0] ?? family.id,
      children: childRows.map(({ _session_id, _record_id, ...c }: any) => c),
      followupLog: familyLog,
      visitCount: visitCounts[phone] ?? 1,
    });
  }

  const sessions = Object.values(grouped).sort((a: any, b: any) => {
    const da = new Date(a.session.date ?? "1970-01-01").getTime();
    const db = new Date(b.session.date ?? "1970-01-01").getTime();
    return db - da;
  });

  return Response.json({ church, sessions });
}

export async function POST(request: NextRequest) {
  const auth = await getAuthContext(request);
  const churchId = resolveChurchId(request, auth);

  if (!churchId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const {
    sessionId,
    recordIds,
    parentName,
    parentPhone,
    parentEmail,
    childNames,
    followUpType,
    subject,
    bodyText,
  } = (await request.json()) as {
    sessionId: string;
    recordIds: string[];
    parentName: string;
    parentPhone?: string;
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
      .eq("id", churchId)
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
      church_id: churchId,
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

  // Update cm_visitor_families using direct phone match from POST body
  const normalizedParentPhone = normalizePhone(parentPhone);
  if (normalizedParentPhone) {
    const { data: allFamilies } = await admin
      .from("cm_visitor_families")
      .select("id, parent1_phone, parent2_phone")
      .eq("church_id", churchId);

    const matchedIds = (allFamilies ?? [])
      .filter(
        (f: any) =>
          normalizePhone(f.parent1_phone) === normalizedParentPhone ||
          normalizePhone(f.parent2_phone) === normalizedParentPhone,
      )
      .map((f: any) => f.id);

    if (matchedIds.length > 0) {
      await admin
        .from("cm_visitor_families")
        .update({ status: "contacted", follow_up_sent: true, contacted_at: now })
        .in("id", matchedIds);
    }
  }

  return Response.json({ ok: true, sent: sendEmail });
}