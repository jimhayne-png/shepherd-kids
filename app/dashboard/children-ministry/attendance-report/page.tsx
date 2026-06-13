"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AppShell from "@/components/layout/AppShell";

const supabase = createClient();

const ACCENT = "#7B2CBF";

type SessionOption = { id: string; service_name: string; date: string; scheduled_time: string | null; status: string };
type ReportChild = { id: string; room_id: string | null; child_name: string; parent_name: string; parent_phone: string; checked_in_at: string; checked_out_at: string | null; is_new_visitor: boolean; allergies: string[]; allergy_other: string | null; date_of_birth: string | null; visit_count: number };
type ReportRoom = { room_id: string; room_name: string; children: ReportChild[] };
type Report = {
  session: SessionOption;
  summary: { totalChildren: number; roomsUsed: number; newVisitors: number; returning: number };
  rooms: ReportRoom[];
  visitorJourney: { new: number; returning: number; regular: number };
};
type Room = { id: string; name: string };

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
function calcAge(dob: string): number {
  const d = new Date(dob + "T00:00:00");
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  if (today.getMonth() < d.getMonth() || (today.getMonth() === d.getMonth() && today.getDate() < d.getDate())) age--;
  return age;
}
function fmtBirthday(dob: string): string {
  return "Birthday: " + new Date(dob + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function visitLabel(count: number) {
  if (count === 1) return "1st";
  if (count === 2) return "2nd";
  if (count === 3) return "3rd";
  return `${count}th`;
}
function visitColor(count: number) {
  if (count === 1) return "#3b82f6";
  if (count === 2) return "#8b5cf6";
  if (count === 3) return ACCENT;
  return "#16a34a";
}

function exportCSV(report: Report) {
  const rows: string[][] = [["Room", "Child Name", "Parent Name", "Check-In Time", "Check-Out Time", "New Visitor", "Visit #", "Allergies"]];
  for (const room of report.rooms) {
    for (const c of room.children) {
      rows.push([
        room.room_name,
        c.child_name,
        c.parent_name,
        fmtTime(c.checked_in_at),
        c.checked_out_at ? fmtTime(c.checked_out_at) : "",
        c.is_new_visitor ? "Yes" : "No",
        String(c.visit_count),
        [...c.allergies, c.allergy_other].filter(Boolean).join("; "),
      ]);
    }
  }
  const csv = rows.map(r => r.map(cell => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `attendance-${report.session.date}-${report.session.service_name.replace(/\s+/g, "-")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AttendanceReportPage() {
  const router = useRouter();
  const selectedChurchIdRef = useRef<string | null>(null);
  const [sessions, setSessions] = useState<SessionOption[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [allRooms, setAllRooms] = useState<Room[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRoomId, setEditRoomId] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (!user || error) {
        console.log("Dashboard client user unavailable:", error?.message ?? null);
        return;
      }
      const urlParams = new URLSearchParams(window.location.search);
      selectedChurchIdRef.current = urlParams.get("churchId") ?? localStorage.getItem("selected_church_id");
      const churchHeader: Record<string, string> = selectedChurchIdRef.current ? { "x-selected-church-id": selectedChurchIdRef.current } : {};
      const res = await fetch("/api/checkin/attendance-report", { credentials: "include", headers: churchHeader });
      if (res.ok) { const d = await res.json(); setSessions(d.sessions ?? []); }
      const roomsRes = await fetch("/api/checkin/update-record", { credentials: "include", headers: churchHeader });
      if (roomsRes.ok) { const d = await roomsRes.json(); setAllRooms(d.rooms ?? []); }
    }
    init();
  }, [router]);

  async function loadReport(sessionId: string) {
    if (!sessionId) return;
    setLoadingReport(true);
    setReport(null);
    setEditingId(null);
    const churchHeader: Record<string, string> = selectedChurchIdRef.current ? { "x-selected-church-id": selectedChurchIdRef.current } : {};
    const res = await fetch(`/api/checkin/attendance-report?sessionId=${sessionId}`, { credentials: "include", headers: churchHeader });
    if (res.ok) { const d = await res.json(); setReport(d); }
    setLoadingReport(false);
  }

  async function handleSaveRoom(recordId: string) {
    setSaving(true);
    const churchHeader: Record<string, string> = selectedChurchIdRef.current ? { "x-selected-church-id": selectedChurchIdRef.current } : {};
    await fetch("/api/checkin/update-record", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...churchHeader },
      credentials: "include",
      body: JSON.stringify({ recordId, roomId: editRoomId || null }),
    });
    setSaving(false);
    setEditingId(null);
    loadReport(selectedId);
  }

  async function handleDelete(recordId: string) {
    if (!window.confirm("Remove this check-in record?")) return;
    setDeletingId(recordId);
    const churchHeader: Record<string, string> = selectedChurchIdRef.current ? { "x-selected-church-id": selectedChurchIdRef.current } : {};
    await fetch("/api/checkin/update-record", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", ...churchHeader },
      credentials: "include",
      body: JSON.stringify({ recordId }),
    });
    setDeletingId(null);
    loadReport(selectedId);
  }

  return (
    <AppShell navItems={[]}>
      <div className="px-8 py-10" style={{ background: "linear-gradient(135deg, #08060D 0%, #1C0A30 100%)" }}>
        <p className="text-sm mb-1" style={{ color: "#D4AF37" }}>ShepherdKids</p>
        <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "Georgia, serif" }}>Reports</h1>
      </div>

      <div className="px-8 py-8" style={{ backgroundColor: "#0A0814", minHeight: "100vh" }}>
        {/* Session selector */}
        <div style={{ background: "#120A1F", border: "1px solid rgba(212,175,55,0.22)", borderRadius: "16px", padding: "20px 24px", marginBottom: "20px" }}>
          <label style={{ fontSize: "11px", fontWeight: 700, color: "#A9A9B8", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: "8px" }}>Select Session</label>
          <div style={{ display: "flex", gap: "12px" }}>
            <select
              value={selectedId}
              onChange={e => { setSelectedId(e.target.value); loadReport(e.target.value); }}
              style={{ flex: 1, padding: "10px 14px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: "10px", fontSize: "13px", color: "#ffffff", outline: "none" }}
            >
              <option value="">— Choose a session —</option>
              {sessions.map(s => (
                <option key={s.id} value={s.id}>
                  {s.service_name} · {fmtDate(s.date)}{s.status === "open" ? " (Open)" : ""}
                </option>
              ))}
            </select>
            {report && (
              <button
                onClick={() => exportCSV(report)}
                style={{ padding: "10px 18px", borderRadius: "10px", fontSize: "13px", fontWeight: 700, color: "#ffffff", background: "linear-gradient(135deg, #7B2CBF, #9D4EDD)", border: "none", cursor: "pointer", flexShrink: 0 }}
              >⬇ Export CSV</button>
            )}
          </div>
        </div>

        {loadingReport && (
          <div style={{ background: "#120A1F", border: "1px solid rgba(212,175,55,0.22)", borderRadius: "16px", padding: "48px 32px", textAlign: "center" }}>
            <div style={{ color: "#A9A9B8" }}>Loading report…</div>
          </div>
        )}

        {report && !loadingReport && (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4" style={{ marginBottom: "20px" }}>
              {[
                { label: "Total Children", value: report.summary.totalChildren, emoji: "👧" },
                { label: "Rooms Used", value: report.summary.roomsUsed, emoji: "🏠" },
                { label: "New Visitors", value: report.summary.newVisitors, emoji: "🆕" },
                { label: "Returning", value: report.summary.returning, emoji: "🔄" },
              ].map(card => (
                <div key={card.label} style={{ background: "#120A1F", border: "1px solid rgba(212,175,55,0.22)", borderRadius: "14px", padding: "18px 20px", display: "flex", alignItems: "center", gap: "14px" }}>
                  <div style={{ width: "40px", height: "40px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", flexShrink: 0, backgroundColor: ACCENT + "22" }}>{card.emoji}</div>
                  <div>
                    <div style={{ fontSize: "24px", fontWeight: 900, color: "#ffffff" }}>{card.value}</div>
                    <div style={{ fontSize: "11px", color: "#A9A9B8" }}>{card.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Visitor Journey */}
            <div style={{ background: "#120A1F", border: "1px solid rgba(212,175,55,0.22)", borderRadius: "16px", padding: "20px 24px", marginBottom: "20px" }}>
              <h2 style={{ fontWeight: 700, color: "#ffffff", marginBottom: "16px", fontFamily: "Georgia, serif", fontSize: "17px" }}>Visitor Journey</h2>
              <div className="grid grid-cols-3 gap-4">
                <div style={{ textAlign: "center", padding: "16px", borderRadius: "12px", background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.25)" }}>
                  <div style={{ fontSize: "30px", fontWeight: 900, color: "#60a5fa" }}>{report.visitorJourney.new}</div>
                  <div style={{ fontSize: "13px", fontWeight: 600, marginTop: "4px", color: "#60a5fa" }}>🆕 New</div>
                  <div style={{ fontSize: "11px", color: "#A9A9B8", marginTop: "2px" }}>1st visit</div>
                </div>
                <div style={{ textAlign: "center", padding: "16px", borderRadius: "12px", background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.25)" }}>
                  <div style={{ fontSize: "30px", fontWeight: 900, color: "#fbbf24" }}>{report.visitorJourney.returning}</div>
                  <div style={{ fontSize: "13px", fontWeight: 600, marginTop: "4px", color: "#fbbf24" }}>🔄 Returning</div>
                  <div style={{ fontSize: "11px", color: "#A9A9B8", marginTop: "2px" }}>2–3 visits</div>
                </div>
                <div style={{ textAlign: "center", padding: "16px", borderRadius: "12px", background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.25)" }}>
                  <div style={{ fontSize: "30px", fontWeight: 900, color: "#4ade80" }}>{report.visitorJourney.regular}</div>
                  <div style={{ fontSize: "13px", fontWeight: 600, marginTop: "4px", color: "#4ade80" }}>⭐ Regular</div>
                  <div style={{ fontSize: "11px", color: "#A9A9B8", marginTop: "2px" }}>4+ visits</div>
                </div>
              </div>
            </div>

            {/* Per-room breakdown */}
            <h2 style={{ fontWeight: 700, color: "#ffffff", marginBottom: "16px", fontSize: "17px", fontFamily: "Georgia, serif" }}>Room Breakdown</h2>
            {report.rooms.map(room => (
              <div key={room.room_id} style={{ background: "#120A1F", border: "1px solid rgba(212,175,55,0.22)", borderRadius: "16px", marginBottom: "16px", overflow: "hidden" }}>
                <div style={{ padding: "14px 24px", borderBottom: "1px solid rgba(212,175,55,0.12)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(123,44,191,0.2)" }}>
                  <h3 style={{ fontWeight: 700, color: "#ffffff", margin: 0, fontSize: "15px" }}>{room.room_name}</h3>
                  <span style={{ fontSize: "12px", fontWeight: 700, padding: "3px 12px", borderRadius: "20px", color: "#ffffff", backgroundColor: ACCENT }}>
                    {room.children.length} {room.children.length === 1 ? "child" : "children"}
                  </span>
                </div>
                <div>
                  {room.children.map((child, idx) => (
                    <div key={child.id} style={{ padding: "12px 24px", borderTop: idx > 0 ? "1px solid rgba(212,175,55,0.08)" : "none" }}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                            <span style={{ fontWeight: 600, color: "#ffffff", fontSize: "13px" }}>{child.child_name}</span>
                            {child.is_new_visitor && <span style={{ fontSize: "11px", padding: "1px 8px", borderRadius: "20px", fontWeight: 700, color: "#ffffff", backgroundColor: ACCENT }}>🆕 NEW</span>}
                            <span style={{ fontSize: "11px", padding: "1px 6px", borderRadius: "5px", fontWeight: 700, color: "#ffffff", backgroundColor: visitColor(child.visit_count) }}>
                              {visitLabel(child.visit_count)}
                            </span>
                          </div>
                          <div style={{ fontSize: "12px", color: "#A9A9B8", marginTop: "2px" }}>{child.parent_name} · {fmtTime(child.checked_in_at)}{child.checked_out_at ? ` → ${fmtTime(child.checked_out_at)}` : " (still checked in)"}</div>
                          {(child.allergies.length > 0 || child.allergy_other) && (
                            <div style={{ fontSize: "12px", color: "#f87171", fontWeight: 600, marginTop: "2px" }}>⚠️ {[...child.allergies, child.allergy_other].filter(Boolean).join(", ")}</div>
                          )}
                          {child.date_of_birth && (
                            <div style={{ fontSize: "12px", color: "#A9A9B8", marginTop: "2px" }}>{calcAge(child.date_of_birth)} years old · {fmtBirthday(child.date_of_birth)}</div>
                          )}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
                          <button
                            onClick={() => { setEditingId(child.id); setEditRoomId(room.room_id === "unassigned" ? "" : room.room_id); }}
                            style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "5px", fontWeight: 600, border: `1px solid ${ACCENT}`, color: ACCENT, background: "transparent", cursor: "pointer" }}
                          >Edit</button>
                          <button
                            onClick={() => handleDelete(child.id)}
                            disabled={deletingId === child.id}
                            style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "5px", fontWeight: 600, border: "1px solid rgba(239,68,68,0.5)", color: "#f87171", background: "transparent", cursor: "pointer" }}
                          >{deletingId === child.id ? "…" : "Delete"}</button>
                        </div>
                      </div>
                      {editingId === child.id && (
                        <div style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                          <select
                            value={editRoomId}
                            onChange={e => setEditRoomId(e.target.value)}
                            style={{ flex: 1, fontSize: "12px", padding: "5px 8px", borderRadius: "7px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(212,175,55,0.3)", color: "#ffffff", outline: "none" }}
                          >
                            <option value="">— No Room —</option>
                            {allRooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                          </select>
                          <button
                            onClick={() => handleSaveRoom(child.id)}
                            disabled={saving}
                            style={{ fontSize: "11px", padding: "5px 10px", borderRadius: "7px", fontWeight: 700, color: "#ffffff", background: "linear-gradient(135deg, #7B2CBF, #9D4EDD)", border: "none", cursor: "pointer", flexShrink: 0 }}
                          >{saving ? "…" : "Save"}</button>
                          <button
                            onClick={() => setEditingId(null)}
                            style={{ fontSize: "11px", padding: "5px 10px", borderRadius: "7px", fontWeight: 600, color: "#A9A9B8", border: "1px solid rgba(255,255,255,0.15)", background: "transparent", cursor: "pointer", flexShrink: 0 }}
                          >Cancel</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}

        {!loadingReport && !report && selectedId && (
          <div style={{ background: "#120A1F", border: "1px solid rgba(212,175,55,0.22)", borderRadius: "16px", padding: "48px 32px", textAlign: "center" }}>
            <p style={{ color: "#A9A9B8", margin: 0 }}>No records found for this session.</p>
          </div>
        )}

        {!selectedId && !loadingReport && (
          <div style={{ background: "#120A1F", border: "1px solid rgba(212,175,55,0.22)", borderRadius: "16px", padding: "64px 32px", textAlign: "center" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>📊</div>
            <p style={{ color: "#A9A9B8", fontWeight: 600, margin: 0 }}>Select a session above to view the report.</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
