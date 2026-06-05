"use client";

import React, { useState } from "react";

type Session = { id: string; service_name: string; date: string; session_group: string | null };
type Group = { name: string; sessions: Session[] };
type Room = { id: string; name: string };
type DisplayGroup = { name: string; sessions: Session[]; isNamed: boolean };

type Step = "pick-group" | "pick-sessions" | "welcome" | "parent" | "children" | "review" | "success";

type ChildForm = {
  childId?: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  roomId: string;
  allergies: string[];
  allergyOther: string;
  specialInstructions: string;
  authorizedPickups: string;
};

type ImmediateLabel = {
  labelType: "child" | "parent";
  childName: string;
  parentName: string;
  parentPhone: string | null;
  roomName: string | null;
  securityCode: string;
  allergies: string | null;
  medicalNotes: string | null;
  specialInstructions: string | null;
  visitNumber: number | null;
};

type Props = {
  churchId: string;
  churchName: string;
  groups: Group[];
  ungrouped: Session[];
  rooms: Room[];
};

const BG = "#1a2e1a";
const CARD = "#0d1f0d";
const GREEN = "#4ade80";

const ALLERGY_OPTIONS = [
  "No Known Allergies",
  "Peanuts",
  "Tree Nuts",
  "Dairy",
  "Eggs",
  "Soy",
  "Wheat / Gluten",
  "Shellfish",
  "Bee Stings",
  "Medication Allergy",
  "Asthma",
  "EpiPen Required",
  "Other",
] as const;

const inputCls =
  "w-full text-xl px-5 py-4 rounded-2xl bg-white/10 border border-green-800 text-white placeholder-green-700 focus:outline-none focus:border-green-400";
const labelCls = "block text-green-400 text-xs font-bold uppercase tracking-widest mb-2";

function emptyChild(): ChildForm {
  return {
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    roomId: "",
    allergies: [],
    allergyOther: "",
    specialInstructions: "",
    authorizedPickups: "",
  };
}

