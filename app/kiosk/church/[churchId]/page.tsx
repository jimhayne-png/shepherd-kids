import { adminClient } from "@/lib/api-auth";
import ChurchKioskForm from "./ChurchKioskForm";

type Session = { id: string; service_name: string; date: string; session_group: string | null };
type Group = { name: string; sessions: Session[] };
type Room = { id: string; name: string };
type Props = { params: Promise<{ churchId: string }> };

export default async function ChurchKioskPage({ params }: Props) {
  const { churchId } = await params;
  const admin = adminClient();

  const { data: churchRow } = await admin.from("churches").select("name, timezone").eq("id", churchId).maybeSingle();
  const tz = (churchRow as { name?: string; timezone?: string } | null)?.timezone ?? "America/Los_Angeles";
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date());

  const [{ data: sessionRows }, { data: roomRows }] = await Promise.all([
    admin
      .from("cm_checkin_sessions")
      .select("id, service_name, date, session_group")
      .eq("church_id", churchId)
      .eq("date", today)
      .eq("status", "open")
      .order("created_at", { ascending: true }),
    admin
      .from("cm_checkin_rooms")
      .select("id, name")
      .eq("church_id", churchId)
      .eq("is_active", true)
      .order("name"),
  ]);

  const sessions = (sessionRows ?? []) as Session[];
  const rooms: Room[] = (roomRows ?? []) as Room[];
  const churchName: string = (churchRow as { name?: string } | null)?.name ?? "";

  if (sessions.length === 0) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "#1a2e1a" }}
      >
        <div className="text-center text-white p-8">
          <div className="text-6xl mb-4">⛔</div>
          <h1 className="text-3xl font-bold mb-2">No Open Sessions</h1>
          {churchName && (
            <p className="text-base text-gray-400 mb-3">{churchName}</p>
          )}
          <p className="text-lg text-gray-300">
            There are no active check-in sessions right now.
          </p>
          <p className="text-sm text-gray-500 mt-4">
            Please see a staff member for assistance.
          </p>
        </div>
      </div>
    );
  }

  const groupMap = new Map<string, Session[]>();
  const ungrouped: Session[] = [];
  for (const s of sessions) {
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
