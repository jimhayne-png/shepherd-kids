"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import AppShell, { type NavItem } from "@/components/layout/AppShell";

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

type Department = { id: string; name: string; color: string; icon: string | null };
type Event = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
  is_recurring: boolean;
  recurrence_frequency: string | null;
  recurrence_end_date: string | null;
  is_all_church: boolean;
  department_id: string | null;
  departments: Department | null;
};

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function addMonths(date: Date, n: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
}

function expandRecurringEvents(events: Event[]): Event[] {
  const result: Event[] = [];
  const maxDate = addDays(new Date(), 365);

  for (const ev of events) {
    if (!ev.is_recurring || !ev.recurrence_frequency) {
      result.push(ev);
      continue;
    }

    const origin = new Date(ev.starts_at);
    const rawEnd = ev.recurrence_end_date ? new Date(ev.recurrence_end_date) : maxDate;
    const effectiveEnd = rawEnd < maxDate ? rawEnd : maxDate;
    const durationMs = ev.ends_at ? new Date(ev.ends_at).getTime() - origin.getTime() : 0;

    let current = new Date(origin);
    let safety = 0;

    while (current <= effectiveEnd && safety < 500) {
      result.push({
        ...ev,
        starts_at: current.toISOString(),
        ends_at: ev.ends_at ? new Date(current.getTime() + durationMs).toISOString() : null,
      });
      if (ev.recurrence_frequency === "weekly") current = addDays(current, 7);
      else if (ev.recurrence_frequency === "biweekly") current = addDays(current, 14);
      else if (ev.recurrence_frequency === "monthly") current = addMonths(current, 1);
      else break;
      safety++;
    }
  }

  return result;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function formatTime(iso: string, allDay: boolean) {
  if (allDay) return "All day";
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function formatDateFull(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

function eventColor(event: Event) {
  return event.departments?.color ?? "#1A4A2E";
}

export default function CalendarPage() {
  const router = useRouter();
  const [authLoading, setAuthLoading] = useState(true);
  const [churchName, setChurchName] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  const today = new Date();
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [view, setView] = useState<"month" | "list">("month");
  const [deptFilter, setDeptFilter] = useState("all");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/"); return; }
      setToken(session.access_token);

      const { data: cu } = await supabase
        .from("church_users")
        .select("church_id, churches(name)")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!cu) { router.replace("/onboarding"); return; }
      const ch = cu.churches as unknown as { name: string } | null;
      setChurchName(ch?.name ?? null);
      setAuthLoading(false);
    }
    init();
  }, [router]);

  useEffect(() => {
    if (authLoading || !token) return;
    setEventsLoading(true);
    fetch("/api/events", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setEvents(d.events ?? []); setEventsLoading(false); })
      .catch(() => setEventsLoading(false));
  }, [authLoading, token]);

  useEffect(() => {
    if (authLoading) return;
    supabase.from("departments").select("id, name, color, icon")
      .then(({ data }) => setDepartments(data ?? []));
  }, [authLoading]);

  const filtered = useMemo(() => {
    let base = events;
    if (deptFilter === "all-church") base = events.filter(e => e.is_all_church);
    else if (deptFilter !== "all") base = events.filter(e => e.department_id === deptFilter);
    return expandRecurringEvents(base);
  }, [events, deptFilter]);

  // Build calendar grid
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  function eventsForDay(day: number) {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return filtered.filter(e => e.starts_at.slice(0, 10) === dateStr);
  }

  function dayKey(day: number) {
    return `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  const selectedDayEvents = selectedDay
    ? filtered.filter(e => e.starts_at.slice(0, 10) === selectedDay)
    : [];

  // Virtual instances of the same event share the same id; use starts_at to key them uniquely
  function evKey(ev: Event) { return `${ev.id}-${ev.starts_at}`; }

  // Upcoming events for list view
  const upcomingEvents = useMemo(() => {
    const now = new Date().toISOString();
    return [...filtered].filter(e => e.starts_at >= now).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  }, [filtered]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
    setSelectedDay(null);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
    setSelectedDay(null);
  };

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="text-gray-500">Loading…</div></div>;
  }

  return (
    <>
    <AppShell navItems={navItems}>
      {/* Hero */}
      <div className="px-8 py-8" style={{ background: "linear-gradient(135deg, #1A4A2E 0%, #2D6B42 100%)" }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-green-200 text-sm mb-1">{churchName}</p>
            <h1 className="text-3xl font-bold text-white">Calendar</h1>
          </div>
          <Link
            href="/dashboard/calendar/add"
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity"
            style={{ backgroundColor: "#F28C28", color: "#1A4A2E" }}
          >
            <span className="text-lg leading-none">+</span> Add Event
          </Link>
        </div>
      </div>

      <div className="px-6 py-6 bg-gray-50 min-h-screen">
        {/* Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2">
            <button onClick={prevMonth} className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 transition-colors">‹</button>
            <h2 className="text-lg font-bold text-gray-800 w-44 text-center">{MONTHS[viewMonth]} {viewYear}</h2>
            <button onClick={nextMonth} className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 transition-colors">›</button>
            <button
              onClick={() => { setViewMonth(today.getMonth()); setViewYear(today.getFullYear()); }}
              className="ml-1 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs text-gray-500 hover:bg-gray-50 transition-colors"
            >
              Today
            </button>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={deptFilter}
              onChange={e => setDeptFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-700 focus:outline-none"
            >
              <option value="all">All Events</option>
              <option value="all-church">All-Church Only</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              {(["month","list"] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className="px-4 py-2 text-sm font-medium transition-colors capitalize"
                  style={{
                    backgroundColor: view === v ? "#1A4A2E" : "#fff",
                    color: view === v ? "#fff" : "#6b7280",
                  }}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>

        {eventsLoading ? (
          <div className="text-center py-20 text-gray-400">Loading events…</div>
        ) : view === "month" ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-gray-100">
              {DAYS.map(d => (
                <div key={d} className="py-2 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide">{d}</div>
              ))}
            </div>
            {/* Day cells */}
            <div className="grid grid-cols-7">
              {cells.map((day, i) => {
                const isToday = day !== null && day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
                const dk = day ? dayKey(day) : "";
                const dayEvents = day ? eventsForDay(day) : [];
                const isSelected = dk === selectedDay;
                return (
                  <div
                    key={i}
                    onClick={() => day && setSelectedDay(isSelected ? null : dk)}
                    className="min-h-[88px] border-b border-r border-gray-50 p-1.5 cursor-pointer transition-colors"
                    style={{ backgroundColor: isSelected ? "#f0fdf4" : undefined }}
                  >
                    {day && (
                      <>
                        <div className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium mb-1 ${isToday ? "text-white" : "text-gray-700"}`}
                          style={{ backgroundColor: isToday ? "#1A4A2E" : undefined }}>
                          {day}
                        </div>
                        <div className="space-y-0.5">
                          {dayEvents.slice(0, 3).map(ev => (
                            <div
                              key={evKey(ev)}
                              onClick={e => { e.stopPropagation(); setSelectedEvent(ev); }}
                              className="truncate text-xs px-1.5 py-0.5 rounded font-medium text-white cursor-pointer hover:opacity-80"
                              style={{ backgroundColor: eventColor(ev) }}
                            >
                              {ev.title}
                            </div>
                          ))}
                          {dayEvents.length > 3 && (
                            <div className="text-xs text-gray-400 px-1">+{dayEvents.length - 3} more</div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Selected day panel */}
            {selectedDay && selectedDayEvents.length > 0 && (
              <div className="border-t border-gray-100 p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  {formatDateFull(selectedDay + "T00:00:00")}
                </h3>
                <div className="space-y-2">
                  {selectedDayEvents.map(ev => (
                    <div key={evKey(ev)} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: eventColor(ev) }} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm">{ev.title}</p>
                        <p className="text-xs text-gray-400">{formatTime(ev.starts_at, ev.all_day)}{ev.location ? ` · ${ev.location}` : ""}</p>
                      </div>
                      <Link href={`/dashboard/calendar/${ev.id}/edit`} className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded hover:bg-gray-100">Edit</Link>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          // List view
          <div className="space-y-3">
            {upcomingEvents.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-5xl mb-4">📅</div>
                <p className="text-gray-500 font-medium mb-1">No upcoming events</p>
                <p className="text-gray-400 text-sm mb-6">Add your first event to get started.</p>
                <Link href="/dashboard/calendar/add" className="inline-block px-6 py-2.5 rounded-lg font-semibold text-sm text-white" style={{ backgroundColor: "#1A4A2E" }}>
                  Add Event
                </Link>
              </div>
            ) : (
              upcomingEvents.map(ev => {
                const color = eventColor(ev);
                return (
                  <div key={evKey(ev)} className="bg-white rounded-xl border border-gray-100 shadow-sm flex overflow-hidden">
                    <div className="w-1.5 flex-shrink-0" style={{ backgroundColor: color }} />
                    <div className="flex-1 px-5 py-4 flex items-center gap-4">
                      <div className="text-center w-12 flex-shrink-0">
                        <p className="text-xs text-gray-400 uppercase font-semibold">{MONTHS[new Date(ev.starts_at).getMonth()].slice(0, 3)}</p>
                        <p className="text-2xl font-bold text-gray-900 leading-tight">{new Date(ev.starts_at).getDate()}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-gray-900">{ev.title}</p>
                          {ev.departments && (
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium text-white" style={{ backgroundColor: color }}>
                              {ev.departments.icon} {ev.departments.name}
                            </span>
                          )}
                          {ev.is_all_church && (
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700">All Church</span>
                          )}
                          {ev.is_recurring && (
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-50 text-blue-600">↺ {ev.recurrence_frequency}</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-400 mt-0.5">
                          {formatTime(ev.starts_at, ev.all_day)}
                          {ev.location && ` · ${ev.location}`}
                        </p>
                        {ev.description && <p className="text-sm text-gray-500 mt-1 truncate">{ev.description}</p>}
                      </div>
                      <Link href={`/dashboard/calendar/${ev.id}/edit`} className="text-xs text-gray-400 hover:text-gray-600 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors flex-shrink-0">
                        Edit
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </AppShell>

    {/* Event detail modal */}
    {selectedEvent && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
        onClick={e => { if (e.target === e.currentTarget) setSelectedEvent(null); }}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: eventColor(selectedEvent) }} />
              <h2 className="text-xl font-bold text-gray-900">{selectedEvent.title}</h2>
            </div>
            <button onClick={() => setSelectedEvent(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
          </div>
          <div className="space-y-2 text-sm text-gray-600">
            <p>📅 {formatDateFull(selectedEvent.starts_at)}</p>
            <p>🕐 {formatTime(selectedEvent.starts_at, selectedEvent.all_day)}{selectedEvent.ends_at ? ` – ${formatTime(selectedEvent.ends_at, selectedEvent.all_day)}` : ""}</p>
            {selectedEvent.location && <p>📍 {selectedEvent.location}</p>}
            {selectedEvent.departments && <p>🏛️ {selectedEvent.departments.icon} {selectedEvent.departments.name}</p>}
            {selectedEvent.is_all_church && <p>⛪ All-Church Event</p>}
            {selectedEvent.is_recurring && <p>↺ Repeats {selectedEvent.recurrence_frequency}</p>}
            {selectedEvent.description && <p className="mt-3 text-gray-500 leading-relaxed">{selectedEvent.description}</p>}
          </div>
          <div className="mt-6 flex gap-3">
            <Link
              href={`/dashboard/calendar/${selectedEvent.id}/edit`}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-center text-white hover:opacity-90 transition-opacity"
              style={{ backgroundColor: "#1A4A2E" }}
            >
              Edit Event
            </Link>
            <button onClick={() => setSelectedEvent(null)} className="flex-1 py-2.5 rounded-lg text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
              Close
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
