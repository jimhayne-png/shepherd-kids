"use client";

import { useEffect, useState, useMemo } from "react";
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

// Maps Celebrations cert keys to Certificate Creator cert type keys where they differ
function certLinkType(key: string): string {
  return key === "promotion_sunday" ? "promotion" : key;
}

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
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [events, setEvents] = useState<BirthdayEvent[]>([]);
  const [stats, setStats] = useState<Stats>({ totalThisMonth: 0, milestonesThisMonth: 0, todayCount: 0 });
  const [filter, setFilter] = useState<"all" | "birthday" | "spiritual_birthday">("all");
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

  const filtered = useMemo(
    () => filter === "all" ? events : events.filter(e => e.eventType === filter),
    [events, filter]
  );

  const upcomingCount = useMemo(
    () => events.filter(e => e.eventType === "birthday" || e.eventType === "spiritual_birthday").length,
    [events]
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
    const vRes = await fetch("/api/birthdays?days=30", { headers: { Authorization: `Bearer ${token}` } });
    const vData = await vRes.json();
    setEvents(vData.events ?? []);
    setStats(vData.stats ?? stats);
    setSending(false);
  }

  if (loading) {
    return (
      <AppShell navItems={navItems}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", backgroundColor: "#08060D" }}>
          <p style={{ color: "#A9A9B8", fontFamily: "Georgia, serif" }}>Loading…</p>
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
      <div style={{ padding: "32px", background: "linear-gradient(135deg, #08060D 0%, #1C0A30 100%)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ color: "#D4AF37", fontSize: "13px", marginBottom: "4px", fontWeight: 600 }}>ShepherdKids</p>
            <h1 style={{ fontSize: "28px", fontWeight: 700, color: "#FFFFFF", fontFamily: "Georgia, serif", margin: 0 }}>
              🎉 Celebrations
            </h1>
          </div>
          <div style={{ display: "flex", gap: "10px", flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <Link
              href="/dashboard/children-ministry/certificates/new"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: "rgba(212,175,55,0.12)",
                color: "#D4AF37",
                border: "1px solid rgba(212,175,55,0.35)",
                borderRadius: "8px",
                padding: "10px 20px",
                fontSize: "14px",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              🎓 Create Certificate
            </Link>
            <button
              onClick={handleSendToday}
              disabled={sending}
              style={{
                background: "linear-gradient(135deg, #7B2CBF, #9D4EDD)",
                color: "#FFFFFF",
                border: "none",
                borderRadius: "8px",
                padding: "10px 20px",
                fontSize: "14px",
                fontWeight: 700,
                cursor: sending ? "not-allowed" : "pointer",
                opacity: sending ? 0.7 : 1,
              }}
            >
              {sending ? "Sending…" : "📬 Send Today's Notifications"}
            </button>
          </div>
        </div>
        {sendResult && (
          <p style={{ marginTop: "12px", color: "#D4AF37", fontSize: "13px", background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.3)", padding: "8px 16px", borderRadius: "8px", display: "inline-block" }}>
            {sendResult}
          </p>
        )}
      </div>

      <div style={{ padding: "24px 32px", backgroundColor: "#0A0814", minHeight: "100vh" }}>
        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "32px", marginTop: "-24px" }}>
          {[
            { label: "This Month", value: stats.totalThisMonth, icon: "📅", color: "#7B2CBF" },
            { label: "Milestones", value: stats.milestonesThisMonth, icon: "🎉", color: "#9D4EDD" },
            { label: "Next 30 Days", value: upcomingCount, icon: "🎂", color: "#D4AF37" },
          ].map((s) => (
            <div key={s.label} style={{ background: "#120A1F", borderRadius: "16px", padding: "20px 24px", display: "flex", alignItems: "center", gap: "16px", border: "1px solid rgba(212,175,55,0.25)" }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", flexShrink: 0, backgroundColor: s.color + "22" }}>
                {s.icon}
              </div>
              <div>
                <p style={{ fontSize: "24px", fontWeight: 700, color: "#FFFFFF", margin: 0 }}>{s.value}</p>
                <p style={{ fontSize: "12px", color: "#A9A9B8", margin: "2px 0 0" }}>{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "24px" }}>
          {([
            { key: "all",               label: "All" },
            { key: "birthday",          label: "🎂 Birthdays" },
            { key: "spiritual_birthday", label: "🕊️ Upcoming Spiritual Birthdays" },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              style={
                filter === key
                  ? { background: "linear-gradient(135deg, #7B2CBF, #9D4EDD)", color: "#FFFFFF", border: "none", borderRadius: "8px", padding: "6px 16px", fontSize: "13px", fontWeight: 700, cursor: "pointer" }
                  : { background: "#120A1F", border: "1px solid rgba(212,175,55,0.25)", color: "rgba(255,255,255,0.7)", borderRadius: "8px", padding: "6px 16px", fontSize: "13px", fontWeight: 500, cursor: "pointer" }
              }
            >
              {label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div style={{ background: "#120A1F", borderRadius: "16px", border: "1px dashed rgba(212,175,55,0.3)", padding: "64px", textAlign: "center" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>🎂</div>
            <p style={{ color: "#FFFFFF", fontWeight: 500, fontFamily: "Georgia, serif", margin: 0 }}>
              No celebrations in the next 30 days.
            </p>
            <p style={{ color: "#A9A9B8", fontSize: "13px", marginTop: "6px" }}>
              Add birthdays and spiritual birthdays on child profiles.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {sortedDates.map((date) => {
              const dayEvents = grouped[date];
              const isToday = dayEvents[0].daysAway === 0;
              const isTomorrow = dayEvents[0].daysAway === 1;

              return (
                <div key={date}>
                  {/* Date header */}
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                    <h3 style={{ fontSize: "13px", fontWeight: 600, color: "#A9A9B8", margin: 0 }}>
                      {formatEventDate(date)}
                    </h3>
                    {isToday && (
                      <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "20px", fontWeight: 700, background: "rgba(123,44,191,0.25)", color: "#c084fc" }}>
                        Today
                      </span>
                    )}
                    {isTomorrow && (
                      <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "20px", fontWeight: 700, background: "rgba(59,130,246,0.2)", color: "#93c5fd" }}>
                        Tomorrow
                      </span>
                    )}
                    {!isToday && !isTomorrow && (
                      <span style={{ fontSize: "12px", color: "#A9A9B8" }}>in {dayEvents[0].daysAway} days</span>
                    )}
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {dayEvents.map((ev) => {
                      const evKey = `${ev.memberId}:${ev.eventType}`;
                      const isPrinting = printingId === evKey;
                      return (
                        <div
                          key={evKey}
                          style={{
                            background: "#120A1F",
                            borderRadius: "12px",
                            border: isToday ? "1px solid rgba(212,175,55,0.6)" : "1px solid rgba(212,175,55,0.2)",
                            display: "flex",
                            alignItems: "center",
                            gap: "16px",
                            padding: "16px 20px",
                          }}
                        >
                          {/* Event icon */}
                          <div
                            style={{
                              width: 44,
                              height: 44,
                              borderRadius: "50%",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "18px",
                              flexShrink: 0,
                              backgroundColor: ev.eventType === "birthday" ? "rgba(212,175,55,0.15)" : "rgba(123,44,191,0.2)",
                            }}
                          >
                            {ev.eventType === "birthday" ? "🎂" : "🕊️"}
                          </div>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                              <Link
                                href={`/dashboard/members/${ev.memberId}/edit`}
                                style={{ fontWeight: 600, color: "#FFFFFF", textDecoration: "none" }}
                              >
                                {ev.firstName} {ev.lastName}
                              </Link>
                              <span style={{
                                fontSize: "11px",
                                padding: "2px 8px",
                                borderRadius: "20px",
                                fontWeight: 600,
                                background: ev.eventType === "birthday" ? "rgba(212,175,55,0.15)" : "rgba(123,44,191,0.25)",
                                color: ev.eventType === "birthday" ? "#D4AF37" : "#c084fc",
                              }}>
                                {ev.eventType === "birthday" ? "Birthday" : "🕊️ Spiritual Birthday"}
                              </span>
                              {ev.isMilestone && (
                                <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "20px", fontWeight: 700, background: "linear-gradient(135deg, #7B2CBF, #9D4EDD)", color: "#FFFFFF" }}>
                                  🎉 {ev.milestoneYears}{ev.eventType === "birthday" ? "th Birthday" : " Years in Faith"}
                                </span>
                              )}
                            </div>
                            {ev.years !== null && !ev.isMilestone && (
                              <p style={{ fontSize: "12px", color: "#A9A9B8", margin: "4px 0 0" }}>
                                {ev.eventType === "birthday" ? `Turning ${ev.years}` : `${ev.years} years in faith`}
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
                            style={{
                              background: isPrinting ? "#9ca3af" : "linear-gradient(135deg, #7B2CBF, #9D4EDD)",
                              color: "#FFFFFF",
                              border: "none",
                              borderRadius: "8px",
                              padding: "8px 16px",
                              fontSize: "13px",
                              fontWeight: 600,
                              cursor: isPrinting ? "not-allowed" : "pointer",
                              flexShrink: 0,
                            }}
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
        <div style={{ marginTop: "40px" }}>
          <h2 style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#A9A9B8", marginBottom: "16px" }}>
            Award Certificates
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
            {CERTIFICATES.map((cert) => (
              <div
                key={cert.key}
                style={{ background: "#120A1F", border: "1px solid rgba(212,175,55,0.25)", borderRadius: "16px", padding: "20px", display: "flex", flexDirection: "column", gap: "12px" }}
              >
                <div>
                  <p style={{ fontWeight: 600, fontSize: "14px", color: "#FFFFFF", margin: 0 }}>{cert.name}</p>
                  <p style={{ fontSize: "12px", color: "#A9A9B8", margin: "6px 0 0", lineHeight: 1.5 }}>{cert.description}</p>
                </div>
                <Link
                  href={`/dashboard/children-ministry/certificates/new?type=${certLinkType(cert.key)}`}
                  style={{ marginTop: "auto", display: "block", textAlign: "center", width: "100%", padding: "8px", borderRadius: "8px", fontSize: "12px", fontWeight: 600, background: "linear-gradient(135deg, #7B2CBF, #9D4EDD)", color: "#FFFFFF", textDecoration: "none", boxSizing: "border-box" }}
                >
                  🎓 Create Certificate
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
