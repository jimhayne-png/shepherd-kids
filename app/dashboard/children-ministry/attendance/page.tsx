"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import AppShell, { type NavItem } from "@/components/layout/AppShell";
import { createClient } from "@/lib/supabase/client";
import { selectedChurchHeaders } from "@/lib/selected-church";

// ── Design tokens ─────────────────────────────────────────────────────────────
const CARD   = "#120A1F";
const BORDER = "rgba(212,175,55,0.18)";
const GOLD   = "#D4AF37";
const PURPLE = "#7B2CBF";
const TEXT   = "#ffffff";
const MUTED  = "rgba(255,255,255,0.5)";
const BODY   = "#0A0814";

// ── Nav ───────────────────────────────────────────────────────────────────────
const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "ShepherdKids", href: "#", isSection: true },
  { label: "💛 Ministry Care", href: "/dashboard/children-ministry" },
  { label: "✅ Live Check-In", href: "/dashboard/children-ministry/live-checkin" },
  { label: "🏷️ Label Printing", href: "/dashboard/children-ministry/print-station" },
  { label: "📊 Attendance Report", href: "/dashboard/children-ministry/attendance-report" },
  { label: "🧒 Children", href: "/dashboard/children-ministry/children" },
  { label: "👪 Parents", href: "/dashboard/children-ministry/parents" },
  { label: "📧 Parent Communication", href: "/dashboard/children-ministry/parent-update" },
  { label: "🌱 Faith Journey", href: "/dashboard/children-ministry/faith-journey" },
  { label: "🛡️ Family Safety Review", href: "/dashboard/children-ministry/family-safety-review" },
  { label: "🎉 Celebrations", href: "/dashboard/children-ministry/birthdays" },
  { label: "📜 Certificates", href: "/dashboard/children-ministry/certificates" },
  { label: "⚙️ Check-In Setup", href: "/dashboard/children-ministry/checkin-setup" },
  { label: "Account", href: "#", isSection: true },
  { label: "💳 Subscription & Billing", href: "/dashboard/billing" },
  { label: "⚙️ Settings", href: "/dashboard/settings" },
];

// ── Types ─────────────────────────────────────────────────────────────────────

type Session = {
  id: string;
  service_name: string;
  date: string;
  scheduled_time: string | null;
  status: string;
};

type KioskChild = {
  id: string;
  child_name: string;
  parent_name: string;
  parent_phone: string;
  checked_in_at: string;
  checked_out_at: string | null;
  is_new_visitor: boolean;
  allergies: string[];
  allergy_other: string | null;
  visit_count: number;
};

type Room = { room_id: string; room_name: string; children: KioskChild[] };

type SessionReport = {
  session: Session;
  summary: { totalChildren: number; roomsUsed: number; newVisitors: number; returning: number };
  rooms: Room[];
  visitorJourney: { new: number; returning: number; regular: number };
};

type Category = "new_visitor" | "regular" | "inconsistent" | "needs_attention";

type ConsistencyChild = {
  id: string;
  first_name: string;
  last_name: string;
  grade: string | null;
  date_of_birth: string | null;
  parent1_name: string | null;
  parent1_phone: string | null;
  parent1_email: string | null;
  parent2_name: string | null;
  attendance: boolean[];
  total_present: number;
  pct: number;
  first_attendance_date: string | null;
  last_attendance_date: string | null;
  has_care_notes: boolean;
  category: Category;
};

type ConsistencyData = { periods: string[]; children: ConsistencyChild[] };

// ── Helpers ───────────────────────────────────────────────────────────────────

const supabase = createClient();

