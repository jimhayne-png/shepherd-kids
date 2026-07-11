"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import AppShell, { type NavItem } from "@/components/layout/AppShell";
import { selectedChurchHeaders } from "@/lib/selected-church";
import type { JourneyFamily, JourneyTouch } from "@/app/api/children-ministry/visitor-journey/route";

const supabase = createClient();

// ── Constants ─────────────────────────────────────────────────────────────────

const BG        = "#08060D";
const CARD      = "#120A1F";
const MUTED     = "#A9A9B8";
const BODY      = "#D8D8E8";
const GOLD      = "#D4AF37";
const PURPLE    = "#7B2CBF";
const PURPLE2   = "#9D4EDD";

const METHOD_OPTIONS = [
  { value: "email",            label: "Email Sent" },
  { value: "phone_call",       label: "Phone Call Made" },
  { value: "handwritten_card", label: "Handwritten Card Sent" },
  { value: "in_person",        label: "In-Person Conversation" },
  { value: "no_follow_up",     label: "No Follow-Up Needed" },
] as const;

const METHOD_EMOJI: Record<string, string> = {
  email:            "📧",
  phone_call:       "📞",
  handwritten_card: "✉️",
  in_person:        "🤝",
  no_follow_up:     "🚫",
};

function methodLabel(method: string): string {
  return METHOD_OPTIONS.find((o) => o.value === method)?.label ?? method;
}

// ── Nav (required by AppShell) ────────────────────────────────────────────────

const navItems: NavItem[] = [];

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ── Timeline ──────────────────────────────────────────────────────────────────

type TimelineEvent = {
  date: string;
  label: string;
  emoji: string;
  sub?: string;
};

function buildTimeline(family: JourneyFamily): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  if (family.follow_up_sent_at) {
    events.push({ date: family.follow_up_sent_at, label: "Welcome Email Sent", emoji: "📧" });
  } else if (family.follow_up_sent) {
    events.push({ date: family.first_visit_date, label: "Welcome Email Sent", emoji: "📧" });
  }

  if (family.next_day_sent_at) {
    events.push({ date: family.next_day_sent_at, label: "Next-Day Message Sent", emoji: "📬" });
  }

  for (const t of family.journey_touches) {
    events.push({
      date: t.completed_at,
      label: methodLabel(t.method),
      emoji: METHOD_EMOJI[t.method] ?? "✓",
      sub: `by ${t.completed_by}`,
    });
  }

  if (family.return_date) {
    events.push({
      date: family.return_date,
      label: `Returned${family.days_to_return != null ? ` (${family.days_to_return} days later)` : ""}`,
      emoji: "🏠",
    });
  }

  return events.sort((a, b) => a.date.localeCompare(b.date));
}

// ── FamilyCard ────────────────────────────────────────────────────────────────

