"use client";

import { use, useEffect, useState } from "react";
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

const TOUCH_CONFIG = {
  email: { icon: "📧", label: "Email", color: "#1e40af", bg: "#eff6ff", border: "#bfdbfe" },
  phone: { icon: "📞", label: "Phone Call", color: "#166534", bg: "#f0fdf4", border: "#bbf7d0" },
  letter: { icon: "✉️", label: "Letter", color: "#92400e", bg: "#fffbeb", border: "#fde68a" },
};

const FREQ_OPTIONS = [
  { value: "monthly", label: "Monthly" },
  { value: "bimonthly", label: "Bimonthly (every 2 months)" },
];

function Initials({ name }: { name: string }) {
  const parts = name.trim().split(" ");
  const initials = (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
  const hue = (name.charCodeAt(0) * 37 + name.charCodeAt(name.length - 1) * 13) % 360;
  return (
    <div style={{
      width: "36px", height: "36px", borderRadius: "50%",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: "13px", fontWeight: "bold", color: "white", flexShrink: 0,
      backgroundColor: `hsl(${hue}, 55%, 45%)`,
    }}>
      {initials.toUpperCase()}
    </div>
  );
}

export default function AdminShepherdDeptPage({
  params,
}: {
  params: Promise<{ departmentId: string }>;
}) {
  const { departmentId } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [department, setDepartment] = useState<any>(null);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [monthYear, setMonthYear] = useState("");
  const [settings, setSettings] = useState<any>({ frequency: "monthly" });
  const [leader, setLeader] = useState<any>(null);
  const [nextAssignments, setNextAssignments] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);
  const [savingFreq, setSavingFreq] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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
      await loadData(session.access_token);
    }
    init();
  }, [departmentId]);

  async function loadData(tok: string) {
    setLoading(true);
    const res = await fetch(`/api/shepherd/${departmentId}`, {
      headers: { Authorization: `Bearer ${tok}` },
    });
    if (res.status === 401 || res.status === 403) { router.replace("/dashboard"); return; }
    const data = await res.json();
    if (res.ok) {
      setDepartment(data.department);
      setAssignments(data.assignments ?? []);
      setMonthYear(data.month_year);
      setSettings(data.settings ?? { frequency: "monthly" });
      setLeader(data.leader);
      setNextAssignments(data.next_assignments ?? []);
    } else {
      setError(data.error ?? "Failed to load");
    }
    setLoading(false);
  }

  async function handleGenerate() {
    if (!token) return;
    setGenerating(true);
    setError("");
    const res = await fetch(`/api/shepherd/${departmentId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    if (res.ok) {
      setSuccess(`Launched ${data.count} outreach assignments for this month.`);
      await loadData(token);
    } else {
      setError(data.error ?? "Failed to generate");
    }
    setGenerating(false);
  }

  async function handleToggleComplete(a: any) {
    if (!token || togglingId === a.id) return;
    const completing = !a.completed_at;
    setTogglingId(a.id);
    setAssignments((prev) =>
      prev.map((x) =>
        x.id === a.id
          ? { ...x, completed_at: completing ? new Date().toISOString() : null }
          : x
      )
    );
    await fetch(`/api/shepherd/${departmentId}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ assignment_id: a.id, completed: completing }),
    });
    setTogglingId(null);
  }

  async function handleFrequencyChange(freq: string) {
    if (!token) return;
    setSavingFreq(true);
    // Upsert shepherd_settings via a simple PATCH to the API
    await fetch(`/api/shepherd/${departmentId}/settings`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ frequency: freq }),
    });
    setSettings((s: any) => ({ ...s, frequency: freq }));
    setSavingFreq(false);
  }

  const completed = assignments.filter((a) => a.completed_at).length;
  const total = assignments.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  const monthLabel = monthYear
    ? new Date(monthYear + "-01").toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "";

  const byType = {
    email: assignments.filter((a: any) => a.touch_type === "email"),
    phone: assignments.filter((a: any) => a.touch_type === "phone"),
    letter: assignments.filter((a: any) => a.touch_type === "letter"),
  };

  if (loading) {
    return (
      <AppShell navItems={navItems}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
          <p style={{ fontFamily: "Georgia, serif", color: "#9ca3af" }}>Loading…</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell navItems={navItems}>
      <div style={{ padding: "32px" }}>
        {/* Breadcrumb */}
        <div style={{ marginBottom: "24px" }}>
          <Link href="/dashboard/shepherd" style={{ fontFamily: "Georgia, serif", fontSize: "14px", color: "#6b7280", textDecoration: "none" }}>
            ← Shepherd Pipeline
          </Link>
        </div>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <h1 style={{ fontFamily: "Georgia, serif", fontSize: "26px", color: "#1A4A2E", margin: "0 0 4px", fontWeight: "normal" }}>
              {department?.icon && `${department.icon} `}{department?.name}
            </h1>
            <p style={{ color: "#6b7280", fontSize: "15px", fontFamily: "Georgia, serif", margin: 0 }}>
              Leader: {leader?.members ? `${leader.members.first_name} ${leader.members.last_name}` : "None assigned"} •{" "}
              <Link href={`/dashboard/shepherd/invite/${departmentId}`} style={{ color: "#1A4A2E" }}>
                {leader ? "Reassign" : "Assign Leader"}
              </Link>
            </p>
          </div>

          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            {/* Frequency selector */}
            <select
              value={settings.frequency}
              onChange={(e) => handleFrequencyChange(e.target.value)}
              disabled={savingFreq}
              style={{
                padding: "10px 14px",
                borderRadius: "8px",
                border: "2px solid #e5e7eb",
                fontFamily: "Georgia, serif",
                fontSize: "14px",
                color: "#374151",
                background: "white",
                cursor: "pointer",
              }}
            >
              {FREQ_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>

            {total === 0 && (
              <button
                onClick={handleGenerate}
                disabled={generating}
                style={{
                  padding: "10px 20px",
                  background: "#1A4A2E",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontFamily: "Georgia, serif",
                  fontWeight: "bold",
                  cursor: generating ? "not-allowed" : "pointer",
                }}
              >
                {generating ? "Launching…" : "Launch Monthly Outreach"}
              </button>
            )}
          </div>
        </div>

        {error && (
          <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "10px", padding: "12px 16px", marginBottom: "20px" }}>
            <p style={{ color: "#dc2626", fontFamily: "Georgia, serif", fontSize: "14px", margin: 0 }}>{error}</p>
          </div>
        )}
        {success && (
          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "10px", padding: "12px 16px", marginBottom: "20px" }}>
            <p style={{ color: "#166534", fontFamily: "Georgia, serif", fontSize: "14px", margin: 0 }}>{success}</p>
          </div>
        )}

        {/* Progress bar */}
        {total > 0 && (
          <div style={{ background: "white", borderRadius: "12px", padding: "20px 24px", border: "1px solid #e5e7eb", marginBottom: "28px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <span style={{ fontFamily: "Georgia, serif", fontSize: "15px", color: "#374151" }}>
                {monthLabel} — {completed} of {total} outreaches completed
              </span>
              <span style={{ fontFamily: "Georgia, serif", fontSize: "20px", fontWeight: "bold", color: "#1A4A2E" }}>{pct}%</span>
            </div>
            <div style={{ background: "#f3f4f6", borderRadius: "999px", height: "10px", overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, height: "100%", background: pct >= 80 ? "#16a34a" : pct >= 50 ? "#f59e0b" : "#ef4444", borderRadius: "999px" }} />
            </div>
          </div>
        )}

        {/* Read-only touch columns */}
        {total > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "20px", marginBottom: "36px" }}>
            {(["email", "phone", "letter"] as const).map((type) => {
              const cfg = TOUCH_CONFIG[type];
              const list = byType[type];
              return (
                <div key={type} style={{ background: "white", borderRadius: "14px", overflow: "hidden", border: `1px solid ${cfg.border}` }}>
                  <div style={{ background: cfg.bg, padding: "14px 18px", borderBottom: `1px solid ${cfg.border}` }}>
                    <span style={{ fontSize: "20px" }}>{cfg.icon}</span>
                    <span style={{ fontFamily: "Georgia, serif", fontWeight: "bold", color: cfg.color, marginLeft: "8px", fontSize: "15px" }}>{cfg.label}</span>
                    <span style={{ fontFamily: "Georgia, serif", fontSize: "12px", color: "#9ca3af", marginLeft: "6px" }}>
                      ({list.filter((a: any) => a.completed_at).length}/{list.length})
                    </span>
                  </div>
                  <div style={{ padding: "12px" }}>
                    {list.length === 0 && (
                      <p style={{ fontFamily: "Georgia, serif", fontSize: "13px", color: "#9ca3af", padding: "8px", margin: 0 }}>No members</p>
                    )}
                    {list.map((a: any) => {
                      const name = `${a.members.first_name} ${a.members.last_name}`;
                      const done = !!a.completed_at;
                      const busyThis = togglingId === a.id;
                      const completedDate = a.completed_at
                        ? new Date(a.completed_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                        : null;
                      return (
                        <div key={a.id} style={{ padding: "12px", borderRadius: "10px", background: done ? "#f0fdf4" : "white", border: `1px solid ${done ? "#bbf7d0" : "#f3f4f6"}`, marginBottom: "8px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: done ? "8px" : "10px" }}>
                            <Initials name={name} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontFamily: "Georgia, serif", fontSize: "14px", color: done ? "#6b7280" : "#1f2937", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {name}
                              </p>
                              {a.notes && (
                                <p style={{ fontFamily: "Georgia, serif", fontSize: "11px", color: "#9ca3af", margin: "2px 0 0", fontStyle: "italic" }}>"{a.notes}"</p>
                              )}
                            </div>
                          </div>
                          {done ? (
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                              <span style={{ fontFamily: "Georgia, serif", fontSize: "13px", color: "#16a34a", fontWeight: "bold" }}>
                                ✓ Completed {completedDate && `· ${completedDate}`}
                              </span>
                              <button
                                onClick={() => handleToggleComplete(a)}
                                disabled={busyThis}
                                style={{ background: "none", border: "none", fontFamily: "Georgia, serif", fontSize: "12px", color: "#9ca3af", cursor: "pointer", textDecoration: "underline", padding: 0 }}
                              >
                                Undo
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleToggleComplete(a)}
                              disabled={busyThis}
                              style={{
                                width: "100%",
                                padding: "8px",
                                background: busyThis ? "#4b7a5e" : "#1A4A2E",
                                color: "white",
                                border: "none",
                                borderRadius: "8px",
                                fontSize: "13px",
                                fontFamily: "Georgia, serif",
                                fontWeight: "bold",
                                cursor: busyThis ? "not-allowed" : "pointer",
                              }}
                            >
                              {busyThis ? "Saving…" : "✓ Mark Complete"}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {total === 0 && (
          <div style={{ background: "white", border: "2px dashed #d1d5db", borderRadius: "16px", padding: "48px", textAlign: "center" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>📋</div>
            <h2 style={{ fontFamily: "Georgia, serif", fontSize: "20px", color: "#1f2937", marginBottom: "8px", fontWeight: "normal" }}>
              No outreach assigned for {monthLabel}
            </h2>
            <p style={{ fontFamily: "Georgia, serif", color: "#6b7280", fontSize: "15px", lineHeight: "1.6" }}>
              Click "Launch Monthly Outreach" above to assign this month's email, phone, and letter outreaches.
            </p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
