"use client";

import { useCallback, useEffect, useState } from "react";

type Step = "pin" | "rooms" | "attendance";

type Room = {
  id: string;
  name: string;
  min_age: number | null;
  max_age: number | null;
  capacity: number | null;
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

const ACCENT = "#F28C28";
const REFRESH_MS = 30_000;

function Logo() {
  return (
    <div className="flex items-center justify-center gap-2">
      <svg width="24" height="24" viewBox="0 0 36 36" fill="none" aria-hidden="true">
        <rect width="36" height="36" rx="8" fill="#1A4A2E" />
        <path d="M18 8 L18 28 M12 14 Q18 8 24 14" stroke="#F28C28" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
      <span className="text-lg font-bold" style={{ color: "#1A4A2E" }}>
        Shepherd<span style={{ color: ACCENT }}>Well</span>
      </span>
    </div>
  );
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function ageLabel(room: Room) {
  if (room.min_age === null && room.max_age === null) return null;
  if (room.min_age === null) return `Up to age ${room.max_age}`;
  if (room.max_age === null) return `Age ${room.min_age}+`;
  return `Ages ${room.min_age}–${room.max_age}`;
}

export default function VolunteerPinGate({
  churchId,
  churchName,
}: {
  churchId: string;
  churchName: string;
}) {
  const [step, setStep] = useState<Step>("pin");
  const [entered, setEntered] = useState("");
  const [pinError, setPinError] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(false);

  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  async function handlePinSubmit() {
    if (entered.length !== 4 || verifying) return;
    setVerifying(true);
    const res = await fetch(`/api/kiosk/volunteer/${churchId}/verify-pin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: entered }),
    });
    const data = await res.json();
    setVerifying(false);
    if (data.success) {
      setRoomsLoading(true);
      const rRes = await fetch(`/api/kiosk/volunteer/${churchId}/rooms`);
      if (rRes.ok) {
        const rData = await rRes.json();
        setRooms(rData.rooms ?? []);
      }
      setRoomsLoading(false);
      setStep("rooms");
    } else {
      setPinError(true);
      setEntered("");
    }
  }

  const fetchAttendance = useCallback(async (roomId: string) => {
    const res = await fetch(`/api/kiosk/volunteer/${churchId}/attendance?roomId=${roomId}`);
    if (res.ok) {
      const d = await res.json();
      setRecords(d.records ?? []);
      setLastRefresh(new Date());
    }
  }, [churchId]);

  useEffect(() => {
    if (step !== "attendance" || !selectedRoom) return;
    setAttendanceLoading(true);
    fetchAttendance(selectedRoom.id).then(() => setAttendanceLoading(false));
    const interval = setInterval(() => fetchAttendance(selectedRoom.id), REFRESH_MS);
    return () => clearInterval(interval);
  }, [step, selectedRoom, fetchAttendance]);

  async function handleCheckout(recordId: string, action: "checkout" | "undo") {
    setActing(recordId);
    await fetch(`/api/kiosk/volunteer/${churchId}/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recordId, action }),
    });
    if (selectedRoom) await fetchAttendance(selectedRoom.id);
    setActing(null);
  }

  // ── PIN STEP ──────────────────────────────────────────────────────────────────
  if (step === "pin") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="mb-3"><Logo /></div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Volunteer Check-In Access</h1>
            <p className="text-sm text-gray-500">{churchName}</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <label className="block text-sm font-semibold text-gray-700 mb-2 text-center">
              Enter Today&apos;s PIN
            </label>
            <input
              type="number"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              value={entered}
              onChange={e => {
                setPinError(false);
                setEntered(e.target.value.replace(/\D/g, "").slice(0, 4));
              }}
              onKeyDown={e => { if (e.key === "Enter") handlePinSubmit(); }}
              placeholder="• • • •"
              className="w-full text-center text-3xl font-mono tracking-widest px-4 py-4 border-2 rounded-xl outline-none transition-colors mb-4"
              style={{
                borderColor: pinError ? "#ef4444" : entered.length === 4 ? ACCENT : "#e5e7eb",
                color: "#1f2937",
              }}
              autoFocus
            />
            {pinError && (
              <p className="text-sm text-red-500 text-center mb-4 font-medium">
                Incorrect PIN. Please try again.
              </p>
            )}
            <button
              onClick={handlePinSubmit}
              disabled={entered.length !== 4 || verifying}
              className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-opacity disabled:opacity-40"
              style={{ backgroundColor: ACCENT }}
            >
              {verifying ? "Checking…" : "Enter"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── ROOM SELECTION STEP ───────────────────────────────────────────────────────
  if (step === "rooms") {
    return (
      <div className="min-h-screen bg-gray-50">
        <div
          className="px-6 py-6"
          style={{ background: `linear-gradient(135deg, #c2570a 0%, ${ACCENT} 100%)` }}
        >
          <div className="flex items-center gap-2 mb-1 opacity-80">
            <svg width="18" height="18" viewBox="0 0 36 36" fill="none" aria-hidden="true">
              <rect width="36" height="36" rx="8" fill="rgba(255,255,255,0.25)" />
              <path d="M18 8 L18 28 M12 14 Q18 8 24 14" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
            <span className="text-white text-xs font-semibold">ShepherdWell</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-0.5">Select Your Room</h1>
          <p className="text-orange-100 text-sm">{churchName}</p>
        </div>

        <div className="px-4 py-6 max-w-2xl mx-auto">
          {roomsLoading ? (
            <div className="text-center py-16 text-gray-400">Loading rooms…</div>
          ) : rooms.length === 0 ? (
            <div className="bg-white rounded-2xl shadow p-12 text-center border border-gray-100">
              <div className="text-4xl mb-3">🏠</div>
              <p className="text-gray-500 font-medium">No active rooms found.</p>
              <p className="text-gray-400 text-sm mt-1">Ask your administrator to add rooms in Check-In Setup.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {rooms.map(room => (
                <button
                  key={room.id}
                  onClick={() => { setSelectedRoom(room); setRecords([]); setStep("attendance"); }}
                  className="bg-white rounded-2xl shadow border border-gray-100 p-6 text-left hover:border-orange-300 hover:shadow-md transition-all"
                >
                  <div className="text-3xl mb-3">🏠</div>
                  <h3 className="text-lg font-bold text-gray-900 mb-0.5">{room.name}</h3>
                  {ageLabel(room) && <p className="text-sm text-gray-500">{ageLabel(room)}</p>}
                  {room.capacity && <p className="text-xs text-gray-400 mt-1">Capacity: {room.capacity}</p>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── ATTENDANCE STEP ───────────────────────────────────────────────────────────
  const checkedIn = records.filter(r => !r.checked_out_at).length;
  const checkedOut = records.filter(r => r.checked_out_at).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div
        className="px-6 py-5"
        style={{ background: `linear-gradient(135deg, #c2570a 0%, ${ACCENT} 100%)` }}
      >
        <button
          onClick={() => { setStep("rooms"); setRecords([]); setSelectedRoom(null); }}
          className="text-orange-200 text-xs mb-2 hover:text-white transition-colors block"
        >
          ← All Rooms
        </button>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white">{selectedRoom?.name}</h1>
            <p className="text-orange-100 text-sm">{churchName}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="flex gap-4 justify-end">
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{checkedIn}</p>
                <p className="text-xs text-orange-100">Checked In</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-white opacity-60">{checkedOut}</p>
                <p className="text-xs text-orange-100 opacity-60">Checked Out</p>
              </div>
            </div>
            {lastRefresh && (
              <p className="text-xs text-orange-200 mt-1">Updated {fmtTime(lastRefresh.toISOString())}</p>
            )}
          </div>
        </div>
      </div>

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
              const isOut = !!record.checked_out_at;
              const hasAllergies = record.allergies.length > 0 || !!record.allergy_other;
              const isActing = acting === record.id;

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
                          style={{
                            backgroundColor: isOut ? "#f3f4f6" : "#dcfce7",
                            color: isOut ? "#6b7280" : "#16a34a",
                          }}
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
                    </div>

                    <div className="flex-shrink-0 pt-1">
                      <button
                        onClick={() => handleCheckout(record.id, isOut ? "undo" : "checkout")}
                        disabled={isActing}
                        className="px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-opacity disabled:opacity-50 min-w-[140px] text-center"
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
    </div>
  );
}
