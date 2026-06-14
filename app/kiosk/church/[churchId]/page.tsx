import { unstable_noStore as noStore } from "next/cache";
import { adminClient } from "@/lib/api-auth";
import ChurchKioskForm from "./ChurchKioskForm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RawSession = {
  id: string;
  service_name: string;
  date: string;
  session_group: string | null;
  scheduled_time: string | null;
  status: string;
};
type Session = { id: string; service_name: string; date: string; session_group: string | null };
type Group = { name: string; sessions: Session[] };
type Room = { id: string; name: string };
type Props = {
  params: Promise<{ churchId: string }>;
  searchParams: Promise<{ debug?: string }>;
};

// Handles HH:mm, HH:mm:ss (Postgres time), ISO timestamps, and null.
function timeStringToMinutes(value: string | null | undefined): number | null {
  if (!value) return null;
  const isoMatch = value.match(/T(\d{2}):(\d{2})/);
  if (isoMatch) return Number(isoMatch[1]) * 60 + Number(isoMatch[2]);
  const parts = value.split(":");
  if (parts.length < 2) return null;
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

export default async function ChurchKioskPage({ params, searchParams }: Props) {
  noStore();
  const [{ churchId }, sp] = await Promise.all([params, searchParams]);
  const debug = sp.debug === "1";
  const admin = adminClient();

  // Attempt to read window settings. If the migration hasn't been applied yet,
  // the query will error — we catch that and fall back to base columns so the
  // timezone is still correct.
  let tz = "America/Los_Angeles";
  let opensBefore = 30;
  let closesAfter = 30;
  let churchName = "";
  let churchQueryError: string | null = null;

  const { data: churchRow, error: churchError } = await admin
    .from("churches")
    .select("name, timezone, check_in_opens_minutes_before, check_in_closes_minutes_after")
    .eq("id", churchId)
    .maybeSingle();

  if (churchError) {
    churchQueryError = churchError.message;
    // Columns may not exist yet — fall back to the always-present columns.
    const { data: fallbackRow } = await admin
      .from("churches")
      .select("name, timezone")
      .eq("id", churchId)
      .maybeSingle();
    if (fallbackRow) {
      const fb = fallbackRow as { name?: string; timezone?: string };
      tz = fb.timezone ?? tz;
      churchName = fb.name ?? "";
    }
  } else if (churchRow) {
    const cr = churchRow as {
      name?: string;
      timezone?: string;
      check_in_opens_minutes_before?: number | null;
      check_in_closes_minutes_after?: number | null;
    };
    tz = cr.timezone ?? tz;
    opensBefore = cr.check_in_opens_minutes_before ?? 30;
    closesAfter = cr.check_in_closes_minutes_after ?? 30;
    churchName = cr.name ?? "";
  }

  const now = new Date();

  // en-CA gives unambiguous YYYY-MM-DD (matches Postgres DATE output).
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(now);

  // en-GB gives unambiguous 24-hour HH:MM without the midnight-as-"24" quirk
  // that en-US with hour12:false can produce in some Node/ICU versions.
  const churchTimeStr = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);
  const currentChurchMinutes = timeStringToMinutes(churchTimeStr) ?? 0;

  const currentChurchTime = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    month: "2-digit", day: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: true,
  }).format(now);

  const [{ data: sessionRows }, { data: roomRows }] = await Promise.all([
    admin
      .from("cm_checkin_sessions")
      .select("id, service_name, date, session_group, scheduled_time, status")
      .eq("church_id", churchId)
      .eq("date", today)
      .neq("status", "closed")
      .order("created_at", { ascending: true }),
    admin
      .from("cm_checkin_rooms")
      .select("id, name")
      .eq("church_id", churchId)
      .eq("is_active", true)
      .order("name"),
  ]);

  const allTodaySessions = (sessionRows ?? []) as RawSession[];
  const rooms: Room[] = (roomRows ?? []) as Room[];

  type DebugEntry = {
    id: string;
    service: string;
    date: string;
    status: string;
    scheduledTime: string | null;
    scheduledMinutes: number | null;
    openAtMinutes: number | null;
    closeAtMinutes: number | null;
    isWithinWindow: boolean | null;
    verdict: string;
  };
  const debugEntries: DebugEntry[] = [];

  const availableSessions: Session[] = [];
  let nextSessionMinutes: number | null = null;
  let nextSessionName: string | null = null;

  for (const s of allTodaySessions) {
    const scheduledMinutes = timeStringToMinutes(s.scheduled_time);

    if (scheduledMinutes === null) {
      const verdict = s.status === "open" ? "available (manual, no scheduled_time)" : "skipped (manual, status not open)";
      debugEntries.push({ id: s.id, service: s.service_name, date: s.date, status: s.status, scheduledTime: s.scheduled_time, scheduledMinutes: null, openAtMinutes: null, closeAtMinutes: null, isWithinWindow: null, verdict });
      if (s.status === "open") {
        availableSessions.push({ id: s.id, service_name: s.service_name, date: s.date, session_group: s.session_group });
      }
      continue;
    }

    const openAtMinutes = scheduledMinutes - opensBefore;
    const closeAtMinutes = scheduledMinutes + closesAfter;
    const isWithinWindow = currentChurchMinutes >= openAtMinutes && currentChurchMinutes <= closeAtMinutes;

    let verdict: string;
    if (isWithinWindow) {
      verdict = "available (within window)";
      availableSessions.push({ id: s.id, service_name: s.service_name, date: s.date, session_group: s.session_group });
    } else if (currentChurchMinutes < openAtMinutes) {
      const hh = Math.floor(openAtMinutes / 60) % 24;
      const mm = openAtMinutes % 60;
      verdict = `upcoming — opens at ${hh % 12 || 12}:${String(mm).padStart(2, "0")} ${hh < 12 ? "AM" : "PM"}`;
      if (nextSessionMinutes === null || openAtMinutes < nextSessionMinutes) {
        nextSessionMinutes = openAtMinutes;
        nextSessionName = s.service_name;
      }
    } else {
      verdict = "past window";
    }

    debugEntries.push({ id: s.id, service: s.service_name, date: s.date, status: s.status, scheduledTime: s.scheduled_time, scheduledMinutes, openAtMinutes, closeAtMinutes, isWithinWindow, verdict });

    console.log("[kiosk:session]", {
      service: s.service_name,
      scheduledTime: s.scheduled_time,
      scheduledMinutes,
      openAtMinutes,
      closeAtMinutes,
      currentChurchMinutes,
      isWithinWindow,
      verdict,
    });
  }

  console.log("[kiosk:availability]", {
    churchTimezone: tz,
    currentChurchTime,
    currentChurchMinutes,
    today,
    opensBefore,
    closesAfter,
    churchQueryError,
    totalTodaySessions: allTodaySessions.length,
    availableSessionCount: availableSessions.length,
    nextSessionName,
    nextSessionMinutes,
  });

  if (availableSessions.length === 0) {
    let nextHint: string | null = null;
    if (nextSessionMinutes !== null && nextSessionName) {
      const h = Math.floor(nextSessionMinutes / 60) % 24;
      const m = nextSessionMinutes % 60;
      const label = `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
      nextHint = `${nextSessionName} check-in opens at ${label}`;
    }

    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center"
        style={{ backgroundColor: "#08060D" }}
      >
        <div className="text-center text-white p-8">
          <div className="text-6xl mb-4">⛔</div>
          <h1 className="text-3xl font-bold mb-2">Check-In Is Not Open</h1>
          {churchName && <p className="text-base text-gray-400 mb-3">{churchName}</p>}
          <p className="text-lg text-gray-300">No check-in session is currently open.</p>
          {nextHint && (
            <p className="text-sm mt-3" style={{ color: "#D4AF37" }}>{nextHint}</p>
          )}
          <p className="text-sm text-gray-500 mt-4">Please see a staff member for assistance.</p>
        </div>

        {debug && (
          <div
            className="mt-6 mx-4 w-full max-w-2xl rounded-xl border p-4 text-xs font-mono"
            style={{ background: "#1C0A30", borderColor: "rgba(123,44,191,0.5)", color: "#D8D8E8" }}
          >
            <p className="font-bold mb-3" style={{ color: "#D4AF37" }}>🔍 Debug — add ?debug=1 to URL</p>
            <div className="space-y-1 mb-4">
              <p><span style={{ color: "#D4AF37" }}>Timezone:</span> {tz}</p>
              <p><span style={{ color: "#D4AF37" }}>Church time:</span> {currentChurchTime}</p>
              <p>
                <span style={{ color: "#D4AF37" }}>Current minutes:</span>{" "}
                {currentChurchMinutes} ({String(Math.floor(currentChurchMinutes / 60)).padStart(2, "0")}:{String(currentChurchMinutes % 60).padStart(2, "0")})
              </p>
              <p><span style={{ color: "#D4AF37" }}>Today (church-local):</span> {today}</p>
              <p><span style={{ color: "#D4AF37" }}>Opens before service:</span> {opensBefore} min</p>
              <p><span style={{ color: "#D4AF37" }}>Closes after service:</span> {closesAfter} min</p>
              {churchQueryError && (
                <p><span className="text-red-400">⚠ Church query error (migration not applied?):</span> {churchQueryError}</p>
              )}
            </div>

            <p className="font-bold mb-2" style={{ color: "#D4AF37" }}>
              Sessions for {today} ({allTodaySessions.length} returned before filter):
            </p>
            {allTodaySessions.length === 0 ? (
              <p className="text-red-400">No sessions found for date={today} and church_id={churchId}</p>
            ) : (
              <div className="space-y-2">
                {debugEntries.map(e => (
                  <div key={e.id} className="rounded p-2 border" style={{ borderColor: "rgba(255,255,255,0.12)" }}>
                    <p className="font-bold text-white">{e.service}</p>
                    <p>status: <b>{e.status}</b> | date: {e.date} | scheduled_time: <b>{e.scheduledTime ?? "null"}</b></p>
                    {e.scheduledMinutes !== null && (
                      <p>
                        scheduled: {e.scheduledMinutes}m | openAt: {e.openAtMinutes}m | closeAt: {e.closeAtMinutes}m | now: {currentChurchMinutes}m
                      </p>
                    )}
                    <p
                      className="font-semibold"
                      style={{ color: e.verdict.startsWith("available") ? "#4ade80" : "#f87171" }}
                    >
                      → {e.verdict}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  const groupMap = new Map<string, Session[]>();
  const ungrouped: Session[] = [];
  for (const s of availableSessions) {
    if (s.session_group) {
      if (!groupMap.has(s.session_group)) groupMap.set(s.session_group, []);
      groupMap.get(s.session_group)!.push(s);
    } else {
      ungrouped.push(s);
    }
  }
  const groups: Group[] = Array.from(groupMap.entries()).map(([name, sess]) => ({
    name,
    sessions: sess,
  }));

  return (
    <ChurchKioskForm
      churchId={churchId}
      churchName={churchName}
      groups={groups}
      ungrouped={ungrouped}
      rooms={rooms}
    />
  );
}
