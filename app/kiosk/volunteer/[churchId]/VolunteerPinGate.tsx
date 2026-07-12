"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const ACCENT = "#F28C28";
const REFRESH_MS = 30_000;
const REQUEST_COUNTDOWN_SECONDS = 10;

type TabletStep = "loading" | "pin_entry" | "classroom_select" | "unlocked";

type AssignedRoom = { id: string; name: string; qrToken: string };
type SelectedRoom  = { id: string; name: string; qrToken: string };

type ActiveVolunteer = {
  sessionId: string;
  volunteerName: string;
  issuedAt: string;
  expiresAt: string;
};

type AttendanceRecord = {
  id: string;
  child_name: string;
  parent_name: string;
  parent_phone: string;
  room_id: string | null;
  security_code: string;
  is_new_visitor: boolean;
  allergies: string[];
  allergy_other: string | null;
  authorized_pickups: string | null;
  checked_in_at: string;
  checked_out_at: string | null;
  checked_out_by: string | null;
  service_name: string | null;
};

function Logo() {
  return (
    <div className="flex items-center justify-center gap-2">
      <svg width="24" height="24" viewBox="0 0 36 36" fill="none" aria-hidden="true">
        <rect width="36" height="36" rx="8" fill="#1C0A30" />
        <path d="M18 8 L18 28 M12 14 Q18 8 24 14" stroke="#F28C28" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
      <span className="text-lg font-bold" style={{ color: "#1C0A30" }}>
        Shepherd<span style={{ color: ACCENT }}>Kids</span>
      </span>
    </div>
  );
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function PinInput({
  value,
  onChange,
  autoFocus = false,
}: {
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
}) {
  return (
    <input
      type="password"
      inputMode="numeric"
      pattern="[0-9]*"
      maxLength={4}
      value={value}
      onChange={e => onChange(e.target.value.replace(/\D/g, "").slice(0, 4))}
      placeholder="• • • •"
      autoFocus={autoFocus}
      className="w-full text-center text-4xl font-mono tracking-widest px-4 py-5 border-2 rounded-xl outline-none transition-colors"
      style={{
        borderColor: value.length === 4 ? ACCENT : "#4B3080",
        color: "#ffffff",
        backgroundColor: "#12051f",
        WebkitTextFillColor: "#ffffff",
        caretColor: "#ffffff",
      }}
    />
  );
}

export default function VolunteerPinGate({
  churchId,
  churchName,
}: {
  churchId: string;
  churchName: string;
}) {
  const [step, setStep] = useState<TabletStep>("loading");

  // PIN entry
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [verifying, setVerifying] = useState(false);

  // After PIN verified
  const [firstVolunteerName, setFirstVolunteerName] = useState("");
  const [assignedRooms, setAssignedRooms] = useState<AssignedRoom[]>([]);
  const [selectingRoom, setSelectingRoom] = useState(false);

  // Locked classroom
  const [selectedRoom, setSelectedRoom] = useState<SelectedRoom | null>(null);

  // Active volunteers on this tablet
  const [activeVolunteers, setActiveVolunteers] = useState<ActiveVolunteer[]>([]);
  const [signingOut, setSigningOut] = useState<string | null>(null);
  const [confirmChangeClassroom, setConfirmChangeClassroom] = useState(false);
  const [changingClassroom, setChangingClassroom] = useState(false);

  // Add-volunteer overlay
  const [addingVolunteer, setAddingVolunteer] = useState(false);
  const [addPin, setAddPin] = useState("");
  const [addPinError, setAddPinError] = useState("");
  const [addingSigningIn, setAddingSigningIn] = useState(false);

  // Attendance
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // Parent request
  const [requestingParent, setRequestingParent] = useState<string | null>(null);
  const [requestCountdowns, setRequestCountdowns] = useState<Record<string, number>>({});
  const [sentParentRequests, setSentParentRequests] = useState<Record<string, boolean>>({});
  const countdownTimersRef = useRef<Record<string, ReturnType<typeof setInterval>>>({});

  useEffect(() => {
    return () => { Object.values(countdownTimersRef.current).forEach(clearInterval); };
  }, []);

  // Polls the server (via vk_tablet cookie) for this device's active volunteer sessions.
  const fetchSessions = useCallback(async (): Promise<ActiveVolunteer[] | null> => {
    try {
      const res = await fetch(
        `/api/kiosk/volunteer/${churchId}/classroom-sessions`,
        { credentials: "same-origin" },
      );
      if (!res.ok) return null;
      const d = await res.json();
      return (d.volunteers ?? []) as ActiveVolunteer[];
    } catch {
      return null;
    }
  }, [churchId]);

  const fetchAttendance = useCallback(async (roomId: string) => {
    const res = await fetch(
      `/api/kiosk/volunteer/${churchId}/attendance?roomId=${roomId}`,
      { credentials: "same-origin" },
    );
    if (res.ok) {
      const d = await res.json();
      setRecords(d.records ?? []);
      setLastRefresh(new Date());
    }
  }, [churchId]);

  // On mount: validate the vk_tablet HttpOnly cookie server-side to restore unlocked state.
  // No sessionStorage is consulted — authorization is always server-validated.
  useEffect(() => {
    async function init() {
      try {
        const res = await fetch(
          `/api/kiosk/volunteer/${churchId}/tablet-restore`,
          { credentials: "same-origin" },
        );
        if (res.ok) {
          const d = await res.json();
          if (d.unlocked && Array.isArray(d.volunteers) && d.volunteers.length > 0) {
            const room: SelectedRoom = { id: d.roomId, name: d.roomName, qrToken: d.roomQrToken };
            setSelectedRoom(room);
            setActiveVolunteers(d.volunteers as ActiveVolunteer[]);
            setStep("unlocked");
            setAttendanceLoading(true);
            await fetchAttendance(room.id);
            setAttendanceLoading(false);
            return;
          }
        }
      } catch {
        // Network error — fall through to PIN entry
      }
      setStep("pin_entry");
    }
    init();
  }, [churchId, fetchAttendance]);

  // Poll every 30s when unlocked
  useEffect(() => {
    if (step !== "unlocked" || !selectedRoom) return;
    const interval = setInterval(async () => {
      const volunteers = await fetchSessions();
      if (volunteers !== null) {
        setActiveVolunteers(volunteers);
        if (volunteers.length === 0) {
          setSelectedRoom(null);
          setRecords([]);
          setSentParentRequests({});
          setStep("pin_entry");
        } else {
          await fetchAttendance(selectedRoom.id);
        }
      }
    }, REFRESH_MS);
    return () => clearInterval(interval);
  }, [step, selectedRoom, fetchSessions, fetchAttendance]);

  // ── Step 1: Verify PIN ────────────────────────────────────────────────────────

  async function handlePinSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pin.length !== 4 || verifying) return;
    setPinError("");
    setVerifying(true);

    try {
      const res = await fetch(`/api/kiosk/volunteer/${churchId}/verify-tablet-pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();

      if (!res.ok) {
        setPinError(data.error ?? "Incorrect PIN.");
        setPin("");
        setVerifying(false);
        return;
      }

      setFirstVolunteerName(data.volunteerName);
      setAssignedRooms(data.assignedRooms ?? []);
      setStep("classroom_select");
    } catch {
      setPinError("Network error. Please try again.");
    }

    setVerifying(false);
  }

  // ── Step 2: Select classroom ──────────────────────────────────────────────────

  async function handleClassroomSelect(room: AssignedRoom) {
    setSelectingRoom(true);

    try {
      const res = await fetch(`/api/kiosk/volunteer/${churchId}/classroom-signin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ pin, roomToken: room.qrToken }),
      });
      const data = await res.json();

      if (!res.ok) {
        setPinError(data.error ?? "Failed to start session. Try signing in again.");
        setSelectingRoom(false);
        setStep("pin_entry");
        setPin("");
        return;
      }

      const lockedRoom: SelectedRoom = { id: room.id, name: room.name, qrToken: room.qrToken };
      setSelectedRoom(lockedRoom);
      setActiveVolunteers([{
        sessionId: data.sessionId,
        volunteerName: data.volunteerName,
        issuedAt: data.issuedAt,
        expiresAt: data.expiresAt,
      }]);
      setPin("");
      setStep("unlocked");
      setAttendanceLoading(true);
      await fetchAttendance(room.id);
      setAttendanceLoading(false);
    } catch {
      setPinError("Network error. Please try signing in again.");
      setStep("pin_entry");
      setPin("");
    }

    setSelectingRoom(false);
  }

  // ── Add additional volunteer (unlocked state) ─────────────────────────────────

  async function handleAddVolunteerSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (addPin.length !== 4 || addingSigningIn || !selectedRoom) return;
    setAddPinError("");
    setAddingSigningIn(true);

    try {
      const res = await fetch(`/api/kiosk/volunteer/${churchId}/classroom-signin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ pin: addPin, roomToken: selectedRoom.qrToken }),
      });
      const data = await res.json();

      if (!res.ok) {
        setAddPinError(data.error ?? "Incorrect PIN or you are not assigned to this classroom.");
        setAddPin("");
        setAddingSigningIn(false);
        return;
      }

      setActiveVolunteers(prev => [...prev, {
        sessionId: data.sessionId,
        volunteerName: data.volunteerName,
        issuedAt: data.issuedAt,
        expiresAt: data.expiresAt,
      }]);
      setAddPin("");
      setAddPinError("");
      setAddingVolunteer(false);
    } catch {
      setAddPinError("Network error. Please try again.");
    }

    setAddingSigningIn(false);
  }

  // ── Sign out individual volunteer ─────────────────────────────────────────────

  async function handleSignOut(sessionId: string) {
    setSigningOut(sessionId);
    try {
      await fetch(`/api/kiosk/volunteer/${churchId}/classroom-signout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ sessionId }),
      });
    } catch { /* best-effort */ }

    const remaining = activeVolunteers.filter(v => v.sessionId !== sessionId);
    setActiveVolunteers(remaining);
    setSigningOut(null);

    if (remaining.length === 0) {
      setSelectedRoom(null);
      setRecords([]);
      setSentParentRequests({});
      setStep("pin_entry");
    }
  }

  // ── Change classroom ──────────────────────────────────────────────────────────

  async function handleChangeClassroom() {
    setChangingClassroom(true);
    try {
      await fetch(`/api/kiosk/volunteer/${churchId}/tablet-revoke`, {
        method: "POST",
        credentials: "same-origin",
      });
    } catch { /* best-effort */ }
    setSelectedRoom(null);
    setActiveVolunteers([]);
    setRecords([]);
    setSentParentRequests({});
    setConfirmChangeClassroom(false);
    setChangingClassroom(false);
    setPin("");
    setPinError("");
    setStep("pin_entry");
  }

  // ── Checkout ──────────────────────────────────────────────────────────────────

  async function handleCheckout(recordId: string, action: "checkout" | "undo") {
    if (!selectedRoom) return;
    setActing(recordId);
    await fetch(`/api/kiosk/volunteer/${churchId}/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ recordId, action }),
    });
    await fetchAttendance(selectedRoom.id);
    setActing(null);
  }

  // ── Parent request ────────────────────────────────────────────────────────────

  function cancelParentRequest(recordId: string) {
    const timer = countdownTimersRef.current[recordId];
    if (timer) { clearInterval(timer); delete countdownTimersRef.current[recordId]; }
    setRequestCountdowns(c => { const n = { ...c }; delete n[recordId]; return n; });
  }

  function startParentRequestCountdown(record: AttendanceRecord) {
    if (requestCountdowns[record.id] || requestingParent === record.id) return;
    setRequestCountdowns(c => ({ ...c, [record.id]: REQUEST_COUNTDOWN_SECONDS }));
    countdownTimersRef.current[record.id] = setInterval(() => {
      setRequestCountdowns(c => {
        const count = c[record.id];
        if (!count) return c;
        if (count <= 1) {
          const t = countdownTimersRef.current[record.id];
          if (t) { clearInterval(t); delete countdownTimersRef.current[record.id]; }
          const n = { ...c }; delete n[record.id];
          void sendParentRequest(record);
          return n;
        }
        return { ...c, [record.id]: count - 1 };
      });
    }, 1000);
  }

  async function sendParentRequest(record: AttendanceRecord) {
    setRequestingParent(record.id);
    try {
      const res = await fetch(`/api/kiosk/volunteer/${churchId}/parent-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ checkinRecordId: record.id }),
      });
      if (!res.ok) { alert("Failed to send parent request."); return; }
      setSentParentRequests(c => ({ ...c, [record.id]: true }));
    } catch {
      alert("Failed to send parent request.");
    } finally {
      setRequestingParent(null);
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Render
  // ════════════════════════════════════════════════════════════════════════════

  // Loading
  if (step === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#08060D" }}>
        <div className="text-center">
          <div className="animate-spin w-10 h-10 border-4 border-orange-400 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-sm" style={{ color: "#A9A9B8" }}>Loading…</p>
        </div>
      </div>
    );
  }

  // ── PIN entry ─────────────────────────────────────────────────────────────────
  if (step === "pin_entry") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: "#08060D" }}>
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="mb-3"><Logo /></div>
            <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#D4AF37" }}>
              Classroom Tablet
            </p>
            <h1 className="text-2xl font-bold text-white mb-2">Volunteer Sign In</h1>
            <p className="text-sm" style={{ color: "#A9A9B8" }}>
              Enter your Personal Volunteer PIN
            </p>
            <p className="text-xs mt-1" style={{ color: "#555577" }}>{churchName}</p>
          </div>

          <form
            onSubmit={handlePinSubmit}
            className="rounded-2xl border p-8 space-y-4"
            style={{ backgroundColor: "#1C0A30", borderColor: "rgba(123,44,191,0.4)" }}
          >
            <PinInput value={pin} onChange={v => { setPinError(""); setPin(v); }} autoFocus />
            {pinError && <p className="text-sm text-red-400 text-center font-medium">{pinError}</p>}
            <button
              type="submit"
              disabled={pin.length !== 4 || verifying}
              className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-opacity disabled:opacity-40"
              style={{ backgroundColor: ACCENT }}
            >
              {verifying ? "Verifying…" : "Sign In"}
            </button>
          </form>

          <p className="text-center text-xs mt-6" style={{ color: "#444466" }}>
            Your PIN is set by your children&apos;s ministry administrator.
          </p>
        </div>
      </div>
    );
  }

  // ── Classroom selection ───────────────────────────────────────────────────────
  if (step === "classroom_select") {
    return (
      <div className="min-h-screen" style={{ backgroundColor: "#08060D" }}>
        <div className="px-6 py-8" style={{ background: `linear-gradient(135deg, #1C0A30 0%, ${ACCENT} 100%)` }}>
          <div className="flex items-center gap-2 mb-1 opacity-70">
            <svg width="16" height="16" viewBox="0 0 36 36" fill="none" aria-hidden="true">
              <rect width="36" height="36" rx="8" fill="rgba(255,255,255,0.25)" />
              <path d="M18 8 L18 28 M12 14 Q18 8 24 14" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
            <span className="text-white text-xs font-semibold">ShepherdKids · Classroom Tablet</span>
          </div>
          <h1 className="text-2xl font-bold text-white mt-2 mb-0.5">Select Classroom</h1>
          <p className="text-orange-100 text-sm">
            Welcome, {firstVolunteerName} &middot; {churchName}
          </p>
        </div>

        <div className="px-4 py-6 max-w-2xl mx-auto">
          {assignedRooms.length === 0 ? (
            <div className="bg-white rounded-2xl shadow p-12 text-center">
              <div className="text-4xl mb-3">🏠</div>
              <p className="text-gray-500 font-medium">No classrooms assigned.</p>
              <p className="text-gray-400 text-sm mt-1">Contact your administrator to be assigned to a classroom.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {assignedRooms.map(room => (
                <button
                  key={room.id}
                  onClick={() => handleClassroomSelect(room)}
                  disabled={selectingRoom}
                  className="bg-white rounded-2xl shadow border border-gray-100 p-6 text-left hover:border-orange-300 hover:shadow-md transition-all disabled:opacity-50"
                >
                  <div className="text-3xl mb-3">🏠</div>
                  <h3 className="text-lg font-bold text-gray-900">{room.name}</h3>
                  {selectingRoom && (
                    <p className="text-sm text-orange-500 mt-1">Starting session…</p>
                  )}
                </button>
              ))}
            </div>
          )}

          <button
            onClick={() => { setStep("pin_entry"); setPin(""); setPinError(""); }}
            className="mt-6 text-xs transition-colors block mx-auto"
            style={{ color: "#555577" }}
          >
            ← Back
          </button>
        </div>
      </div>
    );
  }

  // ── Unlocked: classroom locked, attendance view ───────────────────────────────
  const checkedIn  = records.filter(r => !r.checked_out_at).length;
  const checkedOut = records.filter(r =>  r.checked_out_at).length;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#08060D" }}>

      {/* ── Header ── */}
      <div className="px-6 py-5" style={{ background: `linear-gradient(135deg, #1C0A30 0%, ${ACCENT} 100%)` }}>

        {/* Room title row */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-xl font-bold text-white">{selectedRoom?.name}</h1>
            <p className="text-orange-100 text-sm">{churchName}</p>
          </div>
          <div className="flex gap-4 flex-shrink-0">
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{checkedIn}</p>
              <p className="text-xs text-orange-100">Checked In</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white opacity-60">{checkedOut}</p>
              <p className="text-xs text-orange-100 opacity-60">Checked Out</p>
            </div>
          </div>
        </div>

        {/* Currently Serving */}
        <div className="rounded-xl p-3" style={{ backgroundColor: "rgba(0,0,0,0.25)" }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.5)" }}>
            Currently Serving
          </p>

          <div className="space-y-2">
            {activeVolunteers.map(v => (
              <div key={v.sessionId} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{v.volunteerName}</p>
                  <p className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
                    Signed in {fmtTime(v.issuedAt)} &middot; until {fmtTime(v.expiresAt)}
                  </p>
                </div>
                <button
                  onClick={() => handleSignOut(v.sessionId)}
                  disabled={!!signingOut}
                  className="flex-shrink-0 text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors disabled:opacity-40"
                  style={{ backgroundColor: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.8)" }}
                >
                  {signingOut === v.sessionId ? "…" : "Sign Out"}
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={() => { setAddPin(""); setAddPinError(""); setAddingVolunteer(true); }}
            className="mt-3 w-full py-2 rounded-lg text-xs font-bold transition-colors"
            style={{ backgroundColor: "rgba(242,140,40,0.18)", color: ACCENT, border: `1px solid rgba(242,140,40,0.35)` }}
          >
            + Volunteer Sign In
          </button>

          <div className="flex items-center justify-between mt-2.5">
            {lastRefresh && (
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                Updated {fmtTime(lastRefresh.toISOString())}
              </p>
            )}
            <div className="ml-auto">
              {confirmChangeClassroom ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>End all sessions?</span>
                  <button
                    onClick={handleChangeClassroom}
                    disabled={changingClassroom}
                    className="text-xs px-2 py-1 rounded font-bold transition-colors disabled:opacity-50"
                    style={{ backgroundColor: "#ef4444", color: "#ffffff" }}
                  >
                    {changingClassroom ? "…" : "Confirm"}
                  </button>
                  <button
                    onClick={() => setConfirmChangeClassroom(false)}
                    className="text-xs px-2 py-1 rounded font-medium"
                    style={{ color: "rgba(255,255,255,0.5)" }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmChangeClassroom(true)}
                  className="text-xs transition-colors"
                  style={{ color: "rgba(255,255,255,0.35)" }}
                >
                  Change Classroom
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Attendance roster ── */}
      <div className="px-4 py-6 max-w-4xl mx-auto">
        {attendanceLoading && records.length === 0 ? (
          <div className="text-center py-16 text-gray-400">Loading attendance…</div>
        ) : records.length === 0 ? (
          <div className="bg-white rounded-2xl shadow p-16 text-center border border-gray-100">
            <div className="text-5xl mb-4">🧒</div>
            <p className="text-gray-500 font-semibold">No children checked in to this room yet.</p>
            <p className="text-gray-400 text-sm mt-1">This view refreshes automatically every 30 seconds.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {records.map(record => {
              const isOut           = !!record.checked_out_at;
              const hasAllergies    = record.allergies.length > 0 || !!record.allergy_other;
              const isActing        = acting === record.id;
              const countdown       = requestCountdowns[record.id];
              const isRequesting    = requestingParent === record.id;
              const wasRequested    = !!sentParentRequests[record.id];

              return (
                <div
                  key={record.id}
                  className="bg-white rounded-2xl shadow border border-gray-100 p-5 transition-opacity"
                  style={{ opacity: isOut ? 0.65 : 1 }}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <h3 className="text-lg font-bold text-gray-900">{record.child_name}</h3>
                        {record.is_new_visitor && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-blue-100 text-blue-700">New Visitor</span>
                        )}
                        {record.service_name && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-gray-100 text-gray-600">{record.service_name}</span>
                        )}
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-bold"
                          style={{ backgroundColor: isOut ? "#f3f4f6" : "#dcfce7", color: isOut ? "#6b7280" : "#16a34a" }}
                        >
                          {isOut ? "Checked Out" : "Checked In"}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm text-gray-600 mb-3">
                        <div>
                          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide block">Parent</span>
                          {record.parent_name}
                        </div>
                        <div>
                          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide block">Phone</span>
                          {record.parent_phone}
                        </div>
                        <div>
                          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide block">Security Code</span>
                          <span className="font-mono font-bold text-gray-800">{record.security_code}</span>
                        </div>
                        <div>
                          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide block">Check-In Time</span>
                          {fmtTime(record.checked_in_at)}
                          {isOut && record.checked_out_at && (
                            <span className="text-gray-400 ml-1">→ {fmtTime(record.checked_out_at)}</span>
                          )}
                        </div>
                        {record.authorized_pickups && (
                          <div className="sm:col-span-2">
                            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide block">Authorized Pickups</span>
                            {record.authorized_pickups}
                          </div>
                        )}
                      </div>

                      {hasAllergies && (
                        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                          <span className="text-red-500 font-bold text-sm flex-shrink-0">⚠️ Allergies:</span>
                          <span className="text-sm text-red-700 font-medium">
                            {[...record.allergies, record.allergy_other].filter(Boolean).join(", ")}
                          </span>
                        </div>
                      )}

                      {wasRequested && (
                        <div className="mt-3 rounded-xl border px-3 py-2 text-sm font-semibold"
                          style={{ backgroundColor: "#DCFCE7", borderColor: "#22C55E", color: "#166534" }}>
                          ✓ Parent request sent for this session.
                        </div>
                      )}
                    </div>

                    <div className="flex-shrink-0 pt-1 flex flex-col gap-2">
                      {!isOut && (
                        countdown ? (
                          <div className="min-w-[170px]">
                            <button disabled className="w-full px-4 py-2.5 rounded-xl text-sm font-bold text-white text-center"
                              style={{ backgroundColor: "#991b1b" }}>
                              Sending in {countdown}s
                            </button>
                            <button onClick={() => cancelParentRequest(record.id)}
                              className="w-full mt-1 px-4 py-2 rounded-xl text-xs font-bold"
                              style={{ backgroundColor: "#FEE2E2", color: "#991B1B", border: "1px solid #FCA5A5" }}>
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startParentRequestCountdown(record)}
                            disabled={isRequesting || wasRequested}
                            className="px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-opacity disabled:opacity-50 min-w-[170px] text-center"
                            style={{ backgroundColor: wasRequested ? "#166534" : "#991b1b" }}
                          >
                            {isRequesting ? "Sending…" : wasRequested ? "✓ Sent" : "Request Parent"}
                          </button>
                        )
                      )}

                      <button
                        onClick={() => handleCheckout(record.id, isOut ? "undo" : "checkout")}
                        disabled={isActing}
                        className="px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-opacity disabled:opacity-50 min-w-[170px] text-center"
                        style={{ backgroundColor: isOut ? "#6b7280" : ACCENT }}
                      >
                        {isActing ? "…" : isOut ? "Undo Checkout" : "Mark Checked Out"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Add volunteer modal ── */}
      {addingVolunteer && (
        <div
          className="fixed inset-0 flex items-center justify-center px-4 z-50"
          style={{ backgroundColor: "rgba(8,6,13,0.88)", backdropFilter: "blur(4px)" }}
        >
          <div className="w-full max-w-sm">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-white mb-1">Volunteer Sign In</h2>
              <p className="text-sm" style={{ color: "#A9A9B8" }}>
                Enter your Personal Volunteer PIN to join <strong className="text-white">{selectedRoom?.name}</strong>.
              </p>
            </div>
            <form
              onSubmit={handleAddVolunteerSubmit}
              className="rounded-2xl border p-8 space-y-4"
              style={{ backgroundColor: "#1C0A30", borderColor: "rgba(123,44,191,0.4)" }}
            >
              <PinInput value={addPin} onChange={v => { setAddPinError(""); setAddPin(v); }} autoFocus />
              {addPinError && (
                <p className="text-sm text-red-400 text-center font-medium">{addPinError}</p>
              )}
              <button
                type="submit"
                disabled={addPin.length !== 4 || addingSigningIn}
                className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-opacity disabled:opacity-40"
                style={{ backgroundColor: ACCENT }}
              >
                {addingSigningIn ? "Verifying…" : "Sign In"}
              </button>
              <button
                type="button"
                onClick={() => { setAddingVolunteer(false); setAddPin(""); setAddPinError(""); }}
                className="w-full py-2.5 rounded-xl text-sm font-medium transition-colors"
                style={{ color: "#A9A9B8", backgroundColor: "rgba(255,255,255,0.05)" }}
              >
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
