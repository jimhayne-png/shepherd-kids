"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import { selectedChurchHeaders } from "@/lib/selected-church";

type Child = { id: string; first_name: string; last_name: string; date_of_birth: string | null };
type SessionSummary = { id: string; service_name: string; date: string; status: string };
type SpiritualBirthdayEntry = {
  id: string;
  child_id: string;
  completed_at: string;
  notes: string | null;
  first_name: string;
  last_name: string;
};

type MinistryCareStats = {
  parentFirstVisitFollowUp: number;
  newChildrenFollowUp: number;
  kidsFaithJourney: number;
  familiesNeedingEncouragement: number;
  promotionSundayReady: number;
  encouragementCertificates: number;
};

const EMPTY_STATS: MinistryCareStats = {
  parentFirstVisitFollowUp: 0,
  newChildrenFollowUp: 0,
  kidsFaithJourney: 0,
  familiesNeedingEncouragement: 0,
  promotionSundayReady: 0,
  encouragementCertificates: 0,
};

function upcomingBirthdays(children: Child[], days: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const results: { child: Child; next: Date; daysAway: number }[] = [];
  for (const child of children) {
    if (!child.date_of_birth) continue;
    const dob = new Date(child.date_of_birth + "T00:00:00");
    const next = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
    if (next < today) next.setFullYear(today.getFullYear() + 1);
    const daysAway = Math.round((next.getTime() - today.getTime()) / 86400000);
    if (daysAway <= days) results.push({ child, next, daysAway });
  }
  return results.sort((a, b) => a.daysAway - b.daysAway);
}

function upcomingSpiritualBirthdays(entries: SpiritualBirthdayEntry[], days: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const results: { entry: SpiritualBirthdayEntry; next: Date; daysAway: number; years: number }[] = [];
  for (const entry of entries) {
    const saved = new Date(entry.completed_at + "T00:00:00");
    const next = new Date(today.getFullYear(), saved.getMonth(), saved.getDate());
    if (next < today) next.setFullYear(today.getFullYear() + 1);
    const daysAway = Math.round((next.getTime() - today.getTime()) / 86400000);
    if (daysAway <= days) {
      results.push({ entry, next, daysAway, years: next.getFullYear() - saved.getFullYear() });
    }
  }
  return results.sort((a, b) => a.daysAway - b.daysAway);
}

// Cards in the required order — counts injected at render time from the API.
const ACTION_CARDS: {
  key: keyof MinistryCareStats;
  emoji: string;
  title: string;
  desc: string;
  action: string;
  href: string;
}[] = [
  {
    key: "parentFirstVisitFollowUp",
    emoji: "👋",
    title: "Parent First-Visit Follow-Up",
    desc: "Welcome and connect with new families.",
    action: "Review",
    href: "/dashboard/children-ministry/visitors",
  },
  {
    key: "newChildrenFollowUp",
    emoji: "🧒",
    title: "New Children Follow-Up",
    desc: "Continue caring for every new child.",
    action: "Review",
    href: "/dashboard/children-ministry/followup",
  },
  {
    key: "kidsFaithJourney",
    emoji: "🌱",
    title: "Kids Faith Journey",
    desc: "Guide children through their spiritual journey.",
    action: "View",
    href: "/dashboard/children-ministry/faith-journey",
  },
  {
    key: "familiesNeedingEncouragement",
    emoji: "❤️",
    title: "Families Needing Encouragement",
    desc: "Families absent multiple weeks.",
    action: "Review",
    href: "/dashboard/children-ministry/parents",
  },
  {
    key: "promotionSundayReady",
    emoji: "🏫",
    title: "Promotion Sunday Ready",
    desc: "Children ready for next classroom.",
    action: "Review",
    href: "/dashboard/children-ministry/children",
  },
  {
    key: "encouragementCertificates",
    emoji: "🏆",
    title: "Encouragement Certificates",
    desc: "Celebrate spiritual growth and meaningful milestones.",
    action: "Create",
    href: "/dashboard/children-ministry/certificates/new",
  },
];

