"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import AppShell, { type NavItem } from "@/components/layout/AppShell";
import { MINISTRY_NAV_ITEMS } from "@/lib/ministry-config";

const supabase = createClient();

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Church Family", href: "#", isSection: true },
  { label: "👥 Members", href: "/dashboard/members" },
  { label: "🏛️ Departments", href: "/dashboard/departments" },
  { label: "🆕 Visitors", href: "/dashboard/visitors" },
  { label: "Engagement", href: "#", isSection: true },
  { label: "📅 Calendar", href: "/dashboard/calendar" },
  { label: "✅ Attendance", href: "/dashboard/attendance" },
  { label: "📋 Bulletin", href: "/dashboard/bulletin" },
  { label: "📢 Communication Hub", href: "/dashboard/communication" },
  { label: "Pastoral Care", href: "#", isSection: true },
  { label: "🙏 Annual Pastor Touch", href: "/dashboard/pastor-touch" },
  { label: "🏥 Visitation", href: "/dashboard/visitation" },
  { label: "🎂 Birthdays", href: "/dashboard/birthdays" },
  { label: "🔄 Shepherd Pipeline", href: "/dashboard/shepherd" },
  { label: "🙋 Prayer", href: "/dashboard/prayer" },
  { label: "Ministry", href: "#", isSection: true },
  ...MINISTRY_NAV_ITEMS,
  { label: "Outreach", href: "#", isSection: true },
  { label: "✝️ Evangelism", href: "/dashboard/evangelism" },
  { label: "📧 Visitor Onboarding", href: "/dashboard/visitors/sequences" },
  { label: "Marketing", href: "#", isSection: true },
  { label: "⭐ Review Campaign", href: "/dashboard/reviews" },
  { label: "Settings", href: "#", isSection: true },
  { label: "⚙️ Settings", href: "/dashboard/settings" },
  { label: "💳 Billing", href: "/dashboard/billing" },
  { label: "📖 Tutorials", href: "/dashboard/tutorials" },
];

const ACCENT = "#F28C28";

