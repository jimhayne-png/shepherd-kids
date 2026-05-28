"use client";

import { useCallback, useEffect, useState } from "react";

const ACCENT = "#F28C28";
const REFRESH_MS = 30_000;

type CheckinRecord = {
  id: string;
  child_name: string;
  parent_name: string;
  parent_phone: string;
  room_id: string | null;
  room_name: string | null;
  security_code: string;
  is_new_visitor: boolean;
  allergies: string[];
  allergy_other: string | null;
  authorized_pickups: string | null;
  checked_in_at: string;
  checked_out_at: string | null;
  checked_out_by: string | null;
};

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default function RoomAttendanceView({
  sessionId,
  serviceName,
  date,
}: {
  sessionId: string;
  serviceName: string;
  date: string;
}) {
  const [records, setRecords] = useState<CheckinRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchRecords = useCallback(async () => {
    const res = await fetch(`/api/kiosk/room/${sessionId}/attendance`);
    if (res.ok) {
      const d = await res.json();
      setRecords(d.records ?? []);
      setLastRefresh(new Date());
    }
    setLoading(false);
  }, [sessionId]);

  useEffect(() => {
    fetchRecords();
    const interval = setInterval(fetchRecords, REFRESH_MS);
    return () => clearInterval(interval);
  }, [fetchRecords]);

  async function handleCheckout(record: CheckinRecord, action: "checkout" | "undo") {
    setActing(record.id);
    await fetch(`/api/kiosk/room/${sessionId}/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recordId: record.id, action }),
    });
    await fetchRecords();
    setActing(null);
  }

  // Group by room_name
  const grouped: { roomName: string; records: CheckinRecord[] }[] = [];
  const roomOrder: string[] = [];
  for (const r of records) {
    const key = r.room_name ?? "Unassigned";
    if (!roomOrder.includes(key)) roomOrder.push(key);
  }
  for (const roomName of roomOrder) {
    grouped.push({ roomName, records: records.filter(r => (r.room_name ?? "Unassigned") === roomName) });
  }

  const checkedIn = records.filter(r => !r.checked_out_at).length;
  const checkedOut = records.filter(r => r.checked_out_at).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="px-6 py-5 flex items-center justify-between" style={{ background: `linear-gradient(135deg, #c2570a 0%, ${ACCENT} 100%)` }}>
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <svg width="20" height="20" viewBox="0 0 36 36" fill="none" aria-hidden="true">
              <rect width="36" height="36" rx="8" fill="rgba(255,255,255,0.2)" />
              <path d="M18 8 L18 28 M12 14 Q18 8 24 14" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
            <span className="text-white font-bold text-sm opacity-90">Volunteer View</span>
          </div>
          <h1 className="text-xl font-bold text-white">{serviceName}</h1>
          <p className="text-orange-100 text-sm">{fmtDate(date)}</p>
        </div>
        <div className="text-right">
          <div className="flex gap-3">
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
            <p className="text-xs text-orange-200 mt-1">
              Updated {fmtTime(lastRefresh.toISOString())}
            </p>
          )}
        </div>
      </div>

      <div className="px-4 py-6 max-w-4xl mx-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-gray-400 text-lg">Loading attendance…</p>
          </div>
        ) : records.length === 0 ? (
          <div className="bg-white rounded-2xl shadow p-16 text-center border border-gray-100">
            <div className="text-5xl mb-4">🧒</div>
            <p className="text-gray-500 font-semibold">No children checked in yet.</p>
            <p className="text-gray-400 text-sm mt-1">This view refreshes automatically every 30 seconds.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {grouped.map(({ roomName, records: roomRecords }) => (
              <div key={roomName}>
                {/* Room header */}
                <div className="flex items-center gap-3 mb-3">
                  <h2 className="text-base font-bold text-gray-700">🏠 {roomName}</h2>
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-orange-100 text-orange-700">
                    {roomRecords.filter(r => !r.checked_out_at).length} in
                  </span>
                  {roomRecords.some(r => r.checked_out_at) && (
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-gray-100 text-gray-500">
                      {roomRecords.filter(r => r.checked_out_at).length} out
                    </span>
                  )}
                </div>

                <div className="space-y-3">
                  {roomRecords.map(record => {
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
                          {/* Left: child info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-2">
                              <h3 className="text-lg font-bold text-gray-900">{record.child_name}</h3>
                              {record.is_new_visitor && (
                                <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-blue-100 text-blue-700">New Visitor</span>
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

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm text-gray-600 mb-3">
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

                          {/* Right: action button */}
                          <div className="flex-shrink-0 pt-1">
                            <button
                              onClick={() => handleCheckout(record, isOut ? "undo" : "checkout")}
                              disabled={isActing}
                              className="px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-opacity disabled:opacity-50 min-w-[130px] text-center"
                              style={{ backgroundColor: isOut ? "#6b7280" : ACCENT }}
                            >
                              {isActing
                                ? "…"
                                : isOut
                                ? "Undo Checkout"
                                : "Mark Checked Out"}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
