"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const TOUCH_CONFIG = {
  email: { icon: "📧", label: "Email", color: "#1e40af", bg: "#eff6ff", border: "#bfdbfe" },
  phone: { icon: "📞", label: "Phone Call", color: "#166534", bg: "#f0fdf4", border: "#bbf7d0" },
  letter: { icon: "✉️", label: "Letter", color: "#92400e", bg: "#fffbeb", border: "#fde68a" },
};

type Assignment = {
  id: string;
  member_id: string;
  touch_type: "email" | "phone" | "letter";
  rotation_group: number;
  completed_at: string | null;
  completed_by: string | null;
  notes: string | null;
  members: {
    first_name: string;
    last_name: string;
    photo_url: string | null;
    email: string | null;
    phone: string | null;
  };
};

function Initials({ name }: { name: string }) {
  const parts = name.trim().split(" ");
  const initials = (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
  const hue = (name.charCodeAt(0) * 37 + name.charCodeAt(name.length - 1) * 13) % 360;
  return (
    <div
      style={{
        width: "40px",
        height: "40px",
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "14px",
        fontWeight: "bold",
        color: "white",
        flexShrink: 0,
        backgroundColor: `hsl(${hue}, 55%, 45%)`,
      }}
    >
      {initials.toUpperCase()}
    </div>
  );
}

export default function ShepherdDepartmentPage({
  params,
}: {
  params: Promise<{ departmentId: string }>;
}) {
  const { departmentId } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [department, setDepartment] = useState<any>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [monthYear, setMonthYear] = useState("");
  const [nextAssignments, setNextAssignments] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);
  const [notingId, setNotingId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/"); return; }
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
    if (res.status === 401 || res.status === 403) { router.replace("/"); return; }
    const data = await res.json();
    if (res.ok) {
      setDepartment(data.department);
      setAssignments(data.assignments ?? []);
      setMonthYear(data.month_year);
      setNextAssignments(data.next_assignments ?? []);
    } else {
      setError(data.error ?? "Failed to load");
    }
    setLoading(false);
  }

  async function handleGenerate() {
    if (!token) return;
    setGenerating(true);
    const res = await fetch(`/api/shepherd/${departmentId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    if (res.ok) {
      await loadData(token);
    } else {
      setError(data.error ?? "Failed to generate");
    }
    setGenerating(false);
  }

  async function handleToggleComplete(assignment: Assignment) {
    if (!token) return;
    const completed = !assignment.completed_at;
    setAssignments((prev) =>
      prev.map((a) =>
        a.id === assignment.id
          ? { ...a, completed_at: completed ? new Date().toISOString() : null }
          : a
      )
    );
    await fetch(`/api/shepherd/${departmentId}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ assignment_id: assignment.id, completed }),
    });
  }

  async function handleSaveNote(assignmentId: string) {
    if (!token) return;
    setSavingNote(true);
    await fetch(`/api/shepherd/${departmentId}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ assignment_id: assignmentId, notes: noteText }),
    });
    setAssignments((prev) =>
      prev.map((a) => (a.id === assignmentId ? { ...a, notes: noteText } : a))
    );
    setSavingNote(false);
    setNotingId(null);
    setNoteText("");
  }

  const monthLabel = monthYear
    ? new Date(monthYear + "-01").toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "";

  const completed = assignments.filter((a) => a.completed_at).length;
  const total = assignments.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  const byType = {
    email: assignments.filter((a) => a.touch_type === "email"),
    phone: assignments.filter((a) => a.touch_type === "phone"),
    letter: assignments.filter((a) => a.touch_type === "letter"),
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f9f7f4" }}>
        <p style={{ fontFamily: "Georgia, serif", color: "#9ca3af" }}>Loading…</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100dvh", background: "#f9f7f4" }}>
      {/* Hero */}
      <div style={{ background: "linear-gradient(135deg, #1A4A2E 0%, #2d6e47 100%)", padding: "32px 24px 28px" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "20px" }}>
            <img
              src="/shepherdwell-logo.png"
              alt="ShepherdWell"
              style={{ width: "48px", height: "48px", borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(255,255,255,0.25)" }}
            />
            <div>
              <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "13px", fontFamily: "Georgia, serif", margin: 0 }}>
                Shepherd Dashboard
              </p>
              <h1 style={{ color: "white", fontSize: "22px", fontFamily: "Georgia, serif", fontWeight: "normal", margin: 0 }}>
                {department?.icon && `${department.icon} `}{department?.name ?? "Department"}
              </h1>
            </div>
          </div>

          {total > 0 && (
            <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: "12px", padding: "20px 24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <span style={{ color: "white", fontFamily: "Georgia, serif", fontSize: "15px" }}>
                  {monthLabel} Progress
                </span>
                <span style={{ color: "#F28C28", fontFamily: "Georgia, serif", fontSize: "20px", fontWeight: "bold" }}>
                  {pct}%
                </span>
              </div>
              <div style={{ background: "rgba(255,255,255,0.2)", borderRadius: "999px", height: "10px", overflow: "hidden" }}>
                <div
                  style={{
                    width: `${pct}%`,
                    height: "100%",
                    background: "#F28C28",
                    borderRadius: "999px",
                    transition: "width 0.5s ease",
                  }}
                />
              </div>
              <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "13px", fontFamily: "Georgia, serif", margin: "8px 0 0" }}>
                {completed} of {total} outreaches completed
              </p>
            </div>
          )}
        </div>
      </div>

      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "24px 20px" }}>
        {error && (
          <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "10px", padding: "12px 16px", marginBottom: "20px" }}>
            <p style={{ color: "#dc2626", fontFamily: "Georgia, serif", fontSize: "14px", margin: 0 }}>{error}</p>
          </div>
        )}

        {/* Generate prompt */}
        {total === 0 && (
          <div style={{ background: "white", border: "2px dashed #d1d5db", borderRadius: "16px", padding: "40px", textAlign: "center", marginBottom: "28px" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>📋</div>
            <h2 style={{ fontFamily: "Georgia, serif", fontSize: "20px", color: "#1f2937", marginBottom: "8px", fontWeight: "normal" }}>
              No outreach assigned yet for {monthLabel}
            </h2>
            <p style={{ fontFamily: "Georgia, serif", color: "#6b7280", fontSize: "15px", marginBottom: "24px", lineHeight: "1.6" }}>
              Launch this month's outreach to see who needs a call, email, or letter outreach.
            </p>
            <button
              onClick={handleGenerate}
              disabled={generating}
              style={{
                padding: "14px 32px",
                background: "#1A4A2E",
                color: "white",
                border: "none",
                borderRadius: "10px",
                fontSize: "16px",
                fontFamily: "Georgia, serif",
                fontWeight: "bold",
                cursor: generating ? "not-allowed" : "pointer",
              }}
            >
              {generating ? "Launching…" : "Launch Monthly Outreach"}
            </button>
          </div>
        )}

        {/* Touch columns */}
        {total > 0 && (
          <>
            <h2 style={{ fontFamily: "Georgia, serif", fontSize: "20px", color: "#1A4A2E", marginBottom: "20px", fontWeight: "normal" }}>
              This Month's Outreach — {monthLabel}
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "20px", marginBottom: "36px" }}>
              {(["email", "phone", "letter"] as const).map((type) => {
                const cfg = TOUCH_CONFIG[type];
                const list = byType[type];
                return (
                  <div key={type} style={{ background: "white", borderRadius: "14px", overflow: "hidden", border: `1px solid ${cfg.border}` }}>
                    {/* Column header */}
                    <div style={{ background: cfg.bg, padding: "14px 18px", borderBottom: `1px solid ${cfg.border}` }}>
                      <span style={{ fontSize: "20px" }}>{cfg.icon}</span>
                      <span style={{ fontFamily: "Georgia, serif", fontWeight: "bold", color: cfg.color, marginLeft: "8px", fontSize: "15px" }}>
                        {cfg.label}
                      </span>
                      <span style={{ fontFamily: "Georgia, serif", fontSize: "12px", color: "#9ca3af", marginLeft: "6px" }}>
                        ({list.filter((a) => a.completed_at).length}/{list.length})
                      </span>
                    </div>

                    {list.length === 0 && (
                      <p style={{ fontFamily: "Georgia, serif", fontSize: "13px", color: "#9ca3af", padding: "20px 18px", margin: 0 }}>
                        No members assigned
                      </p>
                    )}

                    <div style={{ padding: "12px" }}>
                      {list.map((a) => {
                        const name = `${a.members.first_name} ${a.members.last_name}`;
                        const done = !!a.completed_at;
                        return (
                          <div
                            key={a.id}
                            style={{
                              background: done ? "#f9fafb" : "white",
                              border: "1px solid #f3f4f6",
                              borderRadius: "10px",
                              padding: "14px",
                              marginBottom: "10px",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                              <Initials name={name} />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{
                                  fontFamily: "Georgia, serif",
                                  fontSize: "14px",
                                  fontWeight: "bold",
                                  color: done ? "#9ca3af" : "#1f2937",
                                  margin: 0,
                                  textDecoration: done ? "line-through" : "none",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}>
                                  {name}
                                </p>
                                {type === "email" && a.members.email && (
                                  <p style={{ fontFamily: "Georgia, serif", fontSize: "11px", color: "#9ca3af", margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {a.members.email}
                                  </p>
                                )}
                                {type === "phone" && a.members.phone && (
                                  <p style={{ fontFamily: "Georgia, serif", fontSize: "11px", color: "#9ca3af", margin: "2px 0 0" }}>
                                    {a.members.phone}
                                  </p>
                                )}
                              </div>
                            </div>

                            {a.notes && notingId !== a.id && (
                              <p style={{ fontFamily: "Georgia, serif", fontSize: "12px", color: "#6b7280", fontStyle: "italic", margin: "0 0 10px", lineHeight: "1.5" }}>
                                "{a.notes}"
                              </p>
                            )}

                            {notingId === a.id && (
                              <div style={{ marginBottom: "10px" }}>
                                <textarea
                                  value={noteText}
                                  onChange={(e) => setNoteText(e.target.value)}
                                  placeholder="Add a note…"
                                  rows={2}
                                  style={{
                                    width: "100%",
                                    padding: "8px",
                                    borderRadius: "8px",
                                    border: "1px solid #d1d5db",
                                    fontSize: "13px",
                                    fontFamily: "Georgia, serif",
                                    resize: "none",
                                    boxSizing: "border-box",
                                    outline: "none",
                                  }}
                                />
                                <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
                                  <button
                                    onClick={() => handleSaveNote(a.id)}
                                    disabled={savingNote}
                                    style={{ flex: 1, padding: "6px", background: "#1A4A2E", color: "white", border: "none", borderRadius: "6px", fontSize: "12px", fontFamily: "Georgia, serif", cursor: "pointer" }}
                                  >
                                    {savingNote ? "Saving…" : "Save"}
                                  </button>
                                  <button
                                    onClick={() => { setNotingId(null); setNoteText(""); }}
                                    style={{ padding: "6px 12px", background: "#f3f4f6", color: "#6b7280", border: "none", borderRadius: "6px", fontSize: "12px", fontFamily: "Georgia, serif", cursor: "pointer" }}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}

                            <div style={{ display: "flex", gap: "8px" }}>
                              <button
                                onClick={() => handleToggleComplete(a)}
                                style={{
                                  flex: 1,
                                  padding: "8px",
                                  background: done ? "#f0fdf4" : "#1A4A2E",
                                  color: done ? "#166534" : "white",
                                  border: done ? "1px solid #bbf7d0" : "none",
                                  borderRadius: "8px",
                                  fontSize: "12px",
                                  fontFamily: "Georgia, serif",
                                  fontWeight: "bold",
                                  cursor: "pointer",
                                }}
                              >
                                {done ? "✓ Done" : "Mark Complete"}
                              </button>
                              {notingId !== a.id && (
                                <button
                                  onClick={() => { setNotingId(a.id); setNoteText(a.notes ?? ""); }}
                                  style={{
                                    padding: "8px 12px",
                                    background: "#f9fafb",
                                    color: "#6b7280",
                                    border: "1px solid #e5e7eb",
                                    borderRadius: "8px",
                                    fontSize: "12px",
                                    fontFamily: "Georgia, serif",
                                    cursor: "pointer",
                                  }}
                                >
                                  📝
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Next month preview */}
            {nextAssignments.length > 0 && (
              <div style={{ background: "white", borderRadius: "14px", padding: "24px", border: "1px solid #e5e7eb" }}>
                <h3 style={{ fontFamily: "Georgia, serif", fontSize: "16px", color: "#6b7280", marginTop: 0, marginBottom: "16px", fontWeight: "normal" }}>
                  Coming Next Month
                </h3>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                  {nextAssignments.slice(0, 9).map((a: any, i: number) => {
                    const cfg = TOUCH_CONFIG[a.touch_type as keyof typeof TOUCH_CONFIG];
                    const name = `${a.members?.first_name} ${a.members?.last_name}`;
                    return (
                      <div
                        key={i}
                        style={{
                          background: cfg?.bg ?? "#f9fafb",
                          border: `1px solid ${cfg?.border ?? "#e5e7eb"}`,
                          borderRadius: "8px",
                          padding: "6px 12px",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <span style={{ fontSize: "14px" }}>{cfg?.icon}</span>
                        <span style={{ fontFamily: "Georgia, serif", fontSize: "13px", color: "#374151" }}>{name}</span>
                      </div>
                    );
                  })}
                  {nextAssignments.length > 9 && (
                    <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "6px 12px" }}>
                      <span style={{ fontFamily: "Georgia, serif", fontSize: "13px", color: "#9ca3af" }}>+{nextAssignments.length - 9} more</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