function FamilyCard({
  family,
  onCompleteFollowUp,
}: {
  family: JourneyFamily;
  onCompleteFollowUp: (familyId: string) => void;
}) {
  const timeline = buildTimeline(family);
  const sentiment =
    family.status === "returned"
      ? "We're so glad you joined us again."
      : "We missed seeing you this week.";

  const hasTouch = family.journey_touches.length > 0;

  return (
    <div
      style={{
        background: CARD,
        border: `1px solid rgba(212,175,55,0.2)`,
        borderRadius: 16,
        padding: "20px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 700, color: "#fff", fontSize: 15, margin: "0 0 2px" }}>
            {family.primary_parent}
          </p>
          {family.children.length > 0 && (
            <p style={{ color: MUTED, fontSize: 12, margin: "0 0 4px" }}>
              {family.children.join(", ")}
            </p>
          )}
          <p style={{ color: MUTED, fontSize: 12, margin: 0 }}>
            First visit: {formatDate(family.first_visit_date)}
            {" · "}
            {family.days_since_visit === 1
              ? "1 day ago"
              : `${family.days_since_visit} days ago`}
          </p>
        </div>

        {/* Status badge */}
        {family.status === "returned" && (
          <div
            style={{
              flexShrink: 0,
              padding: "4px 12px",
              borderRadius: 20,
              background: "rgba(16,185,129,0.15)",
              border: "1px solid rgba(16,185,129,0.35)",
              fontSize: 11,
              fontWeight: 700,
              color: "#34d399",
              whiteSpace: "nowrap",
            }}
          >
            Returned {family.return_date ? formatShortDate(family.return_date) : ""}
          </div>
        )}
        {family.status === "waiting" && (
          <div
            style={{
              flexShrink: 0,
              padding: "4px 12px",
              borderRadius: 20,
              background: "rgba(245,158,11,0.15)",
              border: "1px solid rgba(245,158,11,0.35)",
              fontSize: 11,
              fontWeight: 700,
              color: "#fbbf24",
              whiteSpace: "nowrap",
            }}
          >
            Waiting
          </div>
        )}
        {family.status === "inactive" && (
          <div
            style={{
              flexShrink: 0,
              padding: "4px 12px",
              borderRadius: 20,
              background: "rgba(107,114,128,0.2)",
              border: "1px solid rgba(107,114,128,0.35)",
              fontSize: 11,
              fontWeight: 700,
              color: MUTED,
              whiteSpace: "nowrap",
            }}
          >
            Inactive
          </div>
        )}
      </div>

      {/* Contact info */}
      {(family.primary_email || family.primary_phone) && (
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {family.primary_email && (
            <a
              href={`mailto:${family.primary_email}`}
              style={{ fontSize: 12, color: GOLD, textDecoration: "none" }}
            >
              {family.primary_email}
            </a>
          )}
          {family.primary_phone && (
            <span style={{ fontSize: 12, color: MUTED }}>{family.primary_phone}</span>
          )}
        </div>
      )}

      {/* Timeline */}
      {timeline.length > 0 && (
        <div
          style={{
            borderLeft: `2px solid rgba(212,175,55,0.2)`,
            paddingLeft: 14,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {timeline.map((ev, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
              <span style={{ fontSize: 13, flexShrink: 0 }}>{ev.emoji}</span>
              <div>
                <span style={{ fontSize: 12, color: BODY, fontWeight: 600 }}>{ev.label}</span>
                {ev.sub && (
                  <span style={{ fontSize: 11, color: MUTED, marginLeft: 6 }}>{ev.sub}</span>
                )}
                <span style={{ fontSize: 11, color: MUTED, marginLeft: 8 }}>
                  {formatShortDate(ev.date)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Ministry sentiment + action */}
      <div
        style={{
          borderTop: "1px solid rgba(255,255,255,0.06)",
          paddingTop: 14,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <p style={{ fontSize: 12, color: MUTED, margin: 0, fontStyle: "italic", flex: 1 }}>
          {hasTouch ? `Last follow-up: ${methodLabel(family.journey_touches[family.journey_touches.length - 1].method)}` : sentiment}
        </p>
        <button
          type="button"
          onClick={() => onCompleteFollowUp(family.id)}
          style={{
            flexShrink: 0,
            padding: "7px 16px",
            borderRadius: 8,
            background: hasTouch
              ? "rgba(123,44,191,0.2)"
              : `linear-gradient(135deg, ${PURPLE}, ${PURPLE2})`,
            border: hasTouch ? `1px solid rgba(123,44,191,0.4)` : "none",
            color: "#fff",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {hasTouch ? "Additional Follow-Up" : "Complete Follow-Up"}
        </button>
      </div>
    </div>
  );
}

// ── Dialog ────────────────────────────────────────────────────────────────────

function CompleteFollowUpDialog({
  family,
  onClose,
  onSubmit,
  submitting,
}: {
  family: JourneyFamily;
  onClose: () => void;
  onSubmit: (method: string) => void;
  submitting: boolean;
}) {
  const [selected, setSelected] = useState<string>("email");
  const sentiment =
    family.status === "returned"
      ? "We're so glad you joined us again."
      : "We missed seeing you this week.";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.65)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: CARD,
          border: `1px solid rgba(212,175,55,0.25)`,
          borderRadius: 16,
          padding: 28,
          width: "100%",
          maxWidth: 420,
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <p style={{ fontWeight: 700, color: "#fff", fontSize: 16, margin: "0 0 4px" }}>
            Complete Follow-Up
          </p>
          <p style={{ color: MUTED, fontSize: 13, margin: 0 }}>
            {family.primary_parent} · <em>{sentiment}</em>
          </p>
        </div>

        <p style={{ color: BODY, fontSize: 13, margin: 0, fontWeight: 600 }}>
          How did you follow up?
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {METHOD_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 14px",
                borderRadius: 10,
                border: `1px solid ${selected === opt.value ? "rgba(123,44,191,0.6)" : "rgba(255,255,255,0.08)"}`,
                background: selected === opt.value ? "rgba(123,44,191,0.15)" : "transparent",
                cursor: "pointer",
              }}
            >
              <input
                type="radio"
                name="follow-up-method"
                value={opt.value}
                checked={selected === opt.value}
                onChange={() => setSelected(opt.value)}
                style={{ accentColor: PURPLE, width: 16, height: 16, flexShrink: 0 }}
              />
              <span style={{ fontSize: 13, color: selected === opt.value ? "#fff" : BODY }}>
                {METHOD_EMOJI[opt.value]} {opt.label}
              </span>
            </label>
          ))}
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "8px 20px",
              borderRadius: 8,
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.15)",
              color: MUTED,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSubmit(selected)}
            disabled={submitting}
            style={{
              padding: "8px 24px",
              borderRadius: 8,
              background: `linear-gradient(135deg, ${PURPLE}, ${PURPLE2})`,
              border: "none",
              color: "#fff",
              fontSize: 13,
              fontWeight: 700,
              cursor: submitting ? "not-allowed" : "pointer",
              opacity: submitting ? 0.6 : 1,
            }}
          >
            {submitting ? "Saving…" : "Complete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

type Tab = "waiting" | "returned" | "inactive";

export default function VisitorJourneyPage() {
  const [families,    setFamilies]    = useState<JourneyFamily[]>([]);
  const [counts,      setCounts]      = useState({ waiting: 0, returned: 0, inactive: 0 });
  const [tab,         setTab]         = useState<Tab>("waiting");
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [completing,  setCompleting]  = useState<string | null>(null);
  const [submitting,  setSubmitting]  = useState(false);
  const [userEmail,   setUserEmail]   = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/children-ministry/visitor-journey", {
        headers: { ...selectedChurchHeaders() },
      });
      if (!res.ok) throw new Error("Failed to load visitor journey data");
      const data = await res.json() as { families: JourneyFamily[]; counts: typeof counts };
      setFamilies(data.families);
      setCounts(data.counts);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    supabase.auth.getUser().then(({ data: { user } }) => setUserEmail(user?.email ?? null));
  }, [load]);

  async function handleSubmit(method: string) {
    if (!completing) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/children-ministry/visitor-journey", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...selectedChurchHeaders() },
        body: JSON.stringify({
          familyId: completing,
          method,
          completedBy: userEmail ?? "Staff",
        }),
      });
      if (!res.ok) throw new Error("Failed to record follow-up");
      const { touch } = await res.json() as { touch: JourneyTouch };
      // Optimistically update state
      setFamilies((prev) =>
        prev.map((f) =>
          f.id === completing
            ? { ...f, journey_touches: [...f.journey_touches, touch] }
            : f,
        ),
      );
      setCounts((prev) => ({ ...prev })); // trigger re-render for counts
    } catch {
      // Reload on error to get consistent state
      await load();
    } finally {
      setSubmitting(false);
      setCompleting(null);
    }
  }

  const displayed = families.filter((f) => f.status === tab);
  const completingFamily = families.find((f) => f.id === completing) ?? null;

  const TAB_CONFIG: { key: Tab; label: string; count: number }[] = [
    { key: "waiting",  label: "Waiting to Return", count: counts.waiting },
    { key: "returned", label: "Returned",           count: counts.returned },
    { key: "inactive", label: "Inactive Visitors",  count: counts.inactive },
  ];

  return (
    <AppShell navItems={navItems}>
      <div
        style={{
          padding: "40px 40px 0",
          background: `linear-gradient(135deg, ${BG} 0%, #1C0A30 100%)`,
        }}
      >
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: 28, fontWeight: 700, color: "#fff", margin: "0 0 4px" }}>
          Visitor Journey
        </h1>
        <p style={{ color: BODY, fontSize: 14, margin: 0 }}>
          Track whether first-time families return and guide the right follow-up action.
        </p>
      </div>

      <div style={{ padding: "28px 40px", backgroundColor: "#0A0814", minHeight: "100vh" }}>

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            gap: 2,
            background: "rgba(255,255,255,0.04)",
            borderRadius: 12,
            padding: 4,
            marginBottom: 28,
            maxWidth: 560,
          }}
        >
          {TAB_CONFIG.map(({ key, label, count }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              style={{
                flex: 1,
                padding: "8px 10px",
                borderRadius: 9,
                border: "none",
                background: tab === key ? "rgba(123,44,191,0.85)" : "transparent",
                color: tab === key ? "#fff" : MUTED,
                fontSize: 12,
                fontWeight: tab === key ? 700 : 400,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {label}
              {count > 0 && (
                <span
                  style={{
                    marginLeft: 6,
                    background: tab === key ? "rgba(255,255,255,0.25)" : "rgba(212,175,55,0.25)",
                    color: tab === key ? "#fff" : GOLD,
                    borderRadius: 10,
                    padding: "1px 7px",
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading && (
          <p style={{ color: MUTED, fontSize: 14 }}>Loading visitor journey data…</p>
        )}

        {error && !loading && (
          <p style={{ color: "#f87171", fontSize: 14 }}>{error}</p>
        )}

        {!loading && !error && displayed.length === 0 && (
          <div
            style={{
              background: CARD,
              border: "1px solid rgba(212,175,55,0.15)",
              borderRadius: 16,
              padding: "40px 24px",
              textAlign: "center",
            }}
          >
            <p style={{ fontSize: 32, marginBottom: 12 }}>
              {tab === "waiting" ? "🙏" : tab === "returned" ? "🎉" : "📁"}
            </p>
            <p style={{ color: "#fff", fontWeight: 700, fontSize: 15, margin: "0 0 6px" }}>
              {tab === "waiting" && "No families waiting to return"}
              {tab === "returned" && "No returned visitors yet"}
              {tab === "inactive" && "No inactive visitors"}
            </p>
            <p style={{ color: MUTED, fontSize: 13, margin: 0 }}>
              {tab === "waiting" && "Families appear here 7 days after their first visit if they haven't returned."}
              {tab === "returned" && "Families who attend a second service appear here automatically."}
              {tab === "inactive" && "Families who haven't returned in 6 weeks appear here."}
            </p>
          </div>
        )}

        {!loading && !error && displayed.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Context note for inactive tab */}
            {tab === "inactive" && (
              <div
                style={{
                  background: "rgba(107,114,128,0.1)",
                  border: "1px solid rgba(107,114,128,0.2)",
                  borderRadius: 10,
                  padding: "10px 16px",
                }}
              >
                <p style={{ color: MUTED, fontSize: 12, margin: 0 }}>
                  These families visited more than 6 weeks ago and have not returned. They remain searchable and contactable.
                </p>
              </div>
            )}

            {displayed.map((family) => (
              <FamilyCard
                key={family.id}
                family={family}
                onCompleteFollowUp={(id) => setCompleting(id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Complete Follow-Up Dialog */}
      {completing && completingFamily && (
        <CompleteFollowUpDialog
          family={completingFamily}
          onClose={() => setCompleting(null)}
          onSubmit={handleSubmit}
          submitting={submitting}
        />
      )}
    </AppShell>
  );
}
