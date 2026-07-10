"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AppShell, { type NavItem } from "@/components/layout/AppShell";
import { selectedChurchHeaders } from "@/lib/selected-church";

const supabase = createClient();

const ACCENT = "#7B2CBF";
const GOLD = "#D4AF37";
const MUTED = "#A9A9B8";
const CARD_BG = "#120A1F";
const BODY_BG = "#0A0814";
const TEXT = "#D8D8E8";

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "ShepherdKids", href: "#", isSection: true },
  { label: "💛 Ministry Care", href: "/dashboard/children-ministry" },
  { label: "✅ Live Check-In", href: "/dashboard/children-ministry/live-checkin" },
  { label: "🏷️ Label Printing", href: "/dashboard/children-ministry/print-station" },
  { label: "📊 Attendance Report", href: "/dashboard/children-ministry/attendance-report" },
  { label: "🧒 Children", href: "/dashboard/children-ministry/children" },
  { label: "👪 Parents", href: "/dashboard/children-ministry/parents" },
  { label: "📧 Parent Communication", href: "/dashboard/children-ministry/parent-update" },
  { label: "🌱 Faith Journey", href: "/dashboard/children-ministry/faith-journey" },
  { label: "🛡️ Family Safety Review", href: "/dashboard/children-ministry/family-safety-review" },
  { label: "🎉 Celebrations", href: "/dashboard/children-ministry/birthdays" },
  { label: "📜 Certificates", href: "/dashboard/children-ministry/certificates" },
  { label: "⚙️ Check-In Setup", href: "/dashboard/children-ministry/checkin-setup" },
  { label: "Account", href: "#", isSection: true },
  { label: "💳 Subscription & Billing", href: "/dashboard/billing" },
  { label: "⚙️ Settings", href: "/dashboard/settings" },
];

type ReviewStatus = "current" | "due_soon" | "due" | "overdue" | "needs_baseline";
type RequestStatus = "none" | "pending" | "opened" | "expired";

type ReviewFamily = {
  id: string;
  family_name: string;
  primary_parent: string;
  primary_email: string | null;
  registration_date: string | null;
  last_reviewed_at: string | null;
  next_due_date: string | null;
  days_until_due: number | null;
  days_past_due: number | null;
  status: ReviewStatus;
  request_status: RequestStatus;
  draft_requested_at: string | null;
  draft_expires_at: string | null;
  draft_opened_at: string | null;
};

type Counts = {
  current: number;
  due_soon: number;
  due: number;
  overdue: number;
  needs_baseline: number;
};

type FilterKey = "all" | "current" | "due_soon" | "due" | "overdue";

type HistoryReview = {
  id: string;
  requested_at: string | null;
  opened_at: string | null;
  completed_at: string | null;
  completed_by_name: string | null;
  had_changes: boolean | null;
  change_summary: {
    family?: Record<string, { changed: boolean }>;
    children?: { child_id: string; fields_changed: string[] }[];
  } | null;
};

const STATUS_LABEL: Record<ReviewStatus, string> = {
  current:        "Current",
  due_soon:       "Due Soon",
  due:            "Due",
  overdue:        "Overdue",
  needs_baseline: "Needs Setup",
};

const STATUS_COLOR: Record<ReviewStatus, string> = {
  current:        "#4ade80",
  due_soon:       "#D4AF37",
  due:            "#f97316",
  overdue:        "#f87171",
  needs_baseline: "#A9A9B8",
};

const REQUEST_LABEL: Record<RequestStatus, string> = {
  none:    "No Link",
  pending: "Link Generated",
  opened:  "Opened",
  expired: "Expired",
};

const REQUEST_COLOR: Record<RequestStatus, string> = {
  none:    "#A9A9B8",
  pending: "#60a5fa",
  opened:  "#D4AF37",
  expired: "#6b7280",
};

const FILTER_TABS: { key: FilterKey; label: string }[] = [
  { key: "all",      label: "All" },
  { key: "current",  label: "Current" },
  { key: "due_soon", label: "Due Soon" },
  { key: "due",      label: "Due" },
  { key: "overdue",  label: "Overdue" },
];

