"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AppShell from "@/components/layout/AppShell";

const supabase = createClient();

const ACCENT = "#7B2CBF";
const GOLD = "#D4AF37";
const MUTED = "#A9A9B8";
const CARD = "#120A1F";

type LiveChild = {
  id: string;
  child_name: string;
  parent_name: string;
  is_new_visitor: boolean;
  allergies: string[];
  allergy_other: string | null;
  checked_in_at: string;
};

type LiveRoom = {
  room_id: string;
  room_name: string;
  children: LiveChild[];
};

type LiveSession = {
  id: string;
  service_name: string;
  date: string;
  scheduled_time: string | null;
};

type Room = {
  id: string;
  name: string;
};

type ParentRequestState = {
  child: LiveChild;
  secondsLeft: number;
  sending: boolean;
  error: string | null;
};

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function ParentRequestModal({
  state,
  onCancel,
  onStart,
}: {
  state: ParentRequestState;
  onCancel: () => void;
  onStart: () => void;
}) {
  const hasStarted = state.secondsLeft < 10 || state.sending;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Request parent"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.82)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "430px",
          background: "#150E22",
          border: "1px solid rgba(212,175,55,0.30)",
          borderRadius: "18px",
          boxShadow: "0 18px 70px rgba(0,0,0,0.75)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "18px 22px",
            background: "rgba(123,44,191,0.32)",
            borderBottom: "1px solid rgba(212,175,55,0.14)",
          }}
        >
          <p
            style={{
              margin: 0,
              color: GOLD,
              fontSize: "11px",
              fontWeight: 800,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            Request Parent
          </p>
          <h2
            style={{
              margin: "6px 0 0",
              color: "#ffffff",
              fontSize: "20px",
              fontWeight: 800,
              fontFamily: "Georgia, serif",
            }}
          >
            {state.child.child_name}
          </h2>
        </div>

        <div style={{ padding: "24px 22px" }}>
          {!hasStarted && (
            <>
              <p
                style={{
                  margin: "0 0 10px",
                  color: "#ffffff",
                  fontSize: "15px",
                  fontWeight: 700,
                }}
              >
                Send parent request?
              </p>

              <p
                style={{
                  margin: "0 0 18px",
                  color: MUTED,
                  fontSize: "13px",
                  lineHeight: 1.55,
                }}
              >
                This will send a one-way SMS to{" "}
                <strong style={{ color: "#ffffff" }}>{state.child.parent_name}</strong>{" "}
                requesting that they come to the classroom. The message will send after
                a 10-second cancel window.
              </p>
            </>
          )}

          {hasStarted && (
            <div style={{ textAlign: "center" }}>
              <p
                style={{
                  margin: "0 0 8px",
                  color: MUTED,
                  fontSize: "12px",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                Parent Request Started
              </p>

              <div
                style={{
                  width: "128px",
                  height: "128px",
                  borderRadius: "50%",
                  margin: "12px auto 18px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "2px solid rgba(212,175,55,0.55)",
                  background: "rgba(212,175,55,0.08)",
                  color: GOLD,
                  fontSize: "56px",
                  fontWeight: 900,
                  lineHeight: 1,
                }}
              >
                {state.sending ? "…" : state.secondsLeft}
              </div>

              <p
                style={{
                  margin: "0 0 14px",
                  color: "#ffffff",
                  fontSize: "14px",
                  fontWeight: 700,
                }}
              >
                {state.sending
                  ? "Sending parent request..."
                  : `Sending in ${state.secondsLeft} seconds`}
              </p>
            </div>
          )}

          {state.error && (
            <div
              style={{
                marginTop: "12px",
                padding: "10px 12px",
                borderRadius: "10px",
                background: "rgba(239,68,68,0.10)",
                border: "1px solid rgba(239,68,68,0.30)",
                color: "#FCA5A5",
                fontSize: "12px",
                lineHeight: 1.45,
              }}
            >
              {state.error}
            </div>
          )}

          <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
            <button
              onClick={onCancel}
              disabled={state.sending}
              style={{
                flex: 1,
                padding: "11px 14px",
                borderRadius: "10px",
                border: "1px solid rgba(255,255,255,0.12)",
                background: "transparent",
                color: MUTED,
                fontSize: "13px",
                fontWeight: 700,
                cursor: state.sending ? "not-allowed" : "pointer",
                opacity: state.sending ? 0.45 : 1,
              }}
            >
              {hasStarted ? "Cancel Request" : "Cancel"}
            </button>

            {!hasStarted && (
              <button
                onClick={onStart}
                style={{
                  flex: 1,
                  padding: "11px 14px",
                  borderRadius: "10px",
                  border: "none",
                  background: "linear-gradient(135deg, #7B2CBF, #9D4EDD)",
                  color: "#ffffff",
                  fontSize: "13px",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Send Request
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
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

  const [parentRequest, setParentRequest] = useState<ParentRequestState | null>(null);
  const [requestedParents, setRequestedParents] = useState<Record<string, string>>({});

  const fetchLive = useCallback(async () => {
    const churchHeader: Record<string, string> = selectedChurchIdRef.current
      ? { "x-selected-church-id": selectedChurchIdRef.current }
      : {};

    const res = await fetch("/api/checkin/live", {
      credentials: "include",
      headers: churchHeader,
    });

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
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (!user || error) {
        console.log("Dashboard client user unavailable:", error?.message ?? null);
        return;
      }

      const urlParams = new URLSearchParams(window.location.search);
      selectedChurchIdRef.current =
        urlParams.get("churchId") ?? localStorage.getItem("selected_church_id");

      await fetchLive();

      const churchHeader: Record<string, string> = selectedChurchIdRef.current
        ? { "x-selected-church-id": selectedChurchIdRef.current }
        : {};

      const roomsRes = await fetch("/api/checkin/update-record", {
        credentials: "include",
        headers: churchHeader,
      });

      if (roomsRes.ok) {
        const d = await roomsRes.json();
        setAllRooms(d.rooms ?? []);
      }
    }

    init();
  }, [router, fetchLive]);

  useEffect(() => {
    const interval = setInterval(() => fetchLive(), 30000);
    return () => clearInterval(interval);
  }, [fetchLive]);

  async function handleSaveRoom(recordId: string) {
    setSaving(true);

    const churchHeader: Record<string, string> = selectedChurchIdRef.current
      ? { "x-selected-church-id": selectedChurchIdRef.current }
      : {};

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

    const churchHeader: Record<string, string> = selectedChurchIdRef.current
      ? { "x-selected-church-id": selectedChurchIdRef.current }
      : {};

    await fetch("/api/checkin/update-record", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", ...churchHeader },
      credentials: "include",
      body: JSON.stringify({ recordId }),
    });

    setDeletingId(null);
    fetchLive();
  }

  function openParentRequest(child: LiveChild) {
    if (requestedParents[child.id]) return;

    setParentRequest({
      child,
      secondsLeft: 10,
      sending: false,
      error: null,
    });
  }

  function startParentRequestCountdown() {
    setParentRequest(current =>
      current ? { ...current, secondsLeft: 9, error: null } : current
    );
  }

  async function sendParentRequest(child: LiveChild) {
    setParentRequest(current =>
      current ? { ...current, sending: true, error: null } : current
    );

    try {
      const churchHeader: Record<string, string> = selectedChurchIdRef.current
        ? { "x-selected-church-id": selectedChurchIdRef.current }
        : {};

      const res = await fetch("/api/checkin/parent-request", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...churchHeader,
        },
        body: JSON.stringify({ checkinRecordId: child.id }),
      });

      const d = await res.json();

      if (!res.ok) {
        throw new Error(d.error ?? d.detail ?? "Failed to send parent request.");
      }

      const sentAt = new Date().toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      });

      setRequestedParents(prev => ({
        ...prev,
        [child.id]: sentAt,
      }));

      setParentRequest(null);
      fetchLive();
    } catch (err) {
      setParentRequest(current =>
        current
          ? {
              ...current,
              sending: false,
              error: err instanceof Error ? err.message : "Failed to send parent request.",
            }
          : current
      );
    }
  }

  useEffect(() => {
    if (!parentRequest) return;
    if (parentRequest.sending) return;
    if (parentRequest.secondsLeft === 10) return;

    if (parentRequest.secondsLeft <= 0) {
      sendParentRequest(parentRequest.child);
      return;
    }

    const timer = window.setTimeout(() => {
      setParentRequest(current =>
        current ? { ...current, secondsLeft: current.secondsLeft - 1 } : current
      );
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [parentRequest]);

  return (
    <AppShell navItems={[]}>
      <div
        className="px-8 py-10"
        style={{
          background: "linear-gradient(135deg, #08060D 0%, #1C0A30 100%)",
        }}
      >
        <p className="text-sm mb-1" style={{ color: GOLD }}>
          ShepherdKids
        </p>

        <h1
          className="text-3xl font-bold text-white"
          style={{ fontFamily: "Georgia, serif" }}
        >
          Check-In
        </h1>

        {lastUpdated && (
          <p className="text-xs mt-1" style={{ color: "#D8D8E8" }}>
            Last updated {lastUpdated.toLocaleTimeString()} · auto-refreshes every 30s
          </p>
        )}
      </div>

      <div
        className="px-8 py-8"
        style={{ backgroundColor: "#0A0814", minHeight: "100vh" }}
      >
        {loading && (
          <div
            style={{
              background: CARD,
              border: "1px solid rgba(212,175,55,0.22)",
              borderRadius: "16px",
              padding: "48px 32px",
              textAlign: "center",
            }}
          >
            <div style={{ color: MUTED }}>Loading…</div>
          </div>
        )}

        {!loading && !session && (
          <div
            style={{
              background: CARD,
              border: "1px solid rgba(212,175,55,0.22)",
              borderRadius: "16px",
              padding: "64px 32px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>🕐</div>
            <p
              style={{
                color: "#ffffff",
                fontWeight: 700,
                fontSize: "18px",
                margin: 0,
              }}
            >
              No open session right now
            </p>
            <p style={{ color: MUTED, fontSize: "13px", marginTop: "6px" }}>
              Create and open a session in Check-In Setup to see live data here.
            </p>
          </div>
        )}

        {!loading && session && (
          <>
            <div
              style={{
                background: CARD,
                border: "1px solid rgba(212,175,55,0.22)",
                borderRadius: "16px",
                padding: "20px 24px",
                marginBottom: "20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <h2
                  style={{
                    fontSize: "18px",
                    fontWeight: 700,
                    color: "#ffffff",
                    margin: 0,
                    fontFamily: "Georgia, serif",
                  }}
                >
                  {session.service_name}
                </h2>
                <p style={{ fontSize: "13px", color: MUTED, margin: "3px 0 0" }}>
                  {fmtDate(session.date)}
                </p>
              </div>

              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontSize: "44px",
                    fontWeight: 900,
                    color: ACCENT,
                    lineHeight: 1,
                  }}
                >
                  {totalCheckedIn}
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color: MUTED,
                    marginTop: "3px",
                  }}
                >
                  Checked In
                </div>
              </div>
            </div>

            {rooms.length === 0 && (
              <div
                style={{
                  background: CARD,
                  border: "1px solid rgba(212,175,55,0.22)",
                  borderRadius: "16px",
                  padding: "48px 32px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>👋</div>
                <p style={{ color: MUTED, fontWeight: 600, margin: 0 }}>
                  No children checked in yet.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {rooms.map(room => (
                <div
                  key={room.room_id}
                  style={{
                    background: CARD,
                    border: "1px solid rgba(212,175,55,0.22)",
                    borderRadius: "16px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      padding: "12px 20px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: "rgba(123,44,191,0.35)",
                      borderBottom: "1px solid rgba(212,175,55,0.15)",
                    }}
                  >
                    <h3
                      style={{
                        fontWeight: 700,
                        color: "#ffffff",
                        fontSize: "15px",
                        margin: 0,
                      }}
                    >
                      {room.room_name}
                    </h3>
                    <span style={{ fontSize: "22px", fontWeight: 900, color: GOLD }}>
                      {room.children.length}
                    </span>
                  </div>

                  <div>
                    {room.children.map((child, idx) => {
                      const hasAllergy = child.allergies.length > 0 || child.allergy_other;
                      const allergyText = [...child.allergies, child.allergy_other]
                        .filter(Boolean)
                        .join(", ");
                      const requestedAt = requestedParents[child.id];

                      return (
                        <div
                          key={child.id}
                          style={{
                            padding: "12px 20px",
                            borderTop:
                              idx > 0 ? "1px solid rgba(212,175,55,0.08)" : "none",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              justifyContent: "space-between",
                              gap: "8px",
                              marginBottom: "3px",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                flexWrap: "wrap",
                              }}
                            >
                              <span
                                style={{
                                  fontWeight: 700,
                                  color: "#ffffff",
                                  fontSize: "14px",
                                }}
                              >
                                {child.child_name}
                              </span>

                              {child.is_new_visitor && (
                                <span
                                  style={{
                                    fontSize: "11px",
                                    padding: "1px 8px",
                                    borderRadius: "20px",
                                    fontWeight: 700,
                                    color: "#ffffff",
                                    backgroundColor: ACCENT,
                                  }}
                                >
                                  🆕 NEW
                                </span>
                              )}
                            </div>

                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                                flexShrink: 0,
                              }}
                            >
                              <button
                                onClick={() => {
                                  setEditingId(child.id);
                                  setEditRoomId(
                                    room.room_id === "unassigned" ? "" : room.room_id
                                  );
                                }}
                                style={{
                                  fontSize: "11px",
                                  padding: "2px 8px",
                                  borderRadius: "5px",
                                  fontWeight: 600,
                                  border: `1px solid ${ACCENT}`,
                                  color: ACCENT,
                                  background: "transparent",
                                  cursor: "pointer",
                                }}
                              >
                                Edit
                              </button>

                              <button
                                onClick={() => handleDelete(child.id)}
                                disabled={deletingId === child.id}
                                style={{
                                  fontSize: "11px",
                                  padding: "2px 8px",
                                  borderRadius: "5px",
                                  fontWeight: 600,
                                  border: "1px solid rgba(239,68,68,0.5)",
                                  color: "#f87171",
                                  background: "transparent",
                                  cursor: "pointer",
                                }}
                              >
                                {deletingId === child.id ? "…" : "Delete"}
                              </button>
                            </div>
                          </div>

                          <div style={{ fontSize: "12px", color: MUTED }}>
                            {child.parent_name} · in {fmtTime(child.checked_in_at)}
                          </div>

                          {hasAllergy && (
                            <div
                              style={{
                                fontSize: "12px",
                                fontWeight: 700,
                                color: "#ffffff",
                                marginTop: "6px",
                                padding: "4px 10px",
                                borderRadius: "7px",
                                backgroundColor: "#dc2626",
                              }}
                            >
                              ⚠️ {allergyText}
                            </div>
                          )}

                          <div style={{ marginTop: "10px" }}>
                            {requestedAt ? (
                              <div
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "6px",
                                  padding: "7px 11px",
                                  borderRadius: "8px",
                                  background: "rgba(16,185,129,0.10)",
                                  border: "1px solid rgba(16,185,129,0.28)",
                                  color: "#6EE7B7",
                                  fontSize: "12px",
                                  fontWeight: 800,
                                }}
                              >
                                ✓ Parent Requested {requestedAt}
                              </div>
                            ) : (
                              <button
                                onClick={() => openParentRequest(child)}
                                style={{
                                  width: "100%",
                                  padding: "8px 10px",
                                  borderRadius: "9px",
                                  border: "1px solid rgba(212,175,55,0.42)",
                                  background: "rgba(212,175,55,0.08)",
                                  color: GOLD,
                                  fontSize: "12px",
                                  fontWeight: 800,
                                  cursor: "pointer",
                                  letterSpacing: "0.02em",
                                }}
                              >
                                Request Parent
                              </button>
                            )}
                          </div>

                          {editingId === child.id && (
                            <div
                              style={{
                                marginTop: "8px",
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                              }}
                            >
                              <select
                                value={editRoomId}
                                onChange={e => setEditRoomId(e.target.value)}
                                style={{
                                  flex: 1,
                                  fontSize: "12px",
                                  padding: "5px 8px",
                                  borderRadius: "7px",
                                  background: "rgba(255,255,255,0.08)",
                                  border: "1px solid rgba(212,175,55,0.3)",
                                  color: "#ffffff",
                                  outline: "none",
                                }}
                              >
                                <option value="" style={{ background: "#ffffff", color: "#000000" }}>— No Room —</option>
                                {allRooms.map(r => (
                                  <option key={r.id} value={r.id} style={{ background: "#ffffff", color: "#000000" }}>
                                    {r.name}
                                  </option>
                                ))}
                              </select>

                              <button
                                onClick={() => handleSaveRoom(child.id)}
                                disabled={saving}
                                style={{
                                  fontSize: "11px",
                                  padding: "5px 10px",
                                  borderRadius: "7px",
                                  fontWeight: 700,
                                  color: "#ffffff",
                                  background: "linear-gradient(135deg, #7B2CBF, #9D4EDD)",
                                  border: "none",
                                  cursor: "pointer",
                                  flexShrink: 0,
                                }}
                              >
                                {saving ? "…" : "Save"}
                              </button>

                              <button
                                onClick={() => setEditingId(null)}
                                style={{
                                  fontSize: "11px",
                                  padding: "5px 10px",
                                  borderRadius: "7px",
                                  fontWeight: 600,
                                  color: MUTED,
                                  border: "1px solid rgba(255,255,255,0.15)",
                                  background: "transparent",
                                  cursor: "pointer",
                                  flexShrink: 0,
                                }}
                              >
                                Cancel
                              </button>
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

      {parentRequest && (
        <ParentRequestModal
          state={parentRequest}
          onCancel={() => setParentRequest(null)}
          onStart={startParentRequestCountdown}
        />
      )}
    </AppShell>
  );
}
