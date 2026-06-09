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
  { label: "Visitors", href: "/dashboard/visitors" },
  { label: "Calendar", href: "/dashboard/calendar" },
  { label: "Prayer", href: "/dashboard/prayer" },
  { label: "Bulletin", href: "/dashboard/bulletin" },
  { label: "Communication Hub", href: "/dashboard/communication" },
  { label: "Visitation", href: "/dashboard/visitation" },
  { label: "Shepherd Pipeline", href: "/dashboard/shepherd" },
  { label: "Reviews", href: "/dashboard/reviews" },
  { label: "Evangelism", href: "/dashboard/evangelism" },
  { label: "Celebrations", href: "/dashboard/birthdays" },
  { label: "Tutorials", href: "/dashboard/tutorials" },
  { label: "Settings", href: "/dashboard/settings" },
];

const CERTIFICATES = [
  {
    key: "faith_milestone",
    name: "Faith Milestone Certificate",
    description: "Awarded when a child reaches a major faith milestone — first Bible, salvation decision, or completing a faith curriculum.",
  },
  {
    key: "scripture_memory",
    name: "Scripture Memory Award",
    description: "Recognizes a child who has memorized key scripture verses as part of their discipleship journey.",
  },
  {
    key: "baptism",
    name: "Baptism Celebration Certificate",
    description: "Commemorates a child's baptism — a beautiful keepsake to honor their public declaration of faith.",
  },
  {
    key: "promotion_sunday",
    name: "Promotion Sunday Certificate",
    description: "Given to children moving up to the next grade or class level during the annual Promotion Sunday celebration.",
  },
  {
    key: "servant_heart",
    name: "Servant Heart Award",
    description: "Honors a child who has demonstrated exceptional kindness, helpfulness, and servant leadership.",
  },
  {
    key: "birthday",
    name: "Birthday Celebration Certificate",
    description: "A special birthday keepsake for children celebrating their birthday, personalized with age and a message.",
  },
  {
    key: "spiritual_birthday",
    name: "Spiritual Birthday Certificate",
    description: "Celebrates the anniversary of a child's spiritual birthday — the day they gave their heart to Jesus.",
  },
] as const;

type BirthdayEvent = {
  memberId: string;
  firstName: string;
  lastName: string;
  eventType: "birthday" | "anniversary" | "spiritual_birthday";
  eventDate: string;
  years: number | null;
  isMilestone: boolean;
  milestoneYears: number | null;
  daysAway: number;
  logId: string | null;
};

type Stats = {
  totalThisMonth: number;
  milestonesThisMonth: number;
  todayCount: number;
};

function formatEventDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric" });
}

