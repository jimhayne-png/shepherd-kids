"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AppShell from "@/components/layout/AppShell";

const supabase = createClient();

const ACCENT = "#7B2CBF";

type LiveChild = { id: string; child_name: string; parent_name: string; is_new_visitor: boolean; allergies: string[]; allergy_other: string | null; checked_in_at: string };
type LiveRoom = { room_id: string; room_name: string; children: LiveChild[] };
type LiveSession = { id: string; service_name: string; date: string; scheduled_time: string | null };
type Room = { id: string; name: string };

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export default function LiveCheckinPage() {
  const router = useRouter();
  const selectedChurchIdRef = useRef<string | null>(null);
  const [session, setSession] = useState<LiveSession | null>(null);
  const [rooms, setRooms] = useState<LiveRoom[]>([]);
  const [totalCheckedIn, setTotalCheckedIn] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [allRooms, setAllRooms] = useState<Room[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRoomId, setEditRoomId] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchLive = useCallback(async () => {
    const churchHeader: Record<string, string> = selectedChurchIdRef.current ? { "x-selected-church-id": selectedChurchIdRef.current } : {};
    const res = await fetch("/api/checkin/live", { credentials: "include", headers: churchHeader });
    if (!res.ok) return;
    const d = await res.json();
    setSession(d.session ?? null);
    setRooms(d.rooms ?? []);
    setTotalCheckedIn(d.totalCheckedIn ?? 0);
    setLastUpdated(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    async function init() {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (!user || error) {
        console.log("Dashboard client user unavailable:", error?.message ?? null);
        return;
      }
      const urlParams = new URLSearchParams(window.location.search);
      selectedChurchIdRef.current = urlParams.get("churchId") ?? localStorage.getItem("selected_church_id");
      await fetchLive();
      const churchHeader: Record<string, string> = selectedChurchIdRef.current ? { "x-selected-church-id": selectedChurchIdRef.current } : {};
      const roomsRes = await fetch("/api/checkin/update-record", { credentials: "include", headers: churchHeader });
      if (roomsRes.ok) { const d = await roomsRes.json(); setAllRooms(d.rooms ?? []); }
    }
    init();
  }, [router, fetchLive]);

  useEffect(() => {
    const interval = setInterval(() => fetchLive(), 30000);
    return () => clearInterval(interval);
  }, [fetchLive]);

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
    fetchLive();
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
    fetchLive();
  }

  return (
    <AppShell navItems={[]}>
      <div className="px-8 py-10" style={{ background: "linear-gradient(135deg, #08060D 0%, #1C0A30 100%)" }}>
        <p className="text-sm mb-1" style={{ color: "#D4AF37" }}>ShepherdKids</p>
        <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "Georgia, serif" }}>Check-In</h1>
        {lastUpdated && <p className="text-xs mt-1" style={{ color: "#D8D8E8" }}>Last updated {lastUpdated.toLocaleTimeString()} · auto-refreshes every 30s</p>}
      </div>

      <div className="px-8 py-8" style={{ backgroundColor: "#0A0814", minHeight: "100vh" }}>
        {loading && (
          <div style={{ background: "#120A1F", border: "1px solid rgba(212,175,55,0.22)", borderRadius: "16px", padding: "48px 32px", textAlign: "center" }}>
            <div style={{ color: "#A9A9B8" }}>Loading…</div>
          </div>
        )}

        {!loading && !session && (
          <div style={{ background: "#120A1F", border: "1px solid rgba(212,175,55,0.22)", borderRadius: "16px", padding: "64px 32px", textAlign: "center" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>🕐</div>
            <p style={{ color: "#ffffff", fontWeight: 700, fontSize: "18px", margin: 0 }}>No open session right now</p>
            <p style={{ color: "#A9A9B8", fontSize: "13px", marginTop: "6px" }}>Create and open a session in Check-In Setup to see live data here.</p>
          </div>
        )}

        {!loading && session && (
          <>
            {/* Session info + total count */}
            <div style={{ background: "#120A1F", border: "1px solid rgba(212,175,55,0.22)", borderRadius: "16px", padding: "20px 24px", marginBottom: "20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#ffffff", margin: 0, fontFamily: "Georgia, serif" }}>{session.service_name}</h2>
                <p style={{ fontSize: "13px", color: "#A9A9B8", margin: "3px 0 0" }}>{fmtDate(session.date)}</p>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "44px", fontWeight: 900, color: ACCENT, lineHeight: 1 }}>{totalCheckedIn}</div>
                <div style={{ fontSize: "12px", fontWeight: 600, color: "#A9A9B8", marginTop: "3px" }}>Checked In</div>
              </div>
            </div>

            {rooms.length === 0 && (
              <div style={{ background: "#120A1F", border: "1px solid rgba(212,175,55,0.22)", borderRadius: "16px", padding: "48px 32px", textAlign: "center" }}>
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>👋</div>
                <p style={{ color: "#A9A9B8", fontWeight: 600, margin: 0 }}>No children checked in yet.</p>
              </div>
            )}

            {/* Per-room cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {rooms.map(room => (
                <div key={room.room_id} style={{ background: "#120A1F", border: "1px solid rgba(212,175,55,0.22)", borderRadius: "16px", overflow: "hidden" }}>
                  <div style={{ padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(123,44,191,0.35)", borderBottom: "1px solid rgba(212,175,55,0.15)" }}>
                    <h3 style={{ fontWeight: 700, color: "#ffffff", fontSize: "15px", margin: 0 }}>{room.room_name}</h3>
                    <span style={{ fontSize: "22px", fontWeight: 900, color: "#D4AF37" }}>{room.children.length}</span>
                  </div>
                  <div>
                    {room.children.map((child, idx) => {
                      const hasAllergy = child.allergies.length > 0 || child.allergy_other;
                      const allergyText = [...child.allergies, child.allergy_other].filter(Boolean).join(", ");
                      return (
                        <div key={child.id} style={{ padding: "12px 20px", borderTop: idx > 0 ? "1px solid rgba(212,175,55,0.08)" : "none" }}>
                          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px", marginBottom: "3px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                              <span style={{ fontWeight: 700, color: "#ffffff", fontSize: "14px" }}>{child.child_name}</span>
                              {child.is_new_visitor && (
                                <span style={{ fontSize: "11px", padding: "1px 8px", borderRadius: "20px", fontWeight: 700, color: "#ffffff", backgroundColor: ACCENT }}>🆕 NEW</span>
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
                          <div style={{ fontSize: "12px", color: "#A9A9B8" }}>{child.parent_name} · in {fmtTime(child.checked_in_at)}</div>
                          {hasAllergy && (
                            <div style={{ fontSize: "12px", fontWeight: 700, color: "#ffffff", marginTop: "6px", padding: "4px 10px", borderRadius: "7px", backgroundColor: "#dc2626" }}>
                              ⚠️ {allergyText}
                            </div>
                          )}
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
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