function fmtShort(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fmtLong(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function calcAge(dob: string) {
  const d = new Date(dob + "T00:00:00");
  const n = new Date();
  let a = n.getFullYear() - d.getFullYear();
  if (n.getMonth() < d.getMonth() || (n.getMonth() === d.getMonth() && n.getDate() < d.getDate())) a--;
  return a;
}

const CAT_LABEL: Record<Category, string> = {
  regular: "Regular",
  inconsistent: "Inconsistent",
  needs_attention: "Needs Attention",
  new_visitor: "New Visitor",
};

const CAT_COLOR: Record<Category, string> = {
  regular: "#4ade80",
  inconsistent: "#facc15",
  needs_attention: "#f87171",
  new_visitor: "#60a5fa",
};

const CAT_ORDER: Record<Category, number> = {
  needs_attention: 0,
  inconsistent: 1,
  new_visitor: 2,
  regular: 3,
};

// ── SummaryCard ───────────────────────────────────────────────────────────────

function SummaryCard({ label, value, color = TEXT }: { label: string; value: string | number; color?: string }) {
  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "16px 20px", flex: "1 1 130px", minWidth: 120 }}>
      <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: MUTED, margin: "0 0 5px" }}>{label}</p>
      <p style={{ fontSize: 26, fontWeight: 700, color, margin: 0, lineHeight: 1 }}>{value}</p>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AttendancePage() {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const [token,       setToken]       = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // ── Tab ───────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"attendance" | "consistency">("attendance");

  // ── Attendance tab ────────────────────────────────────────────────────────
  const [sessions,      setSessions]      = useState<Session[]>([]);
  const [sessionId,     setSessionId]     = useState("");
  const [report,        setReport]        = useState<SessionReport | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);

  // ── Consistency tab ───────────────────────────────────────────────────────
  const [consistency, setConsistency] = useState<ConsistencyData | null>(null);
  const [loadingCons, setLoadingCons] = useState(false);
  const [consFetched, setConsFetched] = useState(false);
  const [learnMoreOpen, setLearnMoreOpen] = useState(false);
  const [gradeFilter, setGradeFilter] = useState("");
  const [catFilter,   setCatFilter]   = useState("");
  const [search,      setSearch]      = useState("");
  const [sortBy, setSortBy] = useState<"attention" | "name" | "pct">("attention");
  const [drawer,      setDrawer]      = useState<ConsistencyChild | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      const t = session?.access_token ?? null;
      setToken(t);
      if (t) {
        const res = await fetch("/api/checkin/attendance-report", {
          headers: { Authorization: `Bearer ${t}`, ...selectedChurchHeaders() },
        });
        if (res.ok) {
          const d = await res.json();
          const list: Session[] = d.sessions ?? [];
          setSessions(list);
          if (list.length) setSessionId(list[0].id);
        }
      }
      setAuthLoading(false);
    }
    init();
  }, []);

  // ── Load session report when selection changes ────────────────────────────
  useEffect(() => {
    if (!token || !sessionId) { setReport(null); return; }
    setLoadingReport(true);
    setReport(null);
    fetch(`/api/checkin/attendance-report?sessionId=${sessionId}`, {
      headers: { Authorization: `Bearer ${token}`, ...selectedChurchHeaders() },
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setReport(d); })
      .finally(() => setLoadingReport(false));
  }, [token, sessionId]);

  // ── Load / refresh consistency data ──────────────────────────────────────
  const refreshConsistency = useCallback(async (t: string, drawerChildId?: string) => {
    const res = await fetch("/api/children-ministry/attendance/consistency", {
      headers: { Authorization: `Bearer ${t}`, ...selectedChurchHeaders() },
    });
    if (!res.ok) return;
    const d: ConsistencyData = await res.json();
    setConsistency(d);
    setConsFetched(true);
    if (drawerChildId) {
      const updated = d.children.find(c => c.id === drawerChildId);
      if (updated) setDrawer(updated);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "consistency" && token && !consFetched) {
      setLoadingCons(true);
      refreshConsistency(token).finally(() => setLoadingCons(false));
    }
  }, [activeTab, token, consFetched, refreshConsistency]);

  // ── Focus close button when drawer opens ──────────────────────────────────
  useEffect(() => {
    if (drawer) setTimeout(() => closeRef.current?.focus(), 50);
  }, [drawer?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Close drawer on Escape ────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && drawer) setDrawer(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawer]);

  // ── CSV export ────────────────────────────────────────────────────────────
  function exportCSV() {
    if (!consistency) return;
    const { periods, children } = consistency;
    const headers = ["Name", "Grade", ...periods.map(fmtShort), "Total", "%", "Category"];
    const rows = children.map(c => [
      `"${c.first_name} ${c.last_name}"`,
      c.grade ?? "",
      ...c.attendance.map(a => (a ? "Y" : "")),
      c.total_present,
      `${c.pct}%`,
      CAT_LABEL[c.category],
    ]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "attendance-consistency.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Derived state ─────────────────────────────────────────────────────────
  const filteredChildren = useMemo(() => {
    if (!consistency) return [];
    let list = consistency.children;
    if (gradeFilter) list = list.filter(c => c.grade === gradeFilter);
    if (catFilter)   list = list.filter(c => c.category === catFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c => `${c.first_name} ${c.last_name}`.toLowerCase().includes(q));
    }
    return [...list].sort((a, b) => {
      if (sortBy === "attention") return CAT_ORDER[a.category] - CAT_ORDER[b.category] || a.last_name.localeCompare(b.last_name);
      if (sortBy === "pct")       return a.pct - b.pct || a.last_name.localeCompare(b.last_name);
      return a.last_name.localeCompare(b.last_name) || a.first_name.localeCompare(b.first_name);
    });
  }, [consistency, gradeFilter, catFilter, search, sortBy]);

  const categoryCounts = useMemo(() => {
    const counts = { regular: 0, inconsistent: 0, needs_attention: 0, new_visitor: 0 };
    for (const c of consistency?.children ?? []) counts[c.category]++;
    return counts;
  }, [consistency]);

  const grades = useMemo(() => {
    const s = new Set((consistency?.children ?? []).map(c => c.grade).filter((g): g is string => !!g));
    return [...s].sort();
  }, [consistency]);

  // ── Loading gate ──────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "#08060D", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: MUTED, fontSize: 14 }}>Loading…</p>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <AppShell navItems={NAV_ITEMS}>
      {/* Header + tab bar */}
      <div style={{ background: "linear-gradient(135deg, #08060D 0%, #1C0A30 100%)", padding: "32px 32px 0" }}>
        <p style={{ color: GOLD, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 4px" }}>
          ShepherdKids
        </p>
        <h1 style={{ color: TEXT, fontSize: 28, fontWeight: 700, fontFamily: "Georgia, serif", margin: "0 0 24px" }}>
          Attendance
        </h1>
        <div role="tablist" aria-label="Attendance views" style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          {(["attendance", "consistency"] as const).map(tab => (
            <button
              key={tab}
              role="tab"
              aria-selected={activeTab === tab}
              aria-controls={`tabpanel-${tab}`}
              id={`tab-${tab}`}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: "10px 24px",
                border: "none",
                borderBottom: activeTab === tab ? `2px solid ${PURPLE}` : "2px solid transparent",
                background: "transparent",
                color: activeTab === tab ? TEXT : MUTED,
                fontWeight: activeTab === tab ? 700 : 400,
                fontSize: 14,
                cursor: "pointer",
                marginBottom: -1,
                transition: "color 0.15s, border-color 0.15s",
              }}
            >
              {tab === "attendance" ? "Attendance" : "Attendance Consistency"}
            </button>
          ))}
        </div>
      </div>

      {/* Tab panel */}
      <div
        role="tabpanel"
        id={`tabpanel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
        style={{ backgroundColor: BODY, minHeight: "100vh", padding: "28px 32px 60px" }}
      >
        {activeTab === "attendance" ? renderAttendanceTab() : renderConsistencyTab()}
      </div>

      {/* Detail drawer */}
      {drawer && renderDrawer()}
    </AppShell>
  );

  // ── Attendance tab ────────────────────────────────────────────────────────

  function renderAttendanceTab() {
    const checkedOut = report?.rooms.flatMap(r => r.children).filter(c => c.checked_out_at).length ?? 0;

    return (
      <div style={{ maxWidth: 860 }}>
        {/* Session selector */}
        <div style={{ marginBottom: 24 }}>
          <label
            htmlFor="session-select"
            style={{ fontSize: 12, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 8 }}
          >
            Session
          </label>
          {sessions.length === 0 ? (
            <p style={{ color: MUTED, fontSize: 13 }}>No sessions found. Run a check-in session first.</p>
          ) : (
            <select
              id="session-select"
              value={sessionId}
              onChange={e => setSessionId(e.target.value)}
              style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8, color: TEXT, fontSize: 14, padding: "9px 13px", minWidth: 280, outline: "none", cursor: "pointer" }}
            >
              {sessions.map(s => (
                <option key={s.id} value={s.id} style={{ background: "#ffffff", color: "#000000" }}>
                  {fmtLong(s.date)} — {s.service_name}
                </option>
              ))}
            </select>
          )}
        </div>

        {loadingReport && <p style={{ color: MUTED, fontSize: 13, marginTop: 8 }}>Loading session…</p>}

        {!loadingReport && sessionId && !report && sessions.length > 0 && (
          <p style={{ color: MUTED, fontSize: 13 }}>Could not load session data. Please try again.</p>
        )}

        {report && !loadingReport && (
          <>
            {/* Summary cards */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
              <SummaryCard label="Children Attended" value={report.summary.totalChildren} />
              <SummaryCard label="First-Time Visitors" value={report.summary.newVisitors} color="#60a5fa" />
              <SummaryCard label="Returning Families" value={report.summary.returning} color="#4ade80" />
              <SummaryCard label="Checked Out" value={checkedOut} color="#a78bfa" />
            </div>

            {/* Visitor journey */}
            {(report.visitorJourney.new + report.visitorJourney.returning + report.visitorJourney.regular) > 0 && (
              <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "20px 24px", marginBottom: 24 }}>
                <p style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: MUTED, margin: "0 0 14px" }}>
                  Family Journey
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 24 }}>
                  <div>
                    <p style={{ fontSize: 22, fontWeight: 700, color: "#60a5fa", margin: 0 }}>{report.visitorJourney.new}</p>
                    <p style={{ fontSize: 12, color: MUTED, margin: "2px 0 0" }}>First Visit</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 22, fontWeight: 700, color: "#facc15", margin: 0 }}>{report.visitorJourney.returning}</p>
                    <p style={{ fontSize: 12, color: MUTED, margin: "2px 0 0" }}>Returning (2–3 visits)</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 22, fontWeight: 700, color: "#4ade80", margin: 0 }}>{report.visitorJourney.regular}</p>
                    <p style={{ fontSize: 12, color: MUTED, margin: "2px 0 0" }}>Regular (4+ visits)</p>
                  </div>
                </div>
              </div>
            )}

            {/* Rooms */}
            {report.rooms.length === 0 ? (
              <p style={{ color: MUTED, fontSize: 13 }}>No check-in records for this session.</p>
            ) : (
              report.rooms.map(room => (
                <div key={room.room_id} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "20px 24px", marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                    <p style={{ fontSize: 15, fontWeight: 700, color: TEXT, margin: 0 }}>{room.room_name}</p>
                    <span style={{ fontSize: 12, color: MUTED }}>{room.children.length} {room.children.length === 1 ? "child" : "children"}</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {room.children.map(child => (
                      <div key={child.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "rgba(255,255,255,0.03)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)" }}>
                        <div style={{ width: 34, height: 34, borderRadius: "50%", background: PURPLE, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: TEXT, flexShrink: 0 }}>
                          {child.child_name.charAt(0)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <p style={{ fontSize: 14, fontWeight: 600, color: TEXT, margin: 0, whiteSpace: "nowrap" }}>{child.child_name}</p>
                            {child.is_new_visitor && (
                              <span style={{ fontSize: 10, fontWeight: 700, color: "#60a5fa", border: "1px solid rgba(96,165,250,0.3)", borderRadius: 20, padding: "1px 7px", letterSpacing: "0.05em" }}>NEW</span>
                            )}
                            {(child.allergies.length > 0 || child.allergy_other) && (
                              <span style={{ fontSize: 10, fontWeight: 700, color: "#f87171", border: "1px solid rgba(248,113,113,0.3)", borderRadius: 20, padding: "1px 7px" }}>⚠ ALLERGY</span>
                            )}
                          </div>
                          <p style={{ fontSize: 12, color: MUTED, margin: "2px 0 0" }}>{child.parent_name} · {child.parent_phone}</p>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <p style={{ fontSize: 12, color: MUTED, margin: 0 }}>In: {fmtTime(child.checked_in_at)}</p>
                          <p style={{ fontSize: 12, margin: "2px 0 0", color: child.checked_out_at ? "#4ade80" : MUTED }}>
                            {child.checked_out_at ? `Out: ${fmtTime(child.checked_out_at)}` : "Still in"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </div>
    );
  }

  // ── Consistency tab ───────────────────────────────────────────────────────

  function renderConsistencyTab() {
    if (loadingCons) {
      return <p style={{ color: MUTED, fontSize: 13 }}>Loading attendance data…</p>;
    }
    if (!consistency) {
      return <p style={{ color: MUTED, fontSize: 13 }}>No attendance data available. Add children and record attendance to get started.</p>;
    }
    if (consistency.children.length === 0) {
      return (
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <p style={{ color: MUTED, fontSize: 14, marginBottom: 12 }}>No children found in the program.</p>
          <Link href="/dashboard/children-ministry/children" style={{ color: GOLD, fontSize: 14 }}>
            Add children →
          </Link>
        </div>
      );
    }

    if (consistency.periods.length === 0) {
      return (
        <div style={{ maxWidth: 560 }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: GOLD, margin: "0 0 14px" }}>
            Attendance Consistency
          </p>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: TEXT, fontFamily: "Georgia, serif", margin: "0 0 16px", lineHeight: 1.4 }}>
            Your attendance history begins with your first check-in session.
          </h2>
          <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.75, margin: "0 0 10px" }}>
            ShepherdKids automatically builds attendance consistency as your ministry checks children in each week.
          </p>
          <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.75, margin: "0 0 16px" }}>
            Once your first check-in session is complete, this page will begin helping you identify:
          </p>
          <ul style={{ listStyle: "none", padding: 0, margin: "0 0 20px", display: "flex", flexDirection: "column", gap: 10 }}>
            <li style={{ fontSize: 14, color: "rgba(255,255,255,0.8)" }}>🟢 Consistent attendance</li>
            <li style={{ fontSize: 14, color: "rgba(255,255,255,0.8)" }}>🟡 Children beginning to miss services</li>
            <li style={{ fontSize: 14, color: "rgba(255,255,255,0.8)" }}>🔴 Families who may benefit from follow-up</li>
            <li style={{ fontSize: 14, color: "rgba(255,255,255,0.8)" }}>⭐ New visitors becoming regular attendees</li>
          </ul>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", margin: "0 0 28px" }}>
            No additional setup is required.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-start" }}>
            <Link
              href="/dashboard/children-ministry/checkin-setup"
              style={{
                display: "inline-block", padding: "13px 28px", borderRadius: 10,
                background: `linear-gradient(135deg, ${PURPLE}, #9D4EDD)`,
                color: TEXT, fontSize: 14, fontWeight: 700, textDecoration: "none",
              }}
            >
              Create Your First Session
            </Link>
            <button
              onClick={() => setLearnMoreOpen(o => !o)}
              style={{ background: "none", border: "none", color: GOLD, fontSize: 13, fontWeight: 600, cursor: "pointer", padding: 0, textDecoration: "underline", textUnderlineOffset: 3 }}
            >
              {learnMoreOpen ? "Hide explanation ▲" : "Learn how Attendance Consistency works ▼"}
            </button>
            {learnMoreOpen && (
              <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "18px 20px", maxWidth: 520 }}>
                <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.8, margin: "0 0 10px" }}>
                  Attendance Consistency tracks how regularly each registered child attends over the last 8 sessions.
                  Each week your ministry runs a check-in session, ShepherdKids records attendance and builds a picture
                  of each child&apos;s engagement over time.
                </p>
                <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.8, margin: 0 }}>
                  Children are grouped into categories based on their attendance pattern, helping your team know
                  who to celebrate and who may benefit from a personal follow-up.
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }

    const periods = consistency.periods;

    return (
      <>
        {/* Category summary cards */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
          <SummaryCard label="Regular" value={categoryCounts.regular} color="#4ade80" />
          <SummaryCard label="Inconsistent" value={categoryCounts.inconsistent} color="#facc15" />
          <SummaryCard label="Needs Attention" value={categoryCounts.needs_attention} color="#f87171" />
          <SummaryCard label="New Visitors" value={categoryCounts.new_visitor} color="#60a5fa" />
        </div>

        {/* Filter + sort row */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 20, alignItems: "center" }}>
          <input
            type="search"
            placeholder="Search children…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            aria-label="Search children"
            style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8, color: TEXT, fontSize: 13, padding: "7px 12px", minWidth: 180, outline: "none" }}
          />
          <select
            value={gradeFilter}
            onChange={e => setGradeFilter(e.target.value)}
            aria-label="Filter by grade"
            style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8, color: TEXT, fontSize: 13, padding: "7px 12px", outline: "none", cursor: "pointer" }}
          >
            <option value="" style={{ background: "#ffffff", color: "#000000" }}>All Grades</option>
            {grades.map(g => <option key={g} value={g} style={{ background: "#ffffff", color: "#000000" }}>{g}</option>)}
          </select>
          <select
            value={catFilter}
            onChange={e => setCatFilter(e.target.value)}
            aria-label="Filter by category"
            style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8, color: TEXT, fontSize: 13, padding: "7px 12px", outline: "none", cursor: "pointer" }}
          >
            <option value="" style={{ background: "#ffffff", color: "#000000" }}>All Categories</option>
            <option value="needs_attention" style={{ background: "#ffffff", color: "#000000" }}>Needs Attention</option>
            <option value="inconsistent" style={{ background: "#ffffff", color: "#000000" }}>Inconsistent</option>
            <option value="new_visitor" style={{ background: "#ffffff", color: "#000000" }}>New Visitor</option>
            <option value="regular" style={{ background: "#ffffff", color: "#000000" }}>Regular</option>
          </select>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as typeof sortBy)}
            aria-label="Sort order"
            style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8, color: TEXT, fontSize: 13, padding: "7px 12px", outline: "none", cursor: "pointer" }}
          >
            <option value="attention" style={{ background: "#ffffff", color: "#000000" }}>Needs Attention First</option>
            <option value="pct" style={{ background: "#ffffff", color: "#000000" }}>Lowest Attendance First</option>
            <option value="name" style={{ background: "#ffffff", color: "#000000" }}>Name (A–Z)</option>
          </select>
          <button
            onClick={exportCSV}
            style={{ marginLeft: "auto", background: "transparent", border: `1px solid ${BORDER}`, borderRadius: 8, color: GOLD, fontSize: 13, fontWeight: 600, padding: "7px 16px", cursor: "pointer" }}
          >
            Export CSV
          </button>
        </div>

        {/* Table */}
        {filteredChildren.length === 0 ? (
          <p style={{ color: MUTED, fontSize: 13 }}>No children match your filters.</p>
        ) : (
          <div style={{ overflowX: "auto", borderRadius: 14, border: `1px solid ${BORDER}` }}>
            <table style={{ width: "100%", minWidth: `${180 + periods.length * 52 + 90 + 130}px`, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "rgba(0,0,0,0.35)" }}>
                  <th
                    scope="col"
                    style={{ textAlign: "left", padding: "11px 16px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: MUTED, position: "sticky", left: 0, background: "#0d0820", borderBottom: `1px solid ${BORDER}`, whiteSpace: "nowrap", minWidth: 190 }}
                  >
                    Child
                  </th>
                  {periods.map(p => (
                    <th key={p} scope="col" style={{ textAlign: "center", padding: "11px 8px", fontSize: 11, fontWeight: 700, color: MUTED, borderBottom: `1px solid ${BORDER}`, whiteSpace: "nowrap", minWidth: 44 }}>
                      {fmtShort(p)}
                    </th>
                  ))}
                  <th scope="col" style={{ textAlign: "center", padding: "11px 10px", fontSize: 11, fontWeight: 700, color: MUTED, borderBottom: `1px solid ${BORDER}`, whiteSpace: "nowrap" }}>
                    Total
                  </th>
                  <th scope="col" style={{ textAlign: "left", padding: "11px 14px", fontSize: 11, fontWeight: 700, color: MUTED, borderBottom: `1px solid ${BORDER}`, whiteSpace: "nowrap" }}>
                    Category
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredChildren.map(child => (
                  <tr
                    key={child.id}
                    tabIndex={0}
                    role="button"
                    aria-label={`Open details for ${child.first_name} ${child.last_name}`}
                    onClick={() => setDrawer(child)}
                    onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setDrawer(child); } }}
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", cursor: "pointer", outline: "none" }}
                    onFocus={e => (e.currentTarget.style.boxShadow = `inset 0 0 0 2px ${PURPLE}55`)}
                    onBlur={e => (e.currentTarget.style.boxShadow = "none")}
                  >
                    {/* Sticky name column */}
                    <td style={{ padding: "11px 16px", position: "sticky", left: 0, background: BODY, whiteSpace: "nowrap" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 30, height: 30, borderRadius: "50%", background: PURPLE, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: TEXT, flexShrink: 0 }}>
                          {child.first_name[0]}{child.last_name[0]}
                        </div>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 600, color: TEXT, margin: 0 }}>{child.first_name} {child.last_name}</p>
                          <p style={{ fontSize: 11, color: MUTED, margin: 0 }}>{child.grade ?? "—"}</p>
                        </div>
                        {child.has_care_notes && (
                          <span aria-label="Has care notes" style={{ fontSize: 11, color: "#f87171", flexShrink: 0 }}>⚠</span>
                        )}
                      </div>
                    </td>
                    {/* Attendance dot cells — read-only */}
                    {child.attendance.map((present, idx) => (
                      <td key={periods[idx]} style={{ textAlign: "center", padding: "11px 8px" }}>
                        <div
                          aria-label={`${child.first_name} ${child.last_name}, ${fmtShort(periods[idx])}: ${present ? "present" : "absent"}`}
                          style={{
                            width: 26, height: 26, borderRadius: "50%",
                            background: present ? PURPLE : "rgba(255,255,255,0.1)",
                            display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto",
                          }}
                        >
                          {present && <span style={{ color: TEXT, fontSize: 11, fontWeight: 700, lineHeight: 1 }}>✓</span>}
                        </div>
                      </td>
                    ))}
                    {/* Total */}
                    <td style={{ textAlign: "center", padding: "11px 10px" }}>
                      <span style={{
                        fontSize: 13, fontWeight: 700,
                        color: child.pct >= 75 ? "#4ade80" : child.pct >= 40 ? "#facc15" : "#f87171",
                      }}>
                        {child.total_present}/{periods.length}
                      </span>
                    </td>
                    {/* Category badge */}
                    <td style={{ padding: "11px 14px" }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: "2px 9px", borderRadius: 20,
                        backgroundColor: `${CAT_COLOR[child.category]}22`,
                        color: CAT_COLOR[child.category],
                        border: `1px solid ${CAT_COLOR[child.category]}44`,
                        whiteSpace: "nowrap",
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                      }}>
                        {CAT_LABEL[child.category]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p style={{ fontSize: 12, color: MUTED, marginTop: 12 }}>
          Showing {filteredChildren.length} of {consistency.children.length} children · Click a row to view details
        </p>
      </>
    );
  }

  // ── Child detail drawer ────────────────────────────────────────────────────

  function renderDrawer() {
    const c = drawer!;
    const periods = consistency?.periods ?? [];

    return (
      <>
        {/* Backdrop */}
        <div
          onClick={() => setDrawer(null)}
          aria-hidden="true"
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 40 }}
        />
        {/* Panel */}
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${c.first_name} ${c.last_name} details`}
          style={{
            position: "fixed", right: 0, top: 0, bottom: 0,
            width: "min(400px, 100vw)",
            background: "#140B24",
            borderLeft: "1px solid rgba(212,175,55,0.2)",
            zIndex: 50, overflowY: "auto", padding: "28px 24px 40px",
          }}
        >
          {/* Close button */}
          <button
            ref={closeRef}
            onClick={() => setDrawer(null)}
            aria-label="Close details panel"
            style={{ position: "absolute", top: 16, right: 16, background: "transparent", border: "none", color: MUTED, fontSize: 22, cursor: "pointer", lineHeight: 1, padding: 4 }}
          >
            ×
          </button>

          {/* Avatar + name */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18, paddingRight: 32 }}>
            <div style={{ width: 50, height: 50, borderRadius: "50%", background: PURPLE, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, fontWeight: 700, color: TEXT, flexShrink: 0 }}>
              {c.first_name[0]}{c.last_name[0]}
            </div>
            <div>
              <p style={{ fontSize: 17, fontWeight: 700, color: TEXT, margin: "0 0 3px", fontFamily: "Georgia, serif" }}>
                {c.first_name} {c.last_name}
              </p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {c.grade && <span style={{ fontSize: 12, color: GOLD, fontWeight: 600 }}>{c.grade} Grade</span>}
                {c.date_of_birth && <span style={{ fontSize: 12, color: MUTED }}>Age {calcAge(c.date_of_birth)}</span>}
              </div>
            </div>
          </div>

          {/* Care notes warning */}
          {c.has_care_notes && (
            <div style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#f87171" }}>
              ⚠ This child has allergies or medical notes on file. Check the child profile before check-in.
            </div>
          )}

          {/* Category */}
          <div style={{ marginBottom: 18 }}>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: "3px 11px", borderRadius: 20,
              backgroundColor: `${CAT_COLOR[c.category]}22`,
              color: CAT_COLOR[c.category],
              border: `1px solid ${CAT_COLOR[c.category]}44`,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}>
              {CAT_LABEL[c.category]}
            </span>
          </div>

          <div style={{ height: 1, background: "rgba(255,255,255,0.08)", marginBottom: 18 }} />

          {/* Attendance summary */}
          <div style={{ marginBottom: 18 }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: MUTED, margin: "0 0 8px" }}>
              Attendance — Last {periods.length} Sessions
            </p>
            <p style={{ fontSize: 24, fontWeight: 700, color: TEXT, margin: "0 0 3px" }}>
              {c.total_present} / {periods.length}
              <span style={{ fontSize: 14, color: MUTED, fontWeight: 400, marginLeft: 10 }}>{c.pct}%</span>
            </p>
            {c.last_attendance_date && (
              <p style={{ fontSize: 12, color: MUTED, margin: 0 }}>Last attended: {fmtLong(c.last_attendance_date)}</p>
            )}
            {!c.last_attendance_date && (
              <p style={{ fontSize: 12, color: "#f87171", margin: 0 }}>No attendance recorded in this window</p>
            )}
          </div>

          {/* Mini dot grid */}
          {periods.length > 0 && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
              {c.attendance.map((present, idx) => (
                <div key={idx} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                  <div style={{ width: 22, height: 22, borderRadius: "50%", background: present ? PURPLE : "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {present && <span style={{ color: TEXT, fontSize: 10, fontWeight: 700 }}>✓</span>}
                  </div>
                  <span style={{ fontSize: 9, color: MUTED }}>{fmtShort(periods[idx])}</span>
                </div>
              ))}
            </div>
          )}

          <div style={{ height: 1, background: "rgba(255,255,255,0.08)", marginBottom: 18 }} />

          {/* Parent info */}
          {c.parent1_name && (
            <div style={{ marginBottom: 14 }}>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: MUTED, margin: "0 0 6px" }}>Parent / Guardian</p>
              <p style={{ fontSize: 14, color: TEXT, margin: "0 0 2px", fontWeight: 600 }}>{c.parent1_name}</p>
              {c.parent1_phone && <p style={{ fontSize: 12, color: MUTED, margin: "0 0 1px" }}>{c.parent1_phone}</p>}
              {c.parent1_email && <p style={{ fontSize: 12, color: MUTED, margin: 0 }}>{c.parent1_email}</p>}
            </div>
          )}
          {c.parent2_name && (
            <div style={{ marginBottom: 14 }}>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: MUTED, margin: "0 0 6px" }}>Parent 2</p>
              <p style={{ fontSize: 14, color: TEXT, margin: 0, fontWeight: 600 }}>{c.parent2_name}</p>
            </div>
          )}

          {(c.parent1_name || c.parent2_name) && <div style={{ height: 1, background: "rgba(255,255,255,0.08)", marginBottom: 18 }} />}

          {/* Actions */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Link
              href={`/dashboard/children-ministry/children`}
              style={{ display: "block", textAlign: "center", padding: "11px 0", borderRadius: 10, border: `1px solid ${BORDER}`, color: GOLD, fontSize: 14, fontWeight: 600, textDecoration: "none" }}
            >
              View Child Profile
            </Link>
            <Link
              href="/dashboard/children-ministry/parent-update"
              style={{ display: "block", textAlign: "center", padding: "11px 0", borderRadius: 10, background: `linear-gradient(135deg, ${PURPLE}, #9D4EDD)`, color: TEXT, fontSize: 14, fontWeight: 700, textDecoration: "none" }}
            >
              Send Follow-Up
            </Link>
          </div>
        </div>
      </>
    );
  }
}