const SUMMARY_TILES = [
  { label: "Current",  filterKey: "current"  as FilterKey, countKey: "current"  as keyof Counts, color: "#4ade80" },
  { label: "Due Soon", filterKey: "due_soon" as FilterKey, countKey: "due_soon" as keyof Counts, color: "#D4AF37" },
  { label: "Due",      filterKey: "due"      as FilterKey, countKey: "due"      as keyof Counts, color: "#f97316" },
  { label: "Overdue",  filterKey: "overdue"  as FilterKey, countKey: "overdue"  as keyof Counts, color: "#f87171" },
];

function fmt(dateStr: string): string {
  const [y, m, d] = dateStr.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function fmtTs(ts: string | null): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function StatusBadge({ status }: { status: ReviewStatus }) {
  const color = STATUS_COLOR[status];
  return (
    <span style={{
      display: "inline-block", fontSize: 10, fontWeight: 700, padding: "2px 10px",
      borderRadius: 20, backgroundColor: `${color}22`, color,
      border: `1px solid ${color}55`, letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap",
    }}>
      {STATUS_LABEL[status]}
    </span>
  );
}

function RequestBadge({ status }: { status: RequestStatus }) {
  const color = REQUEST_COLOR[status];
  return (
    <span style={{
      display: "inline-block", fontSize: 10, fontWeight: 700, padding: "2px 10px",
      borderRadius: 20, backgroundColor: `${color}22`, color,
      border: `1px solid ${color}55`, letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap",
    }}>
      {REQUEST_LABEL[status]}
    </span>
  );
}

function changeSummaryLabel(review: HistoryReview): string {
  if (!review.had_changes) return "Confirmed — No Changes";
  const parts: string[] = [];
  const familyChanges = Object.entries(review.change_summary?.family ?? {})
    .filter(([, v]) => v.changed)
    .map(([k]) => k.replace(/_/g, " "));
  if (familyChanges.length) parts.push(`Family: ${familyChanges.join(", ")}`);
  const childChanges = (review.change_summary?.children ?? []).filter((c) => c.fields_changed.length > 0);
  if (childChanges.length) {
    parts.push(`Children: ${childChanges.flatMap((c) => c.fields_changed.map((f) => f.replace(/_/g, " "))).join(", ")}`);
  }
  return parts.length ? `Updated — ${parts.join(" | ")}` : "Updated";
}

export default function FamilySafetyReviewPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [families, setFamilies] = useState<ReviewFamily[]>([]);
  const [counts, setCounts] = useState<Counts>({ current: 0, due_soon: 0, due: 0, overdue: 0, needs_baseline: 0 });
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");

  // Per-family generated links in current session only (raw token is never stored server-side)
  const [generatedLinks, setGeneratedLinks] = useState<Map<string, { url: string; expiresAt: string }>>(new Map());
  const [generating, setGenerating] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState<string | null>(null);

  // History modal
  const [historyFamilyId, setHistoryFamilyId] = useState<string | null>(null);
  const [historyFamilyName, setHistoryFamilyName] = useState<string>("");
  const [historyReviews, setHistoryReviews] = useState<HistoryReview[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  const getSession = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  }, []);

  const load = useCallback(async (statusFilter: FilterKey, q: string) => {
    const session = await getSession();
    if (!session) return;

    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (q) params.set("search", q);

    const res = await fetch(
      `/api/children-ministry/family-safety-reviews${params.size ? "?" + params.toString() : ""}`,
      {
        credentials: "include",
        headers: { Authorization: `Bearer ${session.access_token}`, ...selectedChurchHeaders() },
      },
    );

    if (!res.ok) return;
    const data = await res.json();
    setFamilies(data.families ?? []);
    if (data.counts) setCounts(data.counts);
  }, [getSession]);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/"); return; }
      await load("all", "");
      setLoading(false);
    }
    init();
  }, [router, load]);

  function handleFilter(f: FilterKey) { setFilter(f); load(f, search); }
  function handleSearch(q: string) { setSearch(q); load(filter, q); }

  async function handleGenerateLink(fam: ReviewFamily) {
    const session = await getSession();
    if (!session) return;

    setGenerating((prev) => new Set(prev).add(fam.id));
    try {
      const res = await fetch(
        `/api/children-ministry/family-safety-reviews/${fam.id}/request`,
        {
          method: "POST",
          credentials: "include",
          headers: { Authorization: `Bearer ${session.access_token}`, ...selectedChurchHeaders() },
        },
      );
      if (!res.ok) return;
      const data = await res.json();
      setGeneratedLinks((prev) => new Map(prev).set(fam.id, { url: data.reviewUrl, expiresAt: data.expiresAt }));
      // Refresh the list to show updated request_status
      await load(filter, search);
    } finally {
      setGenerating((prev) => { const s = new Set(prev); s.delete(fam.id); return s; });
    }
  }

  async function handleCopy(familyId: string) {
    const link = generatedLinks.get(familyId);
    if (!link) return;
    await navigator.clipboard.writeText(link.url);
    setCopied(familyId);
    setTimeout(() => setCopied((c) => (c === familyId ? null : c)), 2000);
  }

  async function openHistory(fam: ReviewFamily) {
    setHistoryFamilyId(fam.id);
    setHistoryFamilyName(fam.family_name);
    setHistoryReviews([]);
    setHistoryLoading(true);

    const session = await getSession();
    if (!session) { setHistoryLoading(false); return; }

    const res = await fetch(
      `/api/children-ministry/family-safety-reviews/${fam.id}/history`,
      {
        credentials: "include",
        headers: { Authorization: `Bearer ${session.access_token}`, ...selectedChurchHeaders() },
      },
    );
    setHistoryLoading(false);
    if (!res.ok) return;
    const data = await res.json();
    setHistoryReviews(data.reviews ?? []);
  }

  function closeHistory() { setHistoryFamilyId(null); }

  // Close modal on outside click
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") closeHistory(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <AppShell navItems={NAV_ITEMS}>
      {/* Page header */}
      <div className="px-8 py-8" style={{ background: "linear-gradient(135deg, #08060D 0%, #1C0A30 100%)" }}>
        <p className="text-sm mb-1" style={{ color: GOLD }}>ShepherdKids</p>
        <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "Georgia, serif" }}>
          Annual Family Safety Review
        </h1>
        <p className="text-sm mt-2" style={{ color: TEXT, maxWidth: 600 }}>
          Help keep family contact, medical, allergy, and authorized pickup information accurate
          by asking each family to review their information once every year.
        </p>
      </div>

      <div className="px-8 py-8" style={{ backgroundColor: BODY_BG, minHeight: "100vh" }}>
        {loading ? (
          <div style={{ color: MUTED, textAlign: "center", paddingTop: 64 }}>Loading…</div>
        ) : (
          <>
            {/* Summary tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4" style={{ marginBottom: 28 }}>
              {SUMMARY_TILES.map((tile) => (
                <button
                  key={tile.label}
                  onClick={() => handleFilter(tile.filterKey)}
                  style={{
                    background: CARD_BG,
                    border: `1px solid ${filter === tile.filterKey ? tile.color : "rgba(212,175,55,0.2)"}`,
                    borderRadius: 14, padding: "20px 22px", textAlign: "left",
                    cursor: "pointer", transition: "border-color 0.15s",
                  }}
                >
                  <p style={{ fontSize: 34, fontWeight: 800, color: tile.color, margin: 0, lineHeight: 1 }}>
                    {counts[tile.countKey]}
                  </p>
                  <p style={{ fontSize: 11, fontWeight: 700, color: MUTED, margin: "7px 0 0", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                    {tile.label}
                  </p>
                </button>
              ))}
            </div>

            {/* Filter tabs + search */}
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 20, flexWrap: "wrap" }}>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {FILTER_TABS.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => handleFilter(tab.key)}
                    style={{
                      padding: "6px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                      border: "1px solid",
                      borderColor: filter === tab.key ? ACCENT : "rgba(212,175,55,0.22)",
                      background: filter === tab.key ? ACCENT : "transparent",
                      color: filter === tab.key ? "#fff" : TEXT,
                      cursor: "pointer",
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <input
                type="text"
                placeholder="Search families, parents, or email…"
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                style={{
                  flex: 1, minWidth: 220, padding: "7px 14px", borderRadius: 8, fontSize: 13,
                  background: CARD_BG, border: "1px solid rgba(212,175,55,0.22)", color: "#fff", outline: "none",
                }}
              />
            </div>

            {/* Family list */}
            {families.length === 0 ? (
              <div style={{ background: CARD_BG, border: "1px solid rgba(212,175,55,0.2)", borderRadius: 14, padding: "56px 32px", textAlign: "center" }}>
                <p style={{ color: MUTED, fontSize: 14 }}>
                  {search
                    ? "No families match your search."
                    : filter === "all"
                    ? "No families found."
                    : `No families with status "${STATUS_LABEL[filter as ReviewStatus] ?? filter}".`}
                </p>
              </div>
            ) : (
              <div style={{ background: CARD_BG, border: "1px solid rgba(212,175,55,0.2)", borderRadius: 14, overflow: "hidden" }}>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid rgba(212,175,55,0.15)" }}>
                        {["Family", "Primary Parent", "Email", "Last Reviewed", "Next Due", "Review Status", "Link Status", "Actions"].map((h) => (
                          <th key={h} style={{ padding: "11px 14px", textAlign: "left", fontSize: 10, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.08em", whiteSpace: "nowrap" }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {families.map((fam, idx) => {
                        const generated = generatedLinks.get(fam.id);
                        const isGenerating = generating.has(fam.id);
                        const wasCopied = copied === fam.id;

                        return (
                          <tr key={fam.id} style={{ borderTop: idx > 0 ? "1px solid rgba(212,175,55,0.08)" : "none" }}>
                            <td style={{ padding: "13px 14px", fontSize: 13, fontWeight: 700, color: "#fff", whiteSpace: "nowrap" }}>
                              {fam.family_name}
                            </td>
                            <td style={{ padding: "13px 14px", fontSize: 13, color: TEXT, whiteSpace: "nowrap" }}>
                              {fam.primary_parent}
                            </td>
                            <td style={{ padding: "13px 14px", fontSize: 12, color: MUTED, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {fam.primary_email ?? "—"}
                            </td>
                            <td style={{ padding: "13px 14px", fontSize: 12, color: MUTED, whiteSpace: "nowrap" }}>
                              {fam.last_reviewed_at ? fmt(fam.last_reviewed_at) : <span style={{ fontStyle: "italic" }}>Never</span>}
                            </td>
                            <td style={{ padding: "13px 14px", fontSize: 12, whiteSpace: "nowrap", color: fam.status === "overdue" ? "#f87171" : fam.status === "due" ? "#f97316" : TEXT }}>
                              {fam.next_due_date ? fmt(fam.next_due_date) : "—"}
                            </td>
                            <td style={{ padding: "13px 14px" }}>
                              <StatusBadge status={fam.status} />
                            </td>
                            <td style={{ padding: "13px 14px" }}>
                              <RequestBadge status={generated ? "pending" : fam.request_status} />
                            </td>
                            <td style={{ padding: "13px 14px" }}>
                              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                                {/* Generate / regenerate link */}
                                <button
                                  onClick={() => handleGenerateLink(fam)}
                                  disabled={isGenerating}
                                  style={{
                                    fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 6,
                                    border: `1px solid ${GOLD}44`, background: "transparent", color: GOLD,
                                    cursor: isGenerating ? "not-allowed" : "pointer", whiteSpace: "nowrap",
                                    opacity: isGenerating ? 0.6 : 1,
                                  }}
                                >
                                  {isGenerating ? "Generating…" : generated ? "New Link" : "Generate Link"}
                                </button>

                                {/* Copy link — only available when URL is in current session state */}
                                {generated && (
                                  <button
                                    onClick={() => handleCopy(fam.id)}
                                    style={{
                                      fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 6,
                                      border: `1px solid ${wasCopied ? "#4ade80" : "#60a5fa"}44`,
                                      background: wasCopied ? "#4ade8022" : "#60a5fa22",
                                      color: wasCopied ? "#4ade80" : "#60a5fa",
                                      cursor: "pointer", whiteSpace: "nowrap",
                                    }}
                                  >
                                    {wasCopied ? "Copied!" : "Copy Link"}
                                  </button>
                                )}

                                {/* History — shown when family has completed reviews */}
                                {fam.last_reviewed_at && (
                                  <button
                                    onClick={() => openHistory(fam)}
                                    style={{
                                      fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 6,
                                      border: "1px solid rgba(169,169,184,0.3)", background: "transparent",
                                      color: MUTED, cursor: "pointer", whiteSpace: "nowrap",
                                    }}
                                  >
                                    History
                                  </button>
                                )}

                                <a
                                  href={`/dashboard/children-ministry/parents/${fam.id}`}
                                  style={{ fontSize: 11, fontWeight: 600, color: GOLD, textDecoration: "none", whiteSpace: "nowrap" }}
                                >
                                  Open →
                                </a>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {counts.needs_baseline > 0 && (
              <p style={{ fontSize: 12, color: MUTED, marginTop: 14 }}>
                {counts.needs_baseline}{" "}
                {counts.needs_baseline === 1 ? "family" : "families"} could not be evaluated — missing registration date.
              </p>
            )}
          </>
        )}
      </div>

      {/* History modal */}
      {historyFamilyId && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1000, padding: 20,
          }}
          onClick={(e) => { if (e.target === e.currentTarget) closeHistory(); }}
        >
          <div
            ref={modalRef}
            style={{
              background: "#1A0A2E", border: "1px solid rgba(212,175,55,0.3)",
              borderRadius: 16, padding: "32px 28px",
              maxWidth: 580, width: "100%", maxHeight: "80vh", overflowY: "auto",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
              <div>
                <p style={{ fontSize: 11, color: GOLD, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 4px" }}>Review History</p>
                <h2 style={{ color: "#fff", fontSize: 20, fontWeight: 700, margin: 0, fontFamily: "Georgia, serif" }}>{historyFamilyName}</h2>
              </div>
              <button
                onClick={closeHistory}
                style={{ background: "transparent", border: "none", color: MUTED, fontSize: 20, cursor: "pointer", lineHeight: 1, padding: 4 }}
              >
                ✕
              </button>
            </div>

            {historyLoading ? (
              <p style={{ color: MUTED, textAlign: "center", padding: "24px 0" }}>Loading…</p>
            ) : historyReviews.length === 0 ? (
              <p style={{ color: MUTED, textAlign: "center", padding: "24px 0" }}>No completed reviews yet.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {historyReviews.map((rev) => (
                  <div
                    key={rev.id}
                    style={{
                      background: CARD_BG, border: "1px solid rgba(212,175,55,0.12)",
                      borderRadius: 12, padding: "16px 18px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <p style={{ color: "#fff", fontWeight: 700, fontSize: 14, margin: 0 }}>
                        {rev.completed_at ? fmtTs(rev.completed_at) : "—"}
                      </p>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
                        background: rev.had_changes ? "#f9731622" : "#4ade8022",
                        color: rev.had_changes ? "#f97316" : "#4ade80",
                        border: `1px solid ${rev.had_changes ? "#f9731655" : "#4ade8055"}`,
                        textTransform: "uppercase", letterSpacing: "0.06em",
                      }}>
                        {rev.had_changes ? "Updated" : "No Changes"}
                      </span>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 16px", marginBottom: rev.had_changes ? 10 : 0 }}>
                      <p style={{ fontSize: 11, color: MUTED, margin: 0 }}>
                        Submitted by: <span style={{ color: TEXT }}>{rev.completed_by_name ?? "—"}</span>
                      </p>
                      <p style={{ fontSize: 11, color: MUTED, margin: 0 }}>
                        Requested: <span style={{ color: TEXT }}>{fmtTs(rev.requested_at)}</span>
                      </p>
                      <p style={{ fontSize: 11, color: MUTED, margin: 0 }}>
                        Opened: <span style={{ color: TEXT }}>{fmtTs(rev.opened_at)}</span>
                      </p>
                    </div>

                    {rev.had_changes && (
                      <p style={{ fontSize: 11, color: MUTED, margin: 0, lineHeight: 1.5, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 8 }}>
                        {changeSummaryLabel(rev)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