export default function BirthdaysPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [events, setEvents] = useState<BirthdayEvent[]>([]);
  const [stats, setStats] = useState<Stats>({ totalThisMonth: 0, milestonesThisMonth: 0, todayCount: 0 });
  const [filter, setFilter] = useState<"all" | "birthday" | "anniversary" | "spiritual_birthday">("all");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<string | null>(null);
  const [printingId, setPrintingId] = useState<string | null>(null);

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

      const res = await fetch("/api/birthdays?days=30", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      setEvents(data.events ?? []);
      setStats(data.stats ?? { totalThisMonth: 0, milestonesThisMonth: 0, todayCount: 0 });
      setLoading(false);
    }
    init();
  }, []);

  const filtered = useMemo(() =>
    filter === "all" ? events : events.filter(e => e.eventType === filter),
    [events, filter]
  );

  async function handlePrintLetter(ev: BirthdayEvent) {
    if (!token) return;
    setPrintingId(`${ev.memberId}:${ev.eventType}`);

    let logId = ev.logId;
    if (!logId) {
      const res = await fetch("/api/birthdays", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ memberId: ev.memberId, eventType: ev.eventType }),
      });
      const data = await res.json();
      logId = data.logId ?? null;
      if (logId) {
        setEvents(prev => prev.map(e =>
          e.memberId === ev.memberId && e.eventType === ev.eventType ? { ...e, logId } : e
        ));
      }
    }

    setPrintingId(null);
    if (logId) window.open(`/dashboard/birthdays/letter/${logId}`, "_blank");
  }

  async function handleSendToday() {
    if (!token) return;
    setSending(true);
    setSendResult(null);
    const res = await fetch("/api/cron/birthdays-anniversaries", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setSendResult(
      data.processed > 0
        ? `Sent digest for ${data.processed} event${data.processed !== 1 ? "s" : ""}.`
        : "No new events found for today (already sent, or none today)."
    );
    // Refresh event list
    const vRes = await fetch("/api/birthdays?days=30", { headers: { Authorization: `Bearer ${token}` } });
    const vData = await vRes.json();
    setEvents(vData.events ?? []);
    setStats(vData.stats ?? stats);
    setSending(false);
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

  // Group by date
  const grouped: Record<string, BirthdayEvent[]> = {};
  for (const ev of filtered) {
    if (!grouped[ev.eventDate]) grouped[ev.eventDate] = [];
    grouped[ev.eventDate].push(ev);
  }
  const sortedDates = Object.keys(grouped).sort();

  return (
    <AppShell navItems={navItems}>
      {/* Hero */}
      <div className="px-8 py-8" style={{ background: "linear-gradient(135deg, #92400e 0%, #b45309 100%)" }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-amber-200 text-sm mb-1">Next 30 Days</p>
            <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "Georgia, serif" }}>
              🎉 Celebrations
            </h1>
          </div>
          <button
            onClick={handleSendToday}
            disabled={sending}
            className="px-5 py-2.5 rounded-lg font-bold text-sm hover:opacity-90 transition-opacity"
            style={{ backgroundColor: "#F28C28", color: "white" }}
          >
            {sending ? "Sending…" : "📬 Send Today's Notifications"}
          </button>
        </div>
        {sendResult && (
          <p className="mt-3 text-amber-100 text-sm bg-white/10 px-4 py-2 rounded-lg inline-block">{sendResult}</p>
        )}
      </div>

      <div className="px-8 py-6 bg-gray-50 min-h-screen">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8 -mt-6">
          {[
            { label: "This Month", value: stats.totalThisMonth, icon: "📅", color: "#F28C28" },
            { label: "Milestones", value: stats.milestonesThisMonth, icon: "🎉", color: "#8b5cf6" },
            { label: "Today", value: stats.todayCount, icon: "🎂", color: "#22c55e" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl shadow-md px-6 py-5 flex items-center gap-4 border border-gray-100">
              <div className="w-11 h-11 rounded-full flex items-center justify-center text-xl flex-shrink-0" style={{ backgroundColor: s.color + "18" }}>
                {s.icon}
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {([
            { key: "all",              label: "All" },
            { key: "birthday",         label: "🎂 Birthdays" },
            { key: "anniversary",      label: "💍 Anniversaries" },
            { key: "spiritual_birthday", label: "🕊️ Spiritual Birthdays" },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${filter === key ? "text-white" : "bg-white border border-gray-200 text-gray-500 hover:border-gray-300"}`}
              style={filter === key ? { backgroundColor: "#F28C28" } : {}}
            >
              {label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-16 text-center">
            <div className="text-5xl mb-4">🎂</div>
            <p className="text-gray-500 font-medium" style={{ fontFamily: "Georgia, serif" }}>
              No {filter === "all" ? "events" : filter === "birthday" ? "birthdays" : filter === "anniversary" ? "anniversaries" : "spiritual birthdays"} in the next 30 days
            </p>
            <p className="text-gray-400 text-sm mt-1">Add birthdates, anniversaries, and spiritual birthdays on member profiles.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {sortedDates.map((date) => {
              const dayEvents = grouped[date];
              const isToday = dayEvents[0].daysAway === 0;
              const isTomorrow = dayEvents[0].daysAway === 1;

              return (
                <div key={date}>
                  {/* Date header */}
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-sm font-semibold text-gray-500">
                      {formatEventDate(date)}
                    </h3>
                    {isToday && <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-green-100 text-green-700">Today</span>}
                    {isTomorrow && <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-blue-100 text-blue-700">Tomorrow</span>}
                    {!isToday && !isTomorrow && (
                      <span className="text-xs text-gray-400">in {dayEvents[0].daysAway} days</span>
                    )}
                  </div>

                  <div className="space-y-2">
                    {dayEvents.map((ev) => {
                      const key = `${ev.memberId}:${ev.eventType}`;
                      const isPrinting = printingId === key;
                      return (
                        <div
                          key={key}
                          className={`bg-white rounded-xl border shadow-sm flex items-center gap-4 px-5 py-4 ${isToday ? "border-amber-200" : "border-gray-100"}`}
                        >
                          {/* Event icon */}
                          <div
                            className="w-11 h-11 rounded-full flex items-center justify-center text-lg flex-shrink-0"
                            style={{ backgroundColor: ev.eventType === "birthday" ? "#fef3c7" : ev.eventType === "anniversary" ? "#fce7f3" : "#ede9fe" }}
                          >
                            {ev.eventType === "birthday" ? "🎂" : ev.eventType === "anniversary" ? "💍" : "🕊️"}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Link
                                href={`/dashboard/members/${ev.memberId}/edit`}
                                className="font-semibold text-gray-900 hover:text-green-800 transition-colors"
                              >
                                {ev.firstName} {ev.lastName}
                              </Link>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ev.eventType === "birthday" ? "bg-amber-100 text-amber-700" : ev.eventType === "anniversary" ? "bg-pink-100 text-pink-700" : "bg-purple-100 text-purple-700"}`}>
                                {ev.eventType === "birthday" ? "Birthday" : ev.eventType === "anniversary" ? "Anniversary" : "🕊️ Spiritual Birthday"}
                              </span>
                              {ev.isMilestone && (
                                <span className="text-xs px-2 py-0.5 rounded-full font-bold text-white" style={{ backgroundColor: "#F28C28" }}>
                                  🎉 {ev.milestoneYears}{ev.eventType === "birthday" ? "th Birthday" : ev.eventType === "anniversary" ? " Years" : " Years in Faith"}
                                </span>
                              )}
                            </div>
                            {ev.years !== null && !ev.isMilestone && (
                              <p className="text-xs text-gray-400 mt-0.5">
                                {ev.eventType === "birthday" ? `Turning ${ev.years}` : ev.eventType === "anniversary" ? `${ev.years} years together` : `${ev.years} years in faith`}
                              </p>
                            )}
                          </div>

                          {/* TODO: Celebrations — Certificate generation (Sprint 2)
                              Add color and B&W certificate buttons here.
                              Each certificate needs: child name, adult leader / Children's Minister name,
                              church name, date, and milestone/award type.
                              Route: /dashboard/birthdays/certificate/[logId] */}
                          <button
                            onClick={() => handlePrintLetter(ev)}
                            disabled={isPrinting}
                            className="px-4 py-2 rounded-lg text-sm font-semibold text-white hover:opacity-90 transition-opacity flex-shrink-0"
                            style={{ backgroundColor: isPrinting ? "#9ca3af" : "#F28C28" }}
                          >
                            {isPrinting ? "…" : "🖨 Print Letter"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Award Certificates */}
        {/*
          TODO: Certificate generation (Sprint 2+)
          Each certificate will require the following inputs before generating:
            - Child name (from member profile)
            - Award / milestone type (selected certificate type)
            - Leader / Children's Minister name (from church settings or manual input)
            - Church name (from church profile)
            - Date awarded (defaults to today, editable)
            - Optional personal note or scripture (free text)
          Output:
            - Color template (branded, full-color PDF)
            - B&W template (print-friendly grayscale PDF)
          History:
            - Save each issued certificate to the child's profile (certificate_logs table)
          Route: /dashboard/birthdays/certificate/create?type=[key]
        */}
        <div className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: "#A9A9B8" }}>
            Award Certificates
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {CERTIFICATES.map((cert) => (
              <div
                key={cert.key}
                className="rounded-2xl p-5 flex flex-col gap-3"
                style={{ background: "#120A1F", border: "1px solid rgba(212, 175, 55, 0.25)" }}
              >
                <div>
                  <p className="font-semibold text-sm" style={{ color: "#FFFFFF" }}>{cert.name}</p>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: "#A9A9B8" }}>{cert.description}</p>
                </div>
                <button
                  disabled
                  className="mt-auto w-full py-2 rounded-lg text-xs font-semibold transition-opacity disabled:opacity-50 cursor-not-allowed"
                  style={{ background: "linear-gradient(135deg, #7B2CBF, #9D4EDD)", color: "#FFFFFF" }}
                >
                  Coming Soon
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