type Session = { id: string; name: string; date: string; status: string };

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function HSCheckinSetupPage() {
  const [token, setToken] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDate, setNewDate] = useState("");
  const [creating, setCreating] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (!user || error) {
        console.log("Dashboard client user unavailable:", error?.message ?? null);
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const t = session.access_token;
      setToken(t);
      fetch("/api/high-school-ministry/checkin-sessions", {
        headers: { Authorization: `Bearer ${t}` },
      })
        .then(r => r.json())
        .then(d => { setSessions(d.sessions ?? []); setLoading(false); })
        .catch(() => setLoading(false));
    })();
  }, []);

  async function handleCreate() {
    if (!token || !newName.trim() || !newDate) return;
    setCreating(true);
    const res = await fetch("/api/high-school-ministry/checkin-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: newName.trim(), date: newDate }),
    });
    const data = await res.json();
    if (data.session) {
      setSessions(prev => [data.session, ...prev]);
      setNewName("");
      setNewDate("");
      setShowForm(false);
    }
    setCreating(false);
  }

  async function handleToggle(session: Session) {
    if (!token) return;
    setTogglingId(session.id);
    const res = await fetch("/api/high-school-ministry/checkin-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: "toggle", sessionId: session.id }),
    });
    const data = await res.json();
    if (data.success) {
      setSessions(prev => prev.map(s => s.id === session.id ? { ...s, status: data.status } : s));
    }
    setTogglingId(null);
  }

  return (
    <AppShell navItems={navItems}>
      {/* Orange header */}
      <div style={{ background: "linear-gradient(135deg, #c2570a 0%, #F28C28 100%)", padding: "28px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <Link href="/dashboard/ministry/high-school" style={{ color: "rgba(255,255,255,0.8)", fontSize: 14, textDecoration: "none", display: "inline-block", marginBottom: 6 }}>
            ← Senior High
          </Link>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: "white" }}>Check-In Setup</h1>
        </div>
        <button
          onClick={() => setShowForm(s => !s)}
          style={{ backgroundColor: "white", color: ACCENT, border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
        >
          + New Session
        </button>
      </div>

      <div style={{ padding: "32px", maxWidth: 900, margin: "0 auto" }}>
        {/* Create form */}
        {showForm && (
          <div style={{ backgroundColor: "white", borderRadius: 16, boxShadow: "0 1px 6px rgba(0,0,0,0.08)", padding: 24, marginBottom: 24, border: "1px solid #e5e7eb" }}>
            <h2 style={{ margin: "0 0 16px", fontSize: 17, fontWeight: 700, color: "#111827" }}>New Session</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Session Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. Senior High Sunday"
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid #e5e7eb", fontSize: 14, boxSizing: "border-box" as const }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Date</label>
                <input
                  type="date"
                  value={newDate}
                  onChange={e => setNewDate(e.target.value)}
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid #e5e7eb", fontSize: 14, boxSizing: "border-box" as const }}
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={handleCreate}
                disabled={creating || !newName.trim() || !newDate}
                style={{ padding: "10px 24px", borderRadius: 10, border: "none", backgroundColor: newName.trim() && newDate ? ACCENT : "#e5e7eb", color: newName.trim() && newDate ? "white" : "#9ca3af", fontSize: 14, fontWeight: 700, cursor: newName.trim() && newDate ? "pointer" : "default" }}
              >
                {creating ? "Creating…" : "Create"}
              </button>
              <button
                onClick={() => { setShowForm(false); setNewName(""); setNewDate(""); }}
                style={{ padding: "10px 20px", borderRadius: 10, border: "1.5px solid #e5e7eb", backgroundColor: "white", color: "#6b7280", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Sessions table */}
        <div style={{ backgroundColor: "white", borderRadius: 16, boxShadow: "0 1px 6px rgba(0,0,0,0.08)", border: "1px solid #e5e7eb", overflow: "hidden" }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: "#9ca3af" }}>Loading…</div>
          ) : sessions.length === 0 ? (
            <div style={{ padding: 48, textAlign: "center" }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🎓</div>
              <p style={{ fontSize: 17, fontWeight: 600, color: "#374151", margin: "0 0 6px" }}>No sessions yet</p>
              <p style={{ fontSize: 14, color: "#9ca3af", margin: 0 }}>Click &ldquo;+ New Session&rdquo; to create your first check-in session.</p>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
                  {["Name", "Date", "Status", "Actions"].map(h => (
                    <th key={h} style={{ padding: "14px 20px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sessions.map(session => (
                  <tr key={session.id} style={{ borderBottom: "1px solid #f9fafb" }}>
                    <td style={{ padding: "14px 20px", fontSize: 14, fontWeight: 600, color: "#111827" }}>{session.name}</td>
                    <td style={{ padding: "14px 20px", fontSize: 14, color: "#6b7280" }}>{fmtDate(session.date)}</td>
                    <td style={{ padding: "14px 20px" }}>
                      {session.status === "open" ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, backgroundColor: "#dcfce7", color: "#166534", borderRadius: 20, padding: "4px 12px", fontSize: 13, fontWeight: 600 }}>
                          🟢 Open
                        </span>
                      ) : (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, backgroundColor: "#f3f4f6", color: "#6b7280", borderRadius: 20, padding: "4px 12px", fontSize: 13, fontWeight: 600 }}>
                          ⚫ Closed
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "14px 20px" }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        {session.status === "open" ? (
                          <>
                            <Link
                              href={`/high-school-kiosk/${session.id}`}
                              target="_blank"
                              style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "7px 14px", borderRadius: 8, backgroundColor: "#eff6ff", color: "#1d4ed8", fontSize: 13, fontWeight: 600, textDecoration: "none" }}
                            >
                              🖥️ Open Kiosk
                            </Link>
                            <button
                              onClick={() => handleToggle(session)}
                              disabled={togglingId === session.id}
                              style={{ padding: "7px 14px", borderRadius: 8, border: "1.5px solid #fca5a5", backgroundColor: "#fef2f2", color: "#dc2626", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                            >
                              {togglingId === session.id ? "…" : "Close"}
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleToggle(session)}
                            disabled={togglingId === session.id}
                            style={{ padding: "7px 14px", borderRadius: 8, border: "1.5px solid #d1fae5", backgroundColor: "#ecfdf5", color: "#065f46", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                          >
                            {togglingId === session.id ? "…" : "Reopen"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AppShell>
  );
}