export default function ChurchKioskForm({ churchId, churchName, groups, ungrouped, rooms }: Props) {
  const displayGroups: DisplayGroup[] = [
    ...groups.map((g) => ({ ...g, isNamed: true })),
    ...ungrouped.map((s) => ({ name: s.service_name, sessions: [s], isNamed: false })),
  ];

  function initialStep(): Step {
    if (displayGroups.length === 1 && displayGroups[0].sessions.length === 1) return "welcome";
    if (displayGroups.length === 1) return "pick-sessions";
    return "pick-group";
  }
  function initialGroupIdx(): number {
    return displayGroups.length === 1 ? 0 : -1;
  }
  function initialSessionIds(): Set<string> {
    if (displayGroups.length === 1) return new Set(displayGroups[0].sessions.map((s) => s.id));
    return new Set<string>();
  }

  const [step, setStep] = useState<Step>(initialStep);
  const [selectedGroupIdx, setSelectedGroupIdx] = useState<number>(initialGroupIdx);
  const [selectedSessionIds, setSelectedSessionIds] = useState<Set<string>>(initialSessionIds);

  const [welcomePhone, setWelcomePhone] = useState("");
  const [parentFirstName, setParentFirstName] = useState("");
  const [parentLastName, setParentLastName] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [returning, setReturning] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);

  const [children, setChildren] = useState<ChildForm[]>([emptyChild()]);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [securityCode, setSecurityCode] = useState<string | null>(null);
  const [resultChildren, setResultChildren] = useState<Array<{ name: string; room: string | null }>>([]);
  const [labels, setLabels] = useState<ImmediateLabel[]>([]);

  const currentGroup = selectedGroupIdx >= 0 ? displayGroups[selectedGroupIdx] : null;
  const roomMap = Object.fromEntries(rooms.map((r) => [r.id, r.name]));

  function selectGroup(idx: number) {
    const g = displayGroups[idx];
    setSelectedGroupIdx(idx);
    setSelectedSessionIds(new Set(g.sessions.map((s) => s.id)));
    setStep(g.sessions.length > 1 ? "pick-sessions" : "welcome");
  }

  function toggleSession(id: string) {
    setSelectedSessionIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleGetStarted() {
    const digits = welcomePhone.replace(/\D/g, "");
    if (digits.length < 7) return;
    setLookingUp(true);
    try {
      const res = await fetch(`/api/kiosk/church/${churchId}/lookup?phone=${digits}`);
      if (res.ok) {
        const data = await res.json();
        if (data.found && data.children?.length > 0) {
          setReturning(true);
          setParentFirstName(data.parentFirstName ?? "");
          setParentLastName(data.parentLastName ?? "");
          setParentPhone(data.parentPhone ?? welcomePhone);
          setChildren(
            (data.children as { id?: string; name: string; dateOfBirth: string | null }[]).map((c) => {
              const parts = c.name.trim().split(/\s+/);
              return {
                ...emptyChild(),
                childId: c.id,
                firstName: parts[0] ?? "",
                lastName: parts.slice(1).join(" "),
                dateOfBirth: c.dateOfBirth ?? "",
              };
            }),
          );
          setLookingUp(false);
          setStep("children");
          return;
        }
      }
    } catch {
      // lookup failure is non-blocking
    }
    setReturning(false);
    setParentPhone(welcomePhone);
    setLookingUp(false);
    setStep("parent");
  }

  function handleParentContinue() {
    if (!parentFirstName.trim() || !parentLastName.trim() || parentPhone.replace(/\D/g, "").length < 7) return;
    setStep("children");
  }

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch(`/api/kiosk/church/${churchId}/check-in`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parentFirstName: parentFirstName.trim(),
          parentLastName: parentLastName.trim(),
          parentPhone: parentPhone.trim(),
          parentEmail: parentEmail.trim() || undefined,
          sessionIds: [...selectedSessionIds],
          children: children.map((c) => ({
            childId: c.childId || undefined,
            firstName: c.firstName.trim(),
            lastName: c.lastName.trim(),
            dateOfBirth: c.dateOfBirth || undefined,
            roomId: c.roomId || undefined,
            allergies: c.allergies,
            allergyOther: c.allergyOther || undefined,
            specialInstructions: c.specialInstructions.trim() || undefined,
            authorizedPickups: c.authorizedPickups.trim() || undefined,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error ?? "Check-in failed. Please try again.");
        setSubmitting(false);
        return;
      }
      setSecurityCode(data.securityCode);
      setLabels(data.labels ?? []);
      setResultChildren(
        children.map((c) => ({
          name: `${c.firstName.trim()} ${c.lastName.trim()}`,
          room: c.roomId ? (roomMap[c.roomId] ?? null) : null,
        })),
      );
      setStep("success");
    } catch {
      setSubmitError("Network error. Please try again.");
    }
    setSubmitting(false);
  }

  function reset() {
    setStep(initialStep());
    setSelectedGroupIdx(initialGroupIdx());
    setSelectedSessionIds(initialSessionIds());
    setWelcomePhone("");
    setParentFirstName("");
    setParentLastName("");
    setParentPhone("");
    setParentEmail("");
    setReturning(false);
    setChildren([emptyChild()]);
    setSubmitError("");
    setSecurityCode(null);
    setResultChildren([]);
    setLabels([]);
  }

  // ── pick-group ────────────────────────────────────────────────────────────

  if (step === "pick-group") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8" style={{ backgroundColor: BG }}>
        <div className="w-full max-w-lg">
          <div className="text-center mb-10">
            <p className="text-green-400 text-sm font-semibold uppercase tracking-widest mb-2">
              {churchName || "Children's Ministry"}
            </p>
            <h1 className="text-4xl font-bold text-white" style={{ fontFamily: "Georgia, serif" }}>
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
                style={{ backgroundColor: CARD, border: "2px solid #2d5a2d" }}
              >
                <p className="font-bold text-white text-xl" style={{ fontFamily: "Georgia, serif" }}>
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

  // ── pick-sessions ─────────────────────────────────────────────────────────

  if (step === "pick-sessions" && currentGroup) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8" style={{ backgroundColor: BG }}>
        <div className="w-full max-w-lg">
          <div className="text-center mb-10">
            <p className="text-green-400 text-sm font-semibold uppercase tracking-widest mb-2">
              {currentGroup.name}
            </p>
            <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "Georgia, serif" }}>
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
                    backgroundColor: checked ? "#1a4d1a" : CARD,
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
            onClick={() => { if (selectedSessionIds.size > 0) setStep("welcome"); }}
            disabled={selectedSessionIds.size === 0}
            className="w-full py-4 rounded-2xl text-xl font-bold"
            style={{ backgroundColor: selectedSessionIds.size > 0 ? GREEN : "#2d5a2d", color: BG }}
          >
            Continue →
          </button>
          {displayGroups.length > 1 && (
            <button
              onClick={() => setStep("pick-group")}
              className="w-full mt-4 py-3 rounded-2xl text-sm font-medium text-green-600"
            >
              ← Back to services
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── welcome ───────────────────────────────────────────────────────────────

  if (step === "welcome") {
    const canStart = welcomePhone.replace(/\D/g, "").length >= 7;
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8" style={{ backgroundColor: BG }}>
        <div className="w-full max-w-lg text-center">
          <div className="text-6xl mb-6">⛪</div>
          <p className="text-green-400 text-sm font-semibold uppercase tracking-widest mb-3">
            {churchName || "Children's Ministry"}
          </p>
          <h1 className="text-4xl font-bold text-white mb-6" style={{ fontFamily: "Georgia, serif" }}>
            Welcome!
          </h1>
          <div
            className="rounded-3xl p-6 mb-8 text-left"
            style={{ backgroundColor: CARD, border: "1px solid #2d5a2d" }}
          >
            <p className="text-green-300 text-base leading-relaxed">
              Your privacy matters to us. We collect your information only to ensure your child&apos;s
              safety and will never sell or share it with third parties.
            </p>
          </div>
          <div className="mb-6 text-left">
            <label className={labelCls}>Phone Number</label>
            <input
              type="tel"
              value={welcomePhone}
              onChange={(e) => setWelcomePhone(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && canStart && !lookingUp) handleGetStarted(); }}
              placeholder="(555) 555-5555"
              className={inputCls}
              autoComplete="tel"
              autoFocus
            />
          </div>
          <button
            onClick={handleGetStarted}
            disabled={!canStart || lookingUp}
            className="w-full py-5 rounded-2xl text-xl font-bold transition-opacity"
            style={{ backgroundColor: GREEN, color: BG, opacity: !canStart || lookingUp ? 0.5 : 1 }}
          >
            {lookingUp ? "Looking up…" : "Get Started →"}
          </button>
          {(displayGroups.length > 1 || (currentGroup && currentGroup.sessions.length > 1)) && (
            <button
              onClick={() =>
                setStep(currentGroup && currentGroup.sessions.length > 1 ? "pick-sessions" : "pick-group")
              }
              className="w-full mt-4 py-3 rounded-2xl text-sm font-medium text-green-600"
            >
              ← Back
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── parent ────────────────────────────────────────────────────────────────

  if (step === "parent") {
    const canContinue =
      !!(parentFirstName.trim() && parentLastName.trim() && parentPhone.replace(/\D/g, "").length >= 7);
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8" style={{ backgroundColor: BG }}>
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <p className="text-green-400 text-sm font-semibold uppercase tracking-widest mb-2">
              {churchName || "Children's Ministry"}
            </p>
            <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "Georgia, serif" }}>
              Parent Information
            </h1>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>First Name *</label>
                <input
                  type="text"
                  value={parentFirstName}
                  onChange={(e) => setParentFirstName(e.target.value)}
                  placeholder="Jane"
                  className={inputCls}
                  autoFocus
                  autoComplete="given-name"
                />
              </div>
              <div>
                <label className={labelCls}>Last Name *</label>
                <input
                  type="text"
                  value={parentLastName}
                  onChange={(e) => setParentLastName(e.target.value)}
                  placeholder="Smith"
                  className={inputCls}
                  autoComplete="family-name"
                />
              </div>
            </div>
            <div>
              <label className={labelCls}>Phone Number *</label>
              <input
                type="tel"
                value={parentPhone}
                onChange={(e) => setParentPhone(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && canContinue) handleParentContinue(); }}
                placeholder="(555) 555-5555"
                className={inputCls}
                autoComplete="tel"
              />
            </div>
            <div>
              <label className={labelCls}>Email (optional)</label>
              <input
                type="email"
                value={parentEmail}
                onChange={(e) => setParentEmail(e.target.value)}
                placeholder="jane@example.com"
                className={inputCls}
                autoComplete="email"
              />
            </div>
          </div>
          <button
            onClick={handleParentContinue}
            disabled={!canContinue}
            className="w-full mt-8 py-5 rounded-2xl text-xl font-bold transition-opacity"
            style={{ backgroundColor: GREEN, color: BG, opacity: !canContinue ? 0.5 : 1 }}
          >
            Continue →
          </button>
          <button
            onClick={() => setStep("welcome")}
            className="w-full mt-4 py-3 rounded-2xl text-sm font-medium text-green-600"
          >
            ← Back
          </button>
        </div>
      </div>
    );
  }

  // ── children ──────────────────────────────────────────────────────────────

  if (step === "children") {
    const canContinue = children.every((c) => c.firstName.trim() && c.lastName.trim() && c.dateOfBirth);
    return (
      <div className="min-h-screen" style={{ backgroundColor: BG }}>
        <div className="flex flex-col items-center p-6">
          <div className="w-full max-w-lg">
            {returning && (
              <div
                className="rounded-2xl p-4 mb-6"
                style={{ backgroundColor: "#1a4d1a", border: "1px solid #4ade80" }}
              >
                <p className="text-green-300 font-semibold text-center">
                  Welcome back, {parentFirstName}! We pre-filled your children&apos;s information.
                </p>
              </div>
            )}
            <div className="text-center mb-6">
              <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "Georgia, serif" }}>
                Children
              </h1>
              <p className="text-green-600 mt-1 text-sm">Add each child checking in today</p>
            </div>
            {children.map((child, i) => (
              <ChildCard
                key={i}
                index={i}
                child={child}
                rooms={rooms}
                showRemove={children.length > 1}
                onChange={(updated) => setChildren((cs) => cs.map((c, j) => (j === i ? updated : c)))}
                onRemove={() => setChildren((cs) => cs.filter((_, j) => j !== i))}
              />
            ))}
            <button
              onClick={() => setChildren((cs) => [...cs, emptyChild()])}
              className="w-full py-4 rounded-2xl text-lg font-bold mb-6"
              style={{ backgroundColor: "transparent", border: "2px dashed #2d5a2d", color: GREEN }}
            >
              + Add Another Child
            </button>
            <button
              onClick={() => setStep("review")}
              disabled={!canContinue}
              className="w-full py-5 rounded-2xl text-xl font-bold transition-opacity"
              style={{ backgroundColor: GREEN, color: BG, opacity: canContinue ? 1 : 0.4 }}
            >
              Continue →
            </button>
            <button
              onClick={() => setStep(returning ? "welcome" : "parent")}
              className="w-full mt-4 py-3 rounded-2xl text-sm font-medium text-green-600"
            >
              ← Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── review ────────────────────────────────────────────────────────────────

  if (step === "review") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8" style={{ backgroundColor: BG }}>
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "Georgia, serif" }}>
              Review &amp; Confirm
            </h1>
          </div>
          <div className="rounded-2xl p-5 mb-4" style={{ backgroundColor: CARD, border: "1px solid #2d5a2d" }}>
            <p className={labelCls}>Parent</p>
            <p className="text-white text-lg font-bold">
              {parentFirstName} {parentLastName}
            </p>
            <p className="text-green-500 text-sm">{parentPhone}</p>
            {parentEmail && <p className="text-green-600 text-sm">{parentEmail}</p>}
          </div>
          {children.map((child, i) => (
            <div key={i} className="rounded-2xl p-5 mb-4" style={{ backgroundColor: CARD, border: "1px solid #2d5a2d" }}>
              <p className={labelCls}>Child {i + 1}</p>
              <p className="text-white text-lg font-bold">
                {child.firstName} {child.lastName}
              </p>
              {child.dateOfBirth && <p className="text-green-500 text-sm">DOB: {child.dateOfBirth}</p>}
              {child.roomId && <p className="text-green-500 text-sm">Room: {roomMap[child.roomId] ?? child.roomId}</p>}
              {child.allergies.length > 0 && (
                <p className="text-red-400 text-sm mt-1">
                  ⚠️ Allergies: {[...child.allergies, child.allergyOther].filter(Boolean).join(", ")}
                </p>
              )}
              {child.specialInstructions && (
                <p className="text-green-600 text-sm mt-1">Notes: {child.specialInstructions}</p>
              )}
              {child.authorizedPickups && (
                <p className="text-green-600 text-sm mt-1">Authorized pickups: {child.authorizedPickups}</p>
              )}
            </div>
          ))}
          {submitError && <p className="text-red-400 text-sm text-center mb-4">{submitError}</p>}
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-5 rounded-2xl text-xl font-bold transition-opacity"
            style={{ backgroundColor: GREEN, color: BG, opacity: submitting ? 0.7 : 1 }}
          >
            {submitting ? "Checking In…" : "Confirm Check-In →"}
          </button>
          <button
            onClick={() => setStep("children")}
            className="w-full mt-4 py-3 rounded-2xl text-sm font-medium text-green-600"
          >
            ← Edit Children
          </button>
        </div>
      </div>
    );
  }

  // ── success ───────────────────────────────────────────────────────────────

  if (step === "success" && securityCode) {
    return (
      <>
        <style>{`
          @page { size: 4in 2in; margin: 0; }
          @media print {
            * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .no-print { display: none !important; }
            .print-only { display: block !important; }
          }
          .print-only { display: none; }
        `}</style>

        {/* Screen UI */}
        <div className="no-print min-h-screen flex flex-col items-center justify-center p-8" style={{ backgroundColor: BG }}>
          <div className="w-full max-w-md text-center">
            <div className="text-6xl mb-6">✅</div>
            <h1 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: "Georgia, serif" }}>
              Checked In!
            </h1>
            <p className="text-green-400 text-sm mb-6">Your security code is:</p>
            <div
              className="rounded-3xl p-8 mb-6"
              style={{ backgroundColor: CARD, border: "2px solid #4ade80" }}
            >
              <p
                className="font-bold text-white tracking-widest"
                style={{ fontSize: "4.5rem", lineHeight: 1, fontFamily: "monospace" }}
              >
                {securityCode}
              </p>
              <p className="text-green-500 text-sm mt-4">
                You will need this code to pick up your child
              </p>
            </div>
            {resultChildren.length > 0 && (
              <div className="mb-6 space-y-2">
                {resultChildren.map((c, i) => (
                  <div key={i} className="rounded-2xl px-4 py-3" style={{ backgroundColor: CARD }}>
                    <p className="text-white font-semibold">{c.name}</p>
                    {c.room && <p className="text-green-500 text-sm">Room: {c.room}</p>}
                  </div>
                ))}
              </div>
            )}
            {labels.length > 0 && (
              <button
                onClick={() => window.print()}
                className="w-full py-4 rounded-2xl text-lg font-bold mb-4"
                style={{ backgroundColor: "#fff", color: "#000" }}
              >
                🖨️ Print Labels
              </button>
            )}
            <button
              onClick={reset}
              className="w-full py-4 rounded-2xl text-lg font-bold"
              style={{ backgroundColor: GREEN, color: BG }}
            >
              Check In Another Family
            </button>
          </div>
        </div>

        {/* Print-only label area */}
        <div className="print-only">
          {labels.map((label, i) =>
            label.labelType === "parent" ? (
              <KioskParentLabel key={i} label={label} />
            ) : (
              <KioskChildLabel key={i} label={label} />
            ),
          )}
        </div>
      </>
    );
  }

  return null;
}

