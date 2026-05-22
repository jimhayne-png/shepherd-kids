"use client";

import { useEffect, useState } from "react";
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

type DeptStat = {
  id: string;
  name: string;
  icon: string | null;
  color: string;
  leader_name: string | null;
  frequency: string;
  month_year: string;
  total_touches: number;
  completed_touches: number;
  completion_rate: number | null;
};

function rateColor(rate: number | null): { bg: string; text: string; border: string } {
  if (rate === null) return { bg: "#f9fafb", text: "#9ca3af", border: "#e5e7eb" };
  if (rate >= 80) return { bg: "#f0fdf4", text: "#166534", border: "#bbf7d0" };
  if (rate >= 50) return { bg: "#fffbeb", text: "#92400e", border: "#fde68a" };
  return { bg: "#fef2f2", text: "#991b1b", border: "#fecaca" };
}

export default function ShepherdOverviewPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [departments, setDepartments] = useState<DeptStat[]>([]);
  const [monthYear, setMonthYear] = useState("");
  const [error, setError] = useState("");

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

      const res = await fetch("/api/shepherd", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.status === 403) { router.replace("/dashboard"); return; }
      const data = await res.json();
      if (res.ok) {
        setDepartments(data.departments ?? []);
        setMonthYear(data.month_year ?? "");
      } else {
        setError(data.error ?? "Failed to load");
      }
      setLoading(false);
    }
    init();
  }, []);

  const monthLabel = monthYear
    ? new Date(monthYear + "-01").toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "";

  const avgRate =
    departments.filter((d) => d.completion_rate !== null).length > 0
      ? Math.round(
          departments
            .filter((d) => d.completion_rate !== null)
            .reduce((sum, d) => sum + (d.completion_rate ?? 0), 0) /
            departments.filter((d) => d.completion_rate !== null).length
        )
      : null;

  const overdue = departments.filter((d) => d.completion_rate !== null && d.completion_rate < 50).length;

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
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px" }}>
          <div>
            <h1 style={{ fontFamily: "Georgia, serif", fontSize: "28px", color: "#1A4A2E", margin: "0 0 4px", fontWeight: "normal" }}>
              🐑 Shepherd Pipeline
            </h1>
            <p style={{ color: "#6b7280", fontSize: "15px", fontFamily: "Georgia, serif", margin: 0 }}>
              {monthLabel} — Department outreach progress
            </p>
          </div>
        </div>

        {error && (
          <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "10px", padding: "12px 16px", marginBottom: "20px" }}>
            <p style={{ color: "#dc2626", fontFamily: "Georgia, serif", fontSize: "14px", margin: 0 }}>{error}</p>
          </div>
        )}

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "32px" }}>
          {[
            { label: "Total Departments", value: departments.length, icon: "🏛️" },
            { label: "Avg Completion Rate", value: avgRate !== null ? `${avgRate}%` : "—", icon: "📊" },
            { label: "Needs Attention", value: overdue, icon: "⚠️" },
          ].map((stat) => (
            <div key={stat.label} style={{ background: "white", borderRadius: "12px", padding: "20px", border: "1px solid #e5e7eb" }}>
              <div style={{ fontSize: "28px", marginBottom: "8px" }}>{stat.icon}</div>
              <div style={{ fontFamily: "Georgia, serif", fontSize: "26px", fontWeight: "bold", color: "#1A4A2E" }}>{stat.value}</div>
              <div style={{ fontFamily: "Georgia, serif", fontSize: "13px", color: "#6b7280", marginTop: "4px" }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Department cards */}
        {departments.length === 0 ? (
          <div style={{ background: "white", borderRadius: "16px", padding: "60px", textAlign: "center", border: "1px solid #e5e7eb" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>🏛️</div>
            <h2 style={{ fontFamily: "Georgia, serif", fontSize: "20px", color: "#1f2937", marginBottom: "8px", fontWeight: "normal" }}>
              No departments yet
            </h2>
            <p style={{ fontFamily: "Georgia, serif", color: "#9ca3af", fontSize: "15px" }}>
              Create departments first, then assign ministry leaders.
            </p>
            <Link href="/dashboard/departments" style={{ display: "inline-block", marginTop: "20px", padding: "12px 24px", background: "#1A4A2E", color: "white", borderRadius: "10px", textDecoration: "none", fontFamily: "Georgia, serif", fontSize: "15px" }}>
              Manage Departments →
            </Link>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "20px" }}>
            {departments.map((dept) => {
              const colors = rateColor(dept.completion_rate);
              return (
                <div key={dept.id} style={{ background: "white", borderRadius: "14px", border: "1px solid #e5e7eb", overflow: "hidden" }}>
                  {/* Card header */}
                  <div style={{ background: "#1A4A2E", padding: "18px 20px", display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ fontSize: "28px" }}>{dept.icon ?? "🏛️"}</div>
                    <div>
                      <h3 style={{ color: "white", margin: 0, fontSize: "17px", fontFamily: "Georgia, serif", fontWeight: "normal" }}>
                        {dept.name}
                      </h3>
                      <p style={{ color: "rgba(255,255,255,0.6)", margin: 0, fontSize: "13px", fontFamily: "Georgia, serif" }}>
                        {dept.leader_name ?? "No leader assigned"}
                      </p>
                    </div>
                  </div>

                  {/* Stats */}
                  <div style={{ padding: "18px 20px" }}>
                    {dept.total_touches > 0 ? (
                      <>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                          <span style={{ fontFamily: "Georgia, serif", fontSize: "14px", color: "#6b7280" }}>
                            {dept.completed_touches} / {dept.total_touches} outreaches
                          </span>
                          <span style={{
                            fontFamily: "Georgia, serif",
                            fontSize: "14px",
                            fontWeight: "bold",
                            color: colors.text,
                            background: colors.bg,
                            border: `1px solid ${colors.border}`,
                            padding: "2px 10px",
                            borderRadius: "999px",
                          }}>
                            {dept.completion_rate}%
                          </span>
                        </div>
                        <div style={{ background: "#f3f4f6", borderRadius: "999px", height: "8px", overflow: "hidden", marginBottom: "16px" }}>
                          <div style={{
                            width: `${dept.completion_rate ?? 0}%`,
                            height: "100%",
                            background: dept.completion_rate !== null && dept.completion_rate >= 80 ? "#16a34a" : dept.completion_rate !== null && dept.completion_rate >= 50 ? "#f59e0b" : "#ef4444",
                            borderRadius: "999px",
                          }} />
                        </div>
                      </>
                    ) : (
                      <p style={{ fontFamily: "Georgia, serif", fontSize: "13px", color: "#9ca3af", marginBottom: "16px" }}>
                        No outreach assigned for {monthLabel}
                      </p>
                    )}

                    <div style={{ display: "flex", gap: "10px" }}>
                      <Link
                        href={`/dashboard/shepherd/${dept.id}`}
                        style={{
                          flex: 1,
                          display: "block",
                          textAlign: "center",
                          padding: "10px",
                          background: "#1A4A2E",
                          color: "white",
                          borderRadius: "8px",
                          textDecoration: "none",
                          fontFamily: "Georgia, serif",
                          fontSize: "13px",
                          fontWeight: "bold",
                        }}
                      >
                        View Shepherd Pipeline
                      </Link>
                      <Link
                        href={`/dashboard/shepherd/invite/${dept.id}`}
                        style={{
                          flex: 1,
                          display: "block",
                          textAlign: "center",
                          padding: "10px",
                          background: "white",
                          color: "#1A4A2E",
                          border: "2px solid #1A4A2E",
                          borderRadius: "8px",
                          textDecoration: "none",
                          fontFamily: "Georgia, serif",
                          fontSize: "13px",
                          fontWeight: "bold",
                        }}
                      >
                        {dept.leader_name ? "Reassign" : "Assign Leader"}
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
