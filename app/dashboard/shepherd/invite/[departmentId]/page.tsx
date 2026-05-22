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

type Member = {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
};

export default function InviteLeaderPage({
  params,
}: {
  params: Promise<{ departmentId: string }>;
}) {
  const { departmentId } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [deptName, setDeptName] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
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

      const [deptRes, membersRes] = await Promise.all([
        fetch(`/api/departments/${departmentId}`, { headers: { Authorization: `Bearer ${session.access_token}` } }),
        fetch("/api/members", { headers: { Authorization: `Bearer ${session.access_token}` } }),
      ]);

      if (deptRes.ok) {
        const d = await deptRes.json();
        setDeptName(d.department?.name ?? "Department");
      }
      if (membersRes.ok) {
        const d = await membersRes.json();
        setMembers(d.members ?? []);
      }
      setLoading(false);
    }
    init();
  }, [departmentId, router]);

  async function handleSend() {
    if (!token || !selectedId) return;
    setSending(true);
    setError("");
    const res = await fetch(`/api/shepherd/invite/${departmentId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ member_id: selectedId }),
    });
    const data = await res.json();
    if (res.ok) {
      setSent(true);
    } else {
      setError(data.error ?? "Failed to send invitation");
    }
    setSending(false);
  }

  const selected = members.find((m) => m.id === selectedId);
  const filtered = members.filter((m) => {
    const q = search.toLowerCase();
    return (
      m.first_name.toLowerCase().includes(q) ||
      m.last_name.toLowerCase().includes(q) ||
      m.email?.toLowerCase().includes(q)
    );
  });

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
      <div style={{ padding: "32px", maxWidth: "560px" }}>
        {/* Breadcrumb */}
        <div style={{ marginBottom: "24px" }}>
          <Link href="/dashboard/shepherd" style={{ fontFamily: "Georgia, serif", fontSize: "14px", color: "#6b7280", textDecoration: "none" }}>
            ← Shepherd Pipeline
          </Link>
        </div>

        <h1 style={{ fontFamily: "Georgia, serif", fontSize: "26px", color: "#1A4A2E", margin: "0 0 4px", fontWeight: "normal" }}>
          Invite Ministry Leader
        </h1>
        <p style={{ color: "#6b7280", fontSize: "15px", fontFamily: "Georgia, serif", marginTop: 0, marginBottom: "32px" }}>
          {deptName}
        </p>

        {sent ? (
          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "14px", padding: "36px", textAlign: "center" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>✉️</div>
            <h2 style={{ fontFamily: "Georgia, serif", fontSize: "22px", color: "#166534", fontWeight: "normal", marginBottom: "12px" }}>
              Invitation sent!
            </h2>
            <p style={{ fontFamily: "Georgia, serif", color: "#374151", fontSize: "15px", marginBottom: "24px", lineHeight: "1.6" }}>
              {selected?.first_name} {selected?.last_name} will receive an email with a login link.
              Once they accept, they'll be set up as the leader of {deptName}.
            </p>
            <Link
              href="/dashboard/shepherd"
              style={{ display: "inline-block", padding: "12px 28px", background: "#1A4A2E", color: "white", borderRadius: "10px", textDecoration: "none", fontFamily: "Georgia, serif", fontSize: "15px" }}
            >
              Back to Shepherd Pipeline
            </Link>
          </div>
        ) : (
          <div style={{ background: "white", borderRadius: "14px", padding: "28px", border: "1px solid #e5e7eb" }}>
            <div style={{ marginBottom: "24px" }}>
              <label style={{ fontFamily: "Georgia, serif", fontSize: "14px", color: "#374151", display: "block", marginBottom: "8px" }}>
                Search members
              </label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name or email…"
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  borderRadius: "10px",
                  border: "2px solid #e5e7eb",
                  fontSize: "15px",
                  fontFamily: "Georgia, serif",
                  outline: "none",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#1A4A2E")}
                onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
              />
            </div>

            <div style={{ maxHeight: "300px", overflowY: "auto", marginBottom: "24px", border: "1px solid #e5e7eb", borderRadius: "10px" }}>
              {filtered.length === 0 && (
                <p style={{ fontFamily: "Georgia, serif", fontSize: "14px", color: "#9ca3af", padding: "20px", margin: 0 }}>No members found</p>
              )}
              {filtered.map((m) => {
                const isSelected = m.id === selectedId;
                return (
                  <button
                    key={m.id}
                    onClick={() => setSelectedId(m.id)}
                    style={{
                      width: "100%",
                      padding: "14px 18px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: isSelected ? "#f0fdf4" : "white",
                      border: "none",
                      borderBottom: "1px solid #f3f4f6",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <div>
                      <p style={{ fontFamily: "Georgia, serif", fontSize: "15px", color: isSelected ? "#1A4A2E" : "#1f2937", margin: 0, fontWeight: isSelected ? "bold" : "normal" }}>
                        {m.first_name} {m.last_name}
                      </p>
                      <p style={{ fontFamily: "Georgia, serif", fontSize: "12px", color: "#9ca3af", margin: "2px 0 0" }}>
                        {m.email ?? "No email on file"}
                      </p>
                    </div>
                    {isSelected && <span style={{ fontSize: "18px" }}>✓</span>}
                  </button>
                );
              })}
            </div>

            {selected && (
              <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "10px", padding: "14px 18px", marginBottom: "20px" }}>
                <p style={{ fontFamily: "Georgia, serif", fontSize: "14px", color: "#166534", margin: 0 }}>
                  Invite will be sent to: <strong>{selected.email ?? "No email"}</strong>
                </p>
              </div>
            )}

            {error && (
              <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "10px", padding: "12px 16px", marginBottom: "16px" }}>
                <p style={{ color: "#dc2626", fontFamily: "Georgia, serif", fontSize: "14px", margin: 0 }}>{error}</p>
              </div>
            )}

            <button
              onClick={handleSend}
              disabled={!selectedId || !selected?.email || sending}
              style={{
                width: "100%",
                padding: "16px",
                background: !selectedId || !selected?.email ? "#9ca3af" : sending ? "#4b7a5e" : "#1A4A2E",
                color: "white",
                border: "none",
                borderRadius: "10px",
                fontSize: "16px",
                fontFamily: "Georgia, serif",
                fontWeight: "bold",
                cursor: !selectedId || !selected?.email || sending ? "not-allowed" : "pointer",
              }}
            >
              {sending ? "Sending…" : "Send Invitation ✉️"}
            </button>

            {selected && !selected.email && (
              <p style={{ fontFamily: "Georgia, serif", fontSize: "12px", color: "#dc2626", textAlign: "center", marginTop: "10px" }}>
                This member has no email address on file. Add one in their profile first.
              </p>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