export default function ChildrenMinistryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState<Child[]>([]);
  const [recentSessions, setRecentSessions] = useState<SessionSummary[]>([]);
  const [spiritualBirthdayEntries, setSpiritualBirthdayEntries] = useState<SpiritualBirthdayEntry[]>([]);
  const [careStats, setCareStats] = useState<MinistryCareStats>(EMPTY_STATS);

  useEffect(() => {
    async function init() {
      const headers = selectedChurchHeaders();

      const [childrenRes, sessionsRes, spiritualBdRes, careStatsRes] = await Promise.all([
        fetch("/api/children-ministry/children",             { credentials: "include", headers }),
        fetch("/api/checkin/attendance-report",             { credentials: "include", headers }),
        fetch("/api/children-ministry/spiritual-birthdays", { credentials: "include", headers }),
        fetch("/api/children-ministry/ministry-care-stats", { credentials: "include", headers }),
      ]);

      if (childrenRes.ok)    { const d = await childrenRes.json();    setChildren(d.children ?? []); }
      if (sessionsRes.ok)    { const d = await sessionsRes.json();    setRecentSessions((d.sessions ?? []).slice(0, 4)); }
      if (spiritualBdRes.ok) { const d = await spiritualBdRes.json(); setSpiritualBirthdayEntries(d.entries ?? []); }
      if (careStatsRes.ok)   { const d = await careStatsRes.json();   setCareStats(d); }

      setLoading(false);
    }
    init();
  }, [router]);

  const birthdaysThisWeek = upcomingBirthdays(children, 7);
  const upcomingSpiritual = upcomingSpiritualBirthdays(spiritualBirthdayEntries, 30);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#08060D" }}>
        <div style={{ color: "#D8D8E8", fontFamily: "Georgia, serif" }}>Loading…</div>
      </div>
    );
  }

  return (
    <AppShell navItems={[]}>
      {/* Hero */}
      <div style={{ padding: "40px 32px 32px", background: "linear-gradient(135deg, #08060D 0%, #1C0A30 100%)" }}>
        <p style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.06em", color: "#D4AF37", marginBottom: "6px", textTransform: "uppercase" }}>
          ShepherdKids
        </p>
        <h1 style={{ fontSize: "28px", fontWeight: 700, color: "#ffffff", margin: 0, fontFamily: "Georgia, serif" }}>
          Ministry Care
        </h1>
        <p style={{ fontSize: "13px", color: "#D8D8E8", marginTop: "6px", margin: "6px 0 0" }}>
          {children.length} children enrolled
        </p>
      </div>

      <div style={{ backgroundColor: "#0A0814", minHeight: "100vh", padding: "32px" }}>

        {/* Stat row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4" style={{ marginBottom: "36px" }}>
          {[
            { label: "Total Children",    value: children.length,                                        emoji: "🧒", color: "#7B2CBF" },
            { label: "Upcoming Birthdays", value: birthdaysThisWeek.length + upcomingSpiritual.length,  emoji: "🎂", color: "#D4AF37" },
            { label: "Recent Sessions",   value: recentSessions.length,                                  emoji: "📋", color: "#6366f1" },
          ].map(stat => (
            <div
              key={stat.label}
              style={{
                background: "#120A1F",
                border: "1px solid rgba(212,175,55,0.22)",
                borderRadius: "14px",
                padding: "18px 20px",
                display: "flex",
                alignItems: "center",
                gap: "14px",
              }}
            >
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "20px",
                  flexShrink: 0,
                  backgroundColor: stat.color + "22",
                }}
              >
                {stat.emoji}
              </div>
              <div>
                <p style={{ fontSize: "24px", fontWeight: 700, color: "#ffffff", margin: 0, lineHeight: 1 }}>{stat.value}</p>
                <p style={{ fontSize: "11px", color: "#A9A9B8", margin: "3px 0 0" }}>{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Ministry Care Overview */}
        <div style={{ marginBottom: "18px" }}>
          <h2 style={{ fontSize: "19px", fontWeight: 700, color: "#ffffff", margin: 0, fontFamily: "Georgia, serif" }}>
            Ministry Care Overview
          </h2>
          <p style={{ fontSize: "13px", color: "#A9A9B8", margin: "4px 0 0" }}>
            Your actionable care items for this week.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" style={{ marginBottom: "40px" }}>
          {ACTION_CARDS.map(card => (
            <div
              key={card.title}
              style={{
                background: "#120A1F",
                border: "1px solid rgba(212,175,55,0.28)",
                borderRadius: "16px",
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "14px",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                    <span style={{ fontSize: "18px", flexShrink: 0 }}>{card.emoji}</span>
                    <p style={{ fontWeight: 700, color: "#ffffff", fontSize: "13px", lineHeight: 1.3, margin: 0 }}>
                      {card.title}
                    </p>
                  </div>
                  <p style={{ color: "#A9A9B8", fontSize: "12px", lineHeight: 1.5, margin: 0 }}>
                    {card.desc}
                  </p>
                </div>
                <div style={{ flexShrink: 0, textAlign: "right" }}>
                  <p style={{ color: "#D4AF37", fontSize: "28px", fontWeight: 700, lineHeight: 1, margin: 0 }}>
                    {careStats[card.key]}
                  </p>
                </div>
              </div>
              <Link
                href={card.href}
                style={{
                  alignSelf: "flex-start",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#ffffff",
                  background: "linear-gradient(135deg, #7B2CBF, #9D4EDD)",
                  borderRadius: "8px",
                  padding: "5px 12px",
                  textDecoration: "none",
                }}
              >
                {card.action} →
              </Link>
            </div>
          ))}
        </div>

        {/* Recent Ministry Activity — empty state until a real feed is built */}
        <div style={{ marginBottom: "18px" }}>
          <h2 style={{ fontSize: "19px", fontWeight: 700, color: "#ffffff", margin: 0, fontFamily: "Georgia, serif" }}>
            Recent Ministry Activity
          </h2>
          <p style={{ fontSize: "13px", color: "#A9A9B8", margin: "4px 0 0" }}>
            Latest updates across your ministry.
          </p>
        </div>

        <div
          style={{
            background: "#120A1F",
            border: "1px solid rgba(212,175,55,0.22)",
            borderRadius: "16px",
            padding: "32px 24px",
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: "13px", color: "#A9A9B8", margin: 0 }}>
            No recent ministry activity to display.
          </p>
        </div>

      </div>
    </AppShell>
  );
}