// ── Label components ──────────────────────────────────────────────────────────

const LABEL_STYLE: React.CSSProperties = {
  width: "4in",
  height: "2in",
  boxSizing: "border-box",
  overflow: "hidden",
  padding: "0.12in 0.15in",
  pageBreakAfter: "always",
  breakAfter: "page",
  fontFamily: "Arial, Helvetica, sans-serif",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
};

function KioskChildLabel({ label }: { label: ImmediateLabel }) {
  return (
    <div style={LABEL_STYLE}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            backgroundColor: "#000",
            color: "#fff",
            padding: "1px 6px",
            borderRadius: 3,
          }}
        >
          Child Check-In
        </span>
        {label.roomName && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              border: "1.5px solid #000",
              padding: "1px 8px",
              borderRadius: 3,
            }}
          >
            {label.roomName}
          </span>
        )}
      </div>
      <div style={{ fontSize: 26, fontWeight: 900, lineHeight: 1.1, margin: "4px 0 0" }}>
        {label.childName}
      </div>
      <div style={{ fontSize: 11, color: "#333", marginTop: 2 }}>
        Parent: {label.parentName}
        {label.parentPhone ? ` · ${label.parentPhone}` : ""}
      </div>
      {(label.allergies || label.medicalNotes || label.specialInstructions) && (
        <div style={{ marginTop: 4 }}>
          {label.allergies && (
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "#fff",
                backgroundColor: "#dc2626",
                padding: "2px 6px",
                borderRadius: 3,
                display: "inline-block",
                marginBottom: 2,
              }}
            >
              ⚠ ALLERGY: {label.allergies}
            </div>
          )}
          {label.medicalNotes && (
            <div style={{ fontSize: 10, color: "#333" }}>
              <strong>Medical:</strong> {label.medicalNotes}
            </div>
          )}
          {label.specialInstructions && (
            <div style={{ fontSize: 10, color: "#333" }}>
              <strong>Instr:</strong> {label.specialInstructions}
            </div>
          )}
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "flex-end", marginTop: "auto" }}>
        <div>
          <div style={{ fontSize: 9, textAlign: "right", color: "#555", marginBottom: 1 }}>PICKUP CODE</div>
          <div
            style={{
              fontSize: 28,
              fontWeight: 900,
              fontFamily: "monospace",
              letterSpacing: "0.18em",
              lineHeight: 1,
            }}
          >
            {label.securityCode}
          </div>
        </div>
      </div>
    </div>
  );
}

