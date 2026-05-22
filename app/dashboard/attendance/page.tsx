"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import AppShell, { type NavItem } from "@/components/layout/AppShell";

const supabase = createClient();

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Members", href: "/dashboard/members" },
  { label: "Departments", href: "/dashboard/departments" },
  { label: "Attendance", href: "/dashboard/attendance" },
  { label: "Calendar", href: "/dashboard/calendar" },
  { label: "Prayer", href: "/dashboard/prayer" },
  { label: "Bulletin", href: "/dashboard/bulletin" },
  { label: "Communication Hub", href: "/dashboard/communication" },
  { label: "Visitation", href: "/dashboard/visitation" },
  { label: "Shepherd Pipeline", href: "/dashboard/shepherd" },
  { label: "Reviews", href: "/dashboard/reviews" },
  { label: "Evangelism", href: "/dashboard/evangelism" },
  { label: "Birthdays", href: "/dashboard/birthdays" },
  { label: "Tutorials", href: "/dashboard/tutorials" },
  { label: "Settings", href: "/dashboard/settings" },
];

type AttendanceEvent = {
  id: string;
  name: string;
  event_date: string;
  check_in_token: string;
  is_open: boolean;
  attendee_count: number;
  calendar_event_id: string | null;
};

type CalendarEvent = {
  id: string;
  title: string;
  starts_at: string;
};

function formatDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

export default function AttendancePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [events, setEvents] = useState<AttendanceEvent[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedCalendarEvent, setSelectedCalendarEvent] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  useEffect(() => {
    async function init() {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (!user || error) {
        console.log("Dashboard client user unavailable:", error?.message ?? null);
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setToken(session.access_token);

      const [attRes, calRes] = await Promise.all([
        fetch("/api/attendance", { headers: { Authorization: `Bearer ${session.access_token}` } }),
        fetch("/api/events", { headers: { Authorization: `Bearer ${session.access_token}` } }),
      ]);

      const attData = await attRes.json();
      const calData = await calRes.json();
      setEvents(attData.events ?? []);
      // Only show upcoming/recent calendar events
      const allCal: CalendarEvent[] = calData.events ?? [];
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 7);
      setCalendarEvents(allCal.filter(e => new Date(e.starts_at) >= cutoff).slice(0, 30));
      setLoading(false);
    }
    init();
  }, []);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);

  const stats = useMemo(() => {
    const thisMonth = events.filter(e => e.event_date >= monthStart);
    const totalAttendees = thisMonth.reduce((s, e) => s + e.attendee_count, 0);
    const avg = thisMonth.length > 0 ? Math.round(totalAttendees / thisMonth.length) : 0;
    return { eventsThisMonth: thisMonth.length, totalAttendees, avg };
  }, [events, monthStart]);

  function handleCalendarSelect(calEventId: string) {
    setSelectedCalendarEvent(calEventId);
    const found = calendarEvents.find(e => e.id === calEventId);
    if (found) {
      setNewName(found.title);
      setNewDate(found.starts_at.slice(0, 10));
    }
  }

  async function handleCreate() {
    if (!token || !newName.trim()) { setCreateError("Event name is required."); return; }
    setCreating(true);
    setCreateError("");
    const res = await fetch("/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ eventName: newName, eventDate: newDate, eventId: selectedCalendarEvent || null }),
    });
    const data = await res.json();
    if (!res.ok) { setCreateError(data.error ?? "Failed to create."); setCreating(false); return; }
    router.push(`/dashboard/attendance/${data.id}`);
  }

  if (loading) {
    return (
      <AppShell navItems={navItems}>
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-400 font-serif">Loading…</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell navItems={navItems}>
      {/* Hero */}
      <div className="px-8 py-8" style={{ background: "linear-gradient(135deg, #1A4A2E 0%, #2D6B42 100%)" }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-green-200 text-sm mb-1">Attendance & Check-In</p>
            <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "Georgia, serif" }}>
              📋 Attendance
            </h1>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm hover:opacity-90 transition-opacity"
            style={{ backgroundColor: "#F28C28", color: "#1A4A2E" }}
          >
            + Start Check-In
          </button>
        </div>
      </div>

      <div className="px-8 py-6 bg-gray-50 min-h-screen">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8 -mt-6">
          {[
            { label: "Events This Month", value: stats.eventsThisMonth, icon: "📅" },
            { label: "Total Attendees", value: stats.totalAttendees, icon: "👥" },
            { label: "Avg Per Event", value: stats.avg || "—", icon: "📊" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl shadow-md px-6 py-5 flex items-center gap-4 border border-gray-100">
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl flex-shrink-0" style={{ backgroundColor: "#F28C2818" }}>
                {s.icon}
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Event list */}
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4">Recent Sessions</h2>
        {events.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-16 text-center">
            <div className="text-5xl mb-4">📋</div>
            <p className="text-gray-500 font-medium mb-1" style={{ fontFamily: "Georgia, serif" }}>No check-in sessions yet</p>
            <p className="text-gray-400 text-sm mb-6">Start a session to begin tracking attendance.</p>
            <button
              onClick={() => setShowCreate(true)}
              className="px-6 py-2.5 rounded-lg font-bold text-sm text-white"
              style={{ backgroundColor: "#1A4A2E" }}
            >
              Start Check-In
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((ev) => (
              <div key={ev.id} className="bg-white rounded-xl border border-gray-100 shadow-sm flex items-center gap-4 px-6 py-4">
                {/* Date badge */}
                <div className="text-center w-12 flex-shrink-0">
                  <p className="text-xs text-gray-400 font-semibold uppercase">
                    {new Date(ev.event_date + "T00:00:00").toLocaleDateString("en-US", { month: "short" })}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 leading-tight">
                    {new Date(ev.event_date + "T00:00:00").getDate()}
                  </p>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900">{ev.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ev.is_open ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {ev.is_open ? "Open" : "Closed"}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 mt-0.5">
                    {ev.attendee_count} {ev.attendee_count === 1 ? "person" : "people"} checked in
                  </p>
                </div>

                <Link
                  href={`/dashboard/attendance/${ev.id}`}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-white hover:opacity-90 transition-opacity flex-shrink-0"
                  style={{ backgroundColor: "#1A4A2E" }}
                >
                  View →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowCreate(false); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: "Georgia, serif" }}>Start Check-In Session</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>

            {/* Link to calendar event */}
            {calendarEvents.length > 0 && (
              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Link to a calendar event (optional)</label>
                <select
                  value={selectedCalendarEvent}
                  onChange={(e) => handleCalendarSelect(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-green-700"
                  style={{ fontFamily: "Georgia, serif" }}
                >
                  <option value="">— None, enter manually —</option>
                  {calendarEvents.map((e) => (
                    <option key={e.id} value={e.id}>
                      {new Date(e.starts_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })} — {e.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Event name *</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Sunday Service, Youth Night…"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-700"
                style={{ fontFamily: "Georgia, serif" }}
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Date *</label>
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-700"
              />
            </div>

            {createError && (
              <p className="text-sm text-red-600 mb-4" style={{ fontFamily: "Georgia, serif" }}>{createError}</p>
            )}

            <button
              onClick={handleCreate}
              disabled={creating}
              className="w-full py-3 rounded-xl font-bold text-white hover:opacity-90 transition-opacity"
              style={{ backgroundColor: creating ? "#4b7a5e" : "#1A4A2E", fontFamily: "Georgia, serif" }}
            >
              {creating ? "Opening…" : "Open Check-In →"}
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
