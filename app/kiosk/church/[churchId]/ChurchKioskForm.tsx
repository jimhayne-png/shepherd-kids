"use client";

import { useState } from "react";

type Session = { id: string; service_name: string; date: string; session_group: string | null };
type Group = { name: string; sessions: Session[] };
type Room = { id: string; name: string };

type DisplayGroup = { name: string; sessions: Session[]; isNamed: boolean };

type Props = {
  churchId: string;
  churchName: string;
  groups: Group[];
  ungrouped: Session[];
  rooms: Room[];
};

type Step = "pick-group" | "pick-sessions" | "form" | "success";

const BG = "#1a2e1a";
const CARD = "#22432200";
const GREEN = "#4ade80";

const inputCls =
  "w-full text-xl px-5 py-4 rounded-2xl bg-white/10 border border-green-800 text-white placeholder-green-700 focus:outline-none focus:border-green-400";

export default function ChurchKioskForm({
  churchId,
  churchName,
  groups,
  ungrouped,
  rooms,
}: Props) {
  const displayGroups: DisplayGroup[] = [
    ...groups.map((g) => ({ ...g, isNamed: true })),
    ...ungrouped.map((s) => ({ name: s.service_name, sessions: [s], isNamed: false })),
  ];

  function initialStep(): Step {
    if (displayGroups.length === 1 && displayGroups[0].sessions.length === 1) return "form";
    if (displayGroups.length === 1) return "pick-sessions";
    return "pick-group";
  }

  function initialGroupIdx(): number {
    return displayGroups.length === 1 ? 0 : -1;
  }

  function initialSessionIds(): Set<string> {
    if (displayGroups.length === 1) {
      return new Set(displayGroups[0].sessions.map((s) => s.id));
    }
    return new Set<string>();
  }

  const [step, setStep] = useState<Step>(initialStep);
  const [selectedGroupIdx, setSelectedGroupIdx] = useState<number>(initialGroupIdx);
  const [selectedSessionIds, setSelectedSessionIds] = useState<Set<string>>(initialSessionIds);
  const [form, setForm] = useState({
    parentName: "",
    parentPhone: "",
    childName: "",
    childAge: "",
    roomId: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    securityCode: string;
    checkedIntoCount: number;
  } | null>(null);

  const currentGroup =
    selectedGroupIdx >= 0 ? displayGroups[selectedGroupIdx] : null;

  function selectGroup(idx: number) {
    const g = displayGroups[idx];
    setSelectedGroupIdx(idx);
    const ids = new Set(g.sessions.map((s) => s.id));
    setSelectedSessionIds(ids);
    setStep(g.sessions.length > 1 ? "pick-sessions" : "form");
  }

  function toggleSession(id: string) {
    setSelectedSessionIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function submit() {
    if (
      !form.parentName.trim() ||
      !form.parentPhone.trim() ||
      !form.childName.trim()
    ) {
      setError("Please fill in Parent Name, Phone Number, and Child Name.");
      return;
    }
    if (selectedSessionIds.size === 0) {
      setError("Please select at least one service.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/kiosk/church/${churchId}/check-in`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parentName: form.parentName,
          parentPhone: form.parentPhone,
          childName: form.childName,
          childAge: form.childAge ? parseInt(form.childAge, 10) : undefined,
          roomId: form.roomId || undefined,
          sessionIds: [...selectedSessionIds],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Check-in failed. Please try again.");
        setSubmitting(false);
        return;
      }
      setResult(data);
      setStep("success");
    } catch {
      setError("Network error. Please try again.");
    }
    setSubmitting(false);
  }

  function reset() {
    setStep(initialStep());
    setSelectedGroupIdx(initialGroupIdx());
    setSelectedSessionIds(initialSessionIds());
    setForm({ parentName: "", parentPhone: "", childName: "", childAge: "", roomId: "" });
    setError("");
    setResult(null);
    setSubmitting(false);
  }

  // ── Success screen ────────────────────────────────────────────────────────
  if (step === "success" && result) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-8"
        style={{ backgroundColor: BG }}
      >
        <div className="w-full max-w-md text-center">
          <div className="text-6xl mb-6">✅</div>
          <h1
            className="text-3xl font-bold text-white mb-2"
            style={{ fontFamily: "Georgia, serif" }}
          >
            Checked In!
          </h1>
          <p className="text-green-300 mb-8">
            Registered for {result.checkedIntoCount} service
            {result.checkedIntoCount !== 1 ? "s" : ""}
          </p>

          <div
            className="rounded-3xl p-8 mb-8"
            style={{ backgroundColor: "#0d1f0d", border: "2px solid #4ade80" }}
          >
            <p className="text-green-400 text-sm font-bold uppercase tracking-widest mb-3">
              Security Code
            </p>
            <p
              className="font-bold text-white tracking-widest"
              style={{ fontSize: "4.5rem", lineHeight: 1, fontFamily: "monospace" }}
            >
              {result.securityCode}
            </p>
            <p className="text-green-600 text-sm mt-4">
              Show this code to pick up your child
            </p>
          </div>

          <button
            onClick={reset}
            className="w-full py-4 rounded-2xl text-lg font-bold"
            style={{ backgroundColor: GREEN, color: BG }}
          >
            Check In Another Child
          </button>
        </div>
      </div>
    );
  }

  // ── Pick group screen ─────────────────────────────────────────────────────
  if (step === "pick-group") {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-8"
        style={{ backgroundColor: BG }}
      >
        <div className="w-full max-w-lg">
          <div className="text-center mb-10">
            <p className="text-green-400 text-sm font-semibold uppercase tracking-widest mb-2">
              {churchName || "Children's Ministry"}
            </p>
            <h1
              className="text-4xl font-bold text-white"
              style={{ fontFamily: "Georgia, serif" }}
            >
              Check-In
            </h1>
            <p className="text-green-600 mt-2">Select your service</p>
          </div>

          <div className="space-y-4">
            {displayGroups.map((g, idx) => (
              <button
                key={idx}
                onClick={() => selectGroup(idx)}
                className="w-full text-left rounded-3xl p-6 transition-all hover:scale-[1.02]"
                style={{
                  backgroundColor: "#0d1f0d",
                  border: "2px solid #2d5a2d",
                }}
              >
                <p
                  className="font-bold text-white text-xl"
                  style={{ fontFamily: "Georgia, serif" }}
                >
                  {g.name}
                </p>
                {g.sessions.length > 1 && (
                  <p className="text-green-500 text-sm mt-1">
                    {g.sessions.length} services · {g.sessions.map((s) => s.service_name).join(", ")}
                  </p>
                )}
                <p className="text-green-700 text-xs mt-2">Tap to select →</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Pick sessions screen ──────────────────────────────────────────────────
  if (step === "pick-sessions" && currentGroup) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-8"
        style={{ backgroundColor: BG }}
      >
        <div className="w-full max-w-lg">
          <div className="text-center mb-10">
            <p className="text-green-400 text-sm font-semibold uppercase tracking-widest mb-2">
              {currentGroup.name}
            </p>
            <h1
              className="text-3xl font-bold text-white"
              style={{ fontFamily: "Georgia, serif" }}
            >
              Which services today?
            </h1>
            <p className="text-green-600 mt-2 text-sm">
              All services are pre-selected. Uncheck any you&apos;re not attending.
            </p>
          </div>

          <div className="space-y-3 mb-8">
            {currentGroup.sessions.map((s) => {
              const checked = selectedSessionIds.has(s.id);
              return (
                <button
                  key={s.id}
                  onClick={() => toggleSession(s.id)}
                  className="w-full text-left rounded-2xl p-5 flex items-center gap-4 transition-all"
                  style={{
                    backgroundColor: checked ? "#1a4d1a" : "#0d1f0d",
                    border: `2px solid ${checked ? GREEN : "#2d5a2d"}`,
                  }}
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold"
                    style={{
                      backgroundColor: checked ? GREEN : "transparent",
                      border: `2px solid ${checked ? GREEN : "#4b7a4b"}`,
                      color: BG,
                    }}
                  >
                    {checked ? "✓" : ""}
                  </div>
                  <p className="font-semibold text-white text-lg">{s.service_name}</p>
                </button>
              );
            })}
          </div>

          <button
            onClick={() => {
              if (selectedSessionIds.size === 0) {
                setError("Please select at least one service.");
                return;
              }
              setError("");
              setStep("form");
            }}
            disabled={selectedSessionIds.size === 0}
            className="w-full py-4 rounded-2xl text-xl font-bold"
            style={{
              backgroundColor: selectedSessionIds.size > 0 ? GREEN : "#2d5a2d",
              color: BG,
            }}
          >
            Continue →
          </button>
          {error && <p className="text-red-400 text-sm text-center mt-3">{error}</p>}

          {displayGroups.length > 1 && (
            <button
              onClick={() => {
                setStep("pick-group");
                setError("");
              }}
              className="w-full mt-4 py-3 rounded-2xl text-sm font-medium text-green-600"
            >
              ← Back to services
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Check-in form ─────────────────────────────────────────────────────────
  const checkedIntoSessions = currentGroup
    ? currentGroup.sessions.filter((s) => selectedSessionIds.has(s.id))
    : [];

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-8"
      style={{ backgroundColor: BG }}
    >
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <p className="text-green-400 text-sm font-semibold uppercase tracking-widest mb-2">
            {churchName || "Children's Ministry"}
          </p>
          <h1
            className="text-3xl font-bold text-white"
            style={{ fontFamily: "Georgia, serif" }}
          >
            Check In
          </h1>
          {checkedIntoSessions.length > 0 && (
            <p className="text-green-500 text-sm mt-2">
              {checkedIntoSessions.map((s) => s.service_name).join(" + ")}
            </p>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-green-400 text-xs font-bold uppercase tracking-widest mb-2">
              Parent Name *
            </label>
            <input
              type="text"
              value={form.parentName}
              onChange={(e) => setForm((f) => ({ ...f, parentName: e.target.value }))}
              placeholder="First and Last Name"
              className={inputCls}
              autoComplete="name"
            />
          </div>

          <div>
            <label className="block text-green-400 text-xs font-bold uppercase tracking-widest mb-2">
              Phone Number *
            </label>
            <input
              type="tel"
              value={form.parentPhone}
              onChange={(e) => setForm((f) => ({ ...f, parentPhone: e.target.value }))}
              placeholder="(555) 555-5555"
              className={inputCls}
              autoComplete="tel"
            />
          </div>

          <div>
            <label className="block text-green-400 text-xs font-bold uppercase tracking-widest mb-2">
              Child&apos;s Name *
            </label>
            <input
              type="text"
              value={form.childName}
              onChange={(e) => setForm((f) => ({ ...f, childName: e.target.value }))}
              placeholder="First and Last Name"
              className={inputCls}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-green-400 text-xs font-bold uppercase tracking-widest mb-2">
                Child&apos;s Age
              </label>
              <input
                type="number"
                min={0}
                max={18}
                value={form.childAge}
                onChange={(e) => setForm((f) => ({ ...f, childAge: e.target.value }))}
                placeholder="Age"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-green-400 text-xs font-bold uppercase tracking-widest mb-2">
                Room
              </label>
              <select
                value={form.roomId}
                onChange={(e) => setForm((f) => ({ ...f, roomId: e.target.value }))}
                className={inputCls}
                style={{ appearance: "none" }}
              >
                <option value="">Select room</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id} style={{ backgroundColor: "#1a2e1a" }}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {error && (
          <p className="text-red-400 text-sm text-center mt-4">{error}</p>
        )}

        <button
          onClick={submit}
          disabled={submitting}
          className="w-full mt-8 py-5 rounded-2xl text-xl font-bold transition-opacity"
          style={{
            backgroundColor: GREEN,
            color: BG,
            opacity: submitting ? 0.7 : 1,
          }}
        >
          {submitting ? "Checking In…" : "Check In →"}
        </button>

        {(displayGroups.length > 1 ||
          (currentGroup && currentGroup.sessions.length > 1)) && (
          <button
            onClick={() => {
              setStep(currentGroup && currentGroup.sessions.length > 1 ? "pick-sessions" : "pick-group");
              setError("");
            }}
            className="w-full mt-4 py-3 rounded-2xl text-sm font-medium text-green-600"
          >
            ← Back
          </button>
        )}
      </div>
    </div>
  );
}