function KioskParentLabel({ label }: { label: ImmediateLabel }) {
  return (
    <div style={LABEL_STYLE}>
      <div
        style={{
          backgroundColor: "#000",
          color: "#fff",
          fontSize: 11,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          padding: "2px 8px",
          alignSelf: "flex-start",
          borderRadius: 3,
        }}
      >
        👪 Parent Pickup
      </div>
      <div style={{ fontSize: 22, fontWeight: 900, lineHeight: 1.1, marginTop: 6 }}>
        {label.parentName}
      </div>
      <div style={{ fontSize: 12, color: "#333", marginTop: 4 }}>
        {label.childName}
      </div>
      <div style={{ marginTop: "auto", borderTop: "1.5px solid #000", paddingTop: 6 }}>
        <div style={{ fontSize: 9, color: "#555", marginBottom: 2 }}>SECURITY CODE — REQUIRED FOR PICKUP</div>
        <div
          style={{
            fontSize: 40,
            fontWeight: 900,
            fontFamily: "monospace",
            letterSpacing: "0.2em",
            lineHeight: 1,
          }}
        >
          {label.securityCode}
        </div>
      </div>
    </div>
  );
}

// ── ChildCard ─────────────────────────────────────────────────────────────────

function ChildCard({
  index,
  child,
  rooms,
  showRemove,
  onChange,
  onRemove,
}: {
  index: number;
  child: ChildForm;
  rooms: Room[];
  showRemove: boolean;
  onChange: (c: ChildForm) => void;
  onRemove: () => void;
}) {
  function toggleAllergy(opt: string) {
    const isSelected = child.allergies.includes(opt);
    let next: string[];
    if (opt === "No Known Allergies") {
      next = isSelected ? [] : ["No Known Allergies"];
    } else {
      next = isSelected
        ? child.allergies.filter((a) => a !== opt)
        : [...child.allergies.filter((a) => a !== "No Known Allergies"), opt];
    }
    onChange({
      ...child,
      allergies: next,
      allergyOther: isSelected && opt === "Other" ? "" : child.allergyOther,
    });
  }

  return (
    <div className="rounded-2xl p-5 mb-4" style={{ backgroundColor: CARD, border: "1px solid #2d5a2d" }}>
      <div className="flex justify-between items-center mb-4">
        <p className="text-green-400 text-xs font-bold uppercase tracking-widest">Child {index + 1}</p>
        {showRemove && (
          <button onClick={onRemove} className="text-red-400 text-sm font-bold">
            Remove
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className={labelCls}>First Name *</label>
          <input
            type="text"
            value={child.firstName}
            onChange={(e) => onChange({ ...child, firstName: e.target.value })}
            placeholder="First"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Last Name *</label>
          <input
            type="text"
            value={child.lastName}
            onChange={(e) => onChange({ ...child, lastName: e.target.value })}
            placeholder="Last"
            className={inputCls}
          />
        </div>
      </div>

      <div className={`grid gap-3 mb-4 ${rooms.length > 0 ? "grid-cols-2" : "grid-cols-1"}`}>
        <div>
          <label className={labelCls}>Date of Birth *</label>
          <input
            type="date"
            value={child.dateOfBirth}
            max={new Date().toISOString().slice(0, 10)}
            min="2000-01-01"
            onChange={(e) => onChange({ ...child, dateOfBirth: e.target.value })}
            required
            className={inputCls}
            style={{ colorScheme: "dark" }}
          />
        </div>
        {rooms.length > 0 && (
          <div>
            <label className={labelCls}>Room</label>
            <select
              value={child.roomId}
              onChange={(e) => onChange({ ...child, roomId: e.target.value })}
              className={inputCls}
              style={{ appearance: "none" }}
            >
              <option value="" style={{ backgroundColor: BG }}>Select room</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id} style={{ backgroundColor: BG }}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="mb-4">
        <label className={labelCls}>Allergies</label>
        <div className="grid grid-cols-2 gap-2 mb-2">
          {ALLERGY_OPTIONS.map((opt) => {
            const selected = child.allergies.includes(opt);
            return (
              <button
                key={opt}
                type="button"
                onClick={() => toggleAllergy(opt)}
                className="text-left rounded-xl px-3 py-2 text-sm font-semibold transition-colors"
                style={{
                  backgroundColor: selected ? "#1a4d1a" : "rgba(255,255,255,0.05)",
                  border: `1.5px solid ${selected ? GREEN : "#2d5a2d"}`,
                  color: selected ? GREEN : "#6b9b6b",
                }}
              >
                {selected ? "✓ " : ""}{opt}
              </button>
            );
          })}
        </div>
        {child.allergies.includes("Other") && (
          <input
            type="text"
            value={child.allergyOther}
            onChange={(e) => onChange({ ...child, allergyOther: e.target.value })}
            placeholder="Describe allergy"
            className={inputCls}
            style={{ fontSize: "1rem", padding: "12px 20px" }}
          />
        )}
      </div>

      <div className="mb-4">
        <label className={labelCls}>Special Instructions / Medical Notes (optional)</label>
        <textarea
          value={child.specialInstructions}
          onChange={(e) => onChange({ ...child, specialInstructions: e.target.value })}
          placeholder="e.g. carries EpiPen, bathroom reminder every hour"
          rows={2}
          className="w-full px-5 py-4 rounded-2xl bg-white/10 border border-green-800 text-white placeholder-green-700 focus:outline-none focus:border-green-400 resize-none text-base"
        />
      </div>

      <div>
        <label className={labelCls}>Authorized Pickups (optional)</label>
        <input
          type="text"
          value={child.authorizedPickups}
          onChange={(e) => onChange({ ...child, authorizedPickups: e.target.value })}
          placeholder="e.g. John Smith, Mary Jones"
          className={inputCls}
          style={{ fontSize: "1rem" }}
        />
        <p className="text-green-700 text-xs mt-1">Comma-separated names</p>
      </div>
    </div>
  );
}
