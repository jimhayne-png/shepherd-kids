"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import AppShell from "@/components/layout/AppShell";

const supabase = createClient();

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

const ACTION_CARDS = [
  {
    emoji: "👋",
    title: "First-Time Families",
    desc: "Welcome and connect with new visitors.",
    action: "Review",
    href: "/dashboard/children-ministry/visitors",
  },
  {
    emoji: "❤️",
    title: "Families Needing Encouragement",
    desc: "Families absent multiple weeks.",
    action: "Review",
    href: "/dashboard/children-ministry/parents",
  },
  {
    emoji: "🎂",
    title: "Birthdays This Week",
    desc: "Celebrate children and families.",
    action: "View",
    href: "/dashboard/birthdays",
  },
  {
    emoji: "✝️",
    title: "Upcoming Spiritual Birthdays",
    desc: "Celebrate faith milestones.",
    action: "View",
    href: "/dashboard/birthdays",
  },
  {
    emoji: "🏫",
    title: "Promotion Sunday Ready",
    desc: "Children ready for next classroom.",
    action: "Review",
    href: "/dashboard/children-ministry/children",
  },
  {
    emoji: "📧",
    title: "Parent Updates Needed",
    desc: "Missing allergies, pickups or information.",
    action: "Review",
    href: "/dashboard/children-ministry/parent-update",
  },
  {
    emoji: "🏆",
    title: "Certificates Ready",
    desc: "Faith milestones and awards ready to print.",
    action: "Print",
    href: "/dashboard/children-ministry/print-station",
  },
  {
    emoji: "🌱",
    title: "Faith Journey Activity",
    desc: "Children progressing through discipleship.",
    action: "View",
    href: "/dashboard/children-ministry/faith-journey",
  },
];

const ACTIVITY_FEED = [
  { emoji: "👋", text: "Smith family checked in for the first time" },
  { emoji: "✝️", text: "Emma received a Faith Milestone" },
  { emoji: "🎂", text: "Noah has a birthday this week" },
  { emoji: "🌱", text: "Jackson moved to Baptism stage" },
  { emoji: "📋", text: "Parent profile updated" },
  { emoji: "🏫", text: "Promotion Sunday candidate identified" },
];

export default function ChildrenMinistryPage() {
  const router = useRouter();
  const selectedChurchIdRef = useRef<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState<Child[]>([]);
  const [recentSessions, setRecentSessions] = useState<SessionSummary[]>([]);
  const [spiritualBirthdayEntries, setSpiritualBirthdayEntries] = useState<SpiritualBirthdayEntry[]>([]);

  useEffect(() => {
    async function init() {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (!user || error) {
        console.log("Dashboard client user unavailable:", error?.message ?? null);
        return;
      }
      const urlParams = new URLSearchParams(window.location.search);
      selectedChurchIdRef.current = urlParams.get("churchId") ?? localStorage.getItem("selected_church_id");
      const churchHeader: Record<string, string> = selectedChurchIdRef.current
        ? { "x-selected-church-id": selectedChurchIdRef.current }
        : {};
      const [childrenRes, sessionsRes, spiritualBdRes] = await Promise.all([
        fetch("/api/children-ministry/children", { credentials: "include", headers: churchHeader }),
        fetch("/api/checkin/attendance-report", { credentials: "include", headers: churchHeader }),
        fetch("/api/children-ministry/spiritual-birthdays", { credentials: "include", headers: churchHeader }),
      ]);
      if (childrenRes.ok) { const d = await childrenRes.json(); setChildren(d.children ?? []); }
      if (sessionsRes.ok) { const d = await sessionsRes.json(); setRecentSessions((d.sessions ?? []).slice(0, 4)); }
      if (spiritualBdRes.ok) { const d = await spiritualBdRes.json(); setSpiritualBirthdayEntries(d.entries ?? []); }
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4" style={{ marginBottom: "36px" }}>
          {[
            { label: "Total Children",       value: children.length,          emoji: "🧒", color: "#7B2CBF" },
            { label: "Birthdays This Week",   value: birthdaysThisWeek.length, emoji: "🎂", color: "#D4AF37" },
            { label: "Spiritual Birthdays",   value: upcomingSpiritual.length, emoji: "✝️", color: "#9D4EDD" },
            { label: "Recent Sessions",       value: recentSessions.length,    emoji: "📋", color: "#6366f1" },
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

        {/* 8 Action cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" style={{ marginBottom: "40px" }}>
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
                  <p style={{ color: "#D4AF37", fontSize: "28px", fontWeight: 700, lineHeight: 1, margin: 0 }}>0</p>
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

        {/* Recent Ministry Activity */}
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
            overflow: "hidden",
          }}
        >
          {ACTIVITY_FEED.map((item, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "14px",
                padding: "16px 24px",
                borderBottom: i < ACTIVITY_FEED.length - 1 ? "1px solid rgba(212,175,55,0.1)" : "none",
              }}
            >
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  backgroundColor: "rgba(123,44,191,0.2)",
                  border: "1px solid rgba(157,78,221,0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "16px",
                  flexShrink: 0,
                }}
              >
                {item.emoji}
              </div>
              <p style={{ fontSize: "13px", color: "#D8D8E8", margin: 0, flex: 1 }}>{item.text}</p>
              <span
                style={{
                  fontSize: "11px",
                  color: "#A9A9B8",
                  flexShrink: 0,
                  background: "rgba(255,255,255,0.05)",
                  borderRadius: "6px",
                  padding: "2px 8px",
                }}
              >
                Placeholder
              </span>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
