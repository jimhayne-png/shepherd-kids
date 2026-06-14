import { adminClient } from "@/lib/api-auth";
import ChurchKioskForm from "./ChurchKioskForm";

type RawSession = { id: string; service_name: string; date: string; session_group: string | null; scheduled_time: string | null; status: string };
type Session = { id: string; service_name: string; date: string; session_group: string | null };
type Group = { name: string; sessions: Session[] };
type Room = { id: string; name: string };
type Props = { params: Promise<{ churchId: string }> };

function parseTimeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export default async function ChurchKioskPage({ params }: Props) {
  const { churchId } = await params;
  const admin = adminClient();

  const { data: churchRow } = await admin
    .from("churches")
    .select("name, timezone, check_in_opens_minutes_before, check_in_closes_minutes_after")
    .eq("id", churchId)
    .maybeSingle();

  const church = churchRow as {
    name?: string;
    timezone?: string;
    check_in_opens_minutes_before?: number;
    check_in_closes_minutes_after?: number;
  } | null;

  const tz = church?.timezone ?? "America/Los_Angeles";
  const opensBefore = church?.check_in_opens_minutes_before ?? 30;
  const closesAfter = church?.check_in_closes_minutes_after ?? 30;

  const now = new Date();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(now);

  const timeParts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "2-digit", minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const currentHour = Number(timeParts.find(p => p.type === "hour")?.value ?? 0);
  const currentMinute = Number(timeParts.find(p => p.type === "minute")?.value ?? 0);
  const currentChurchMinutes = currentHour * 60 + currentMinute;

  const currentChurchTime = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
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
  const churchName: string = church?.name ?? "";

  // Filter sessions by time window
  const availableSessions: Session[] = [];
  let nextSessionMinutes: number | null = null;
  let nextSessionName: string | null = null;

  for (const s of allTodaySessions) {
    if (!s.scheduled_time) {
      // No scheduled time — show if status is open (manual control)
      if (s.status === "open") {
        availableSessions.push({ id: s.id, service_name: s.service_name, date: s.date, session_group: s.session_group });
      }
      continue;
    }

    const scheduledMinutes = parseTimeToMinutes(s.scheduled_time);
    const openAtMinutes = scheduledMinutes - opensBefore;
    const closeAtMinutes = scheduledMinutes + closesAfter;
    const isWithinWindow = currentChurchMinutes >= openAtMinutes && currentChurchMinutes <= closeAtMinutes;

    console.log("[kiosk:session]", {
      service: s.service_name,
      scheduledTime: s.scheduled_time,
      scheduledMinutes,
      openAtMinutes,
      closeAtMinutes,
      currentChurchMinutes,
      isWithinWindow,
      status: s.status,
    });

    if (isWithinWindow) {
      availableSessions.push({ id: s.id, service_name: s.service_name, date: s.date, session_group: s.session_group });
    } else if (currentChurchMinutes < openAtMinutes) {
      if (nextSessionMinutes === null || openAtMinutes < nextSessionMinutes) {
        nextSessionMinutes = openAtMinutes;
        nextSessionName = s.service_name;
      }
    }
  }

  console.log("[kiosk:availability]", {
    churchTimezone: tz,
    currentChurchTime,
    currentChurchMinutes,
    today,
    opensBefore,
    closesAfter,
    totalTodaySessions: allTodaySessions.length,
    availableSessionCount: availableSessions.length,
    nextSessionName,
    nextSessionMinutes,
  });

  if (availableSessions.length === 0) {
    let nextHint: string | null = null;
    if (nextSessionMinutes !== null && nextSessionName) {
      const h = Math.floor(nextSessionMinutes / 60);
      const m = nextSessionMinutes % 60;
      const label = `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
      nextHint = `${nextSessionName} check-in opens at ${label}`;
    }

    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "#08060D" }}
      >
        <div className="text-center text-white p-8">
          <div className="text-6xl mb-4">⛔</div>
          <h1 className="text-3xl font-bold mb-2">Check-In Is Not Open</h1>
          {churchName && (
            <p className="text-base text-gray-400 mb-3">{churchName}</p>
          )}
          <p className="text-lg text-gray-300">
            No check-in session is currently open.
          </p>
          {nextHint && (
            <p className="text-sm mt-3" style={{ color: "#D4AF37" }}>
              {nextHint}
            </p>
          )}
          <p className="text-sm text-gray-500 mt-4">
            Please see a staff member for assistance.
          </p>
        </div>
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
