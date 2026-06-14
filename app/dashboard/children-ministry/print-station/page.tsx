"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AppShell from "@/components/layout/AppShell";
import QRCodeImage from "@/components/ui/QRCodeImage";

const supabase = createClient();
const ACCENT = "#7B2CBF";

type PrintJob = {
  id: string;
  church_id: string;
  session_id: string;
  checkin_record_id: string;
  child_name: string;
  parent_name: string;
  parent_phone: string | null;
  room_id: string | null;
  room_name: string | null;
  security_code: string;
  allergies: string | null;
  medical_notes: string | null;
  special_instructions: string | null;
  label_type: "child" | "parent";
  status: string;
  created_at: string;
  qr_token: string | null;
};

type JobGroup = {
  securityCode: string;
  parentName: string;
  parentPhone: string | null;
  jobs: PrintJob[];
};

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

const LABEL: React.CSSProperties = {
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

function ChildLabel({ job }: { job: PrintJob }) {
  return (
    <div style={LABEL}>
      {/* Top: type tag + room */}
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
        {job.room_name && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              border: "1.5px solid #000",
              padding: "1px 8px",
              borderRadius: 3,
            }}
          >
            {job.room_name}
          </span>
        )}
      </div>

      {/* Child name — large */}
      <div style={{ fontSize: 26, fontWeight: 900, lineHeight: 1.1, margin: "4px 0 0" }}>
        {job.child_name}
      </div>

      {/* Parent line */}
      <div style={{ fontSize: 11, color: "#333", marginTop: 2 }}>
        Parent: {job.parent_name}
        {job.parent_phone ? ` · ${job.parent_phone}` : ""}
      </div>

      {/* Allergy / medical */}
      {(job.allergies || job.medical_notes || job.special_instructions) && (
        <div style={{ marginTop: 4 }}>
          {job.allergies && (
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
              ⚠ ALLERGY: {job.allergies}
            </div>
          )}
          {job.medical_notes && (
            <div style={{ fontSize: 10, color: "#333" }}>
              <strong>Medical:</strong> {job.medical_notes}
            </div>
          )}
          {job.special_instructions && (
            <div style={{ fontSize: 10, color: "#333" }}>
              <strong>Instr:</strong> {job.special_instructions}
            </div>
          )}
        </div>
      )}

      {/* Bottom: QR left, security code right */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: "auto" }}>
        {job.qr_token ? (
          <QRCodeImage
            value={`${typeof window !== "undefined" ? window.location.origin : ""}/dashboard/children-ministry/scan/${job.qr_token}`}
            size={56}
          />
        ) : (
          <div />
        )}
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
            {job.security_code}
          </div>
        </div>
      </div>
    </div>
  );
}

function ParentLabel({ job }: { job: PrintJob }) {
  return (
    <div style={LABEL}>
      {/* Header */}
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

      {/* Parent name */}
      <div style={{ fontSize: 22, fontWeight: 900, lineHeight: 1.1, marginTop: 6 }}>
        {job.parent_name}
      </div>

      {/* Children names (stored in child_name for parent label) */}
      <div style={{ fontSize: 12, color: "#333", marginTop: 4 }}>
        {job.child_name}
      </div>

      {/* Security code — very large, bottom */}
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
          {job.security_code}
        </div>
      </div>
    </div>
  );
}

function PrintLabel({ job }: { job: PrintJob }) {
  return job.label_type === "parent" ? <ParentLabel job={job} /> : <ChildLabel job={job} />;
}

export default function PrintStationPage() {
  const router = useRouter();
  const selectedChurchIdRef = useRef<string | null>(null);

  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [markError, setMarkError] = useState("");
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const churchHeaders = useCallback((): Record<string, string> => {
    return selectedChurchIdRef.current
      ? { "x-selected-church-id": selectedChurchIdRef.current }
      : {};
  }, []);

  const fetchJobs = useCallback(async () => {
    const res = await fetch("/api/children-ministry/print-jobs", {
      credentials: "include",
      headers: churchHeaders(),
    });
    if (res.ok) {
      const d = await res.json();
      setJobs(d.jobs ?? []);
      setLastRefresh(new Date());
    }
    setLoading(false);
  }, [churchHeaders]);

  useEffect(() => {
    async function init() {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (!user || error) {
        router.push("/");
        return;
      }
      const churchRes = await fetch('/api/auth/church', {
        credentials: 'include',
        headers: churchHeaders(),
      });
      if (churchRes.ok) {
        const churchData = await churchRes.json();
        selectedChurchIdRef.current = churchData.churchId;
      }
      await fetchJobs();
    }
    init();
  }, [router, fetchJobs]);

  async function handleMarkPrinted() {
    if (selected.size === 0) return;
    setMarking(true);
    setMarkError("");
    const res = await fetch("/api/children-ministry/print-jobs", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", ...churchHeaders() },
      body: JSON.stringify({ ids: Array.from(selected) }),
    });
    setMarking(false);
    if (res.ok) {
      setSelected(new Set());
      await fetchJobs();
    } else {
      const d = await res.json();
      setMarkError(d.error ?? "Could not mark jobs as printed.");
    }
  }

  function handlePrintSelected() {
    if (selected.size === 0) return;
    window.print();
  }

  function toggleJob(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(jobs.map((j) => j.id)));
  }

  function clearAll() {
    setSelected(new Set());
  }

  const allSelected = jobs.length > 0 && selected.size === jobs.length;
  const selectedJobs = jobs.filter((j) => selected.has(j.id));

  // Group by security_code, preserving insertion order
  const groups: JobGroup[] = [];
  const seen = new Map<string, JobGroup>();
  for (const job of jobs) {
    if (!seen.has(job.security_code)) {
      const g: JobGroup = {
        securityCode: job.security_code,
        parentName: job.parent_name,
        parentPhone: job.parent_phone,
        jobs: [],
      };
      seen.set(job.security_code, g);
      groups.push(g);
    }
    seen.get(job.security_code)!.jobs.push(job);
  }

  return (
    <>
      {/* Print-only styles — @page sets each label to exactly 4in × 2in */}
      <style>{`
        @page {
          size: 4in 2in;
          margin: 0;
        }
        @media print {
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          .print-area { display: block !important; }
          body { margin: 0; padding: 0; }
        }
        @media screen {
          .print-area { display: none; }
        }
      `}</style>

      {/* Labels rendered only during window.print() */}
      <div className="print-area">
        {selectedJobs.map((job) => (
          <PrintLabel key={job.id} job={job} />
        ))}
      </div>

      {/* Dashboard screen UI */}
      <div className="no-print">
        <AppShell navItems={[]}>
          {/* Page header */}
          <div
            style={{
              background: "linear-gradient(135deg, #08060D 0%, #1C0A30 100%)",
              padding: "28px 32px",
            }}
          >
            <p style={{ color: "#D4AF37", fontSize: 13, marginBottom: 4 }}>
              ShepherdKids
            </p>
            <h1
              style={{
                color: "white",
                fontSize: 28,
                fontWeight: 700,
                fontFamily: "Georgia, serif",
                margin: 0,
              }}
            >
              Label Printing
            </h1>
            {lastRefresh && (
              <p style={{ color: "#86efac", fontSize: 12, marginTop: 4 }}>
                Queue last refreshed at {lastRefresh.toLocaleTimeString()}
              </p>
            )}
          </div>

          <div style={{ padding: "24px 32px", backgroundColor: "#0A0814", minHeight: "100vh" }}>
            {/* Toolbar */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 12,
                marginBottom: 24,
                alignItems: "center",
              }}
            >
              <button
                onClick={fetchJobs}
                style={btnStyle("#374151")}
              >
                ↻ Refresh Queue
              </button>
              <button
                onClick={allSelected ? clearAll : selectAll}
                disabled={jobs.length === 0}
                style={btnStyle("#6b7280", jobs.length === 0)}
              >
                {allSelected ? "Deselect All" : "Select All"}
              </button>
              <button
                onClick={handlePrintSelected}
                disabled={selected.size === 0}
                style={btnStyle(ACCENT, selected.size === 0)}
              >
                🖨️ Print Selected ({selected.size})
              </button>
              <button
                onClick={handleMarkPrinted}
                disabled={selected.size === 0 || marking}
                style={btnStyle("#16a34a", selected.size === 0 || marking)}
              >
                {marking ? "Marking…" : `✓ Mark Printed (${selected.size})`}
              </button>
            </div>

            {/* Print setup note */}
            <div
              style={{
                backgroundColor: "#fffbeb",
                border: "1px solid #fde68a",
                borderRadius: 10,
                padding: "10px 16px",
                marginBottom: 20,
                fontSize: 13,
                color: "#92400e",
                lineHeight: 1.5,
              }}
            >
              <strong>Printer setup:</strong> Select the <strong>Brother QL-820NWB</strong> in the print dialog.
              Set paper size to <strong>4in × 2in</strong> (DK label size). Disable headers and footers.
            </div>

            {markError && (
              <p style={{ color: "#dc2626", marginBottom: 16, fontSize: 14 }}>
                {markError}
              </p>
            )}

            {/* Queue */}
            {loading && (
              <div style={emptyCard}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
                <p style={{ color: "#6b7280", fontWeight: 600 }}>Loading print queue…</p>
              </div>
            )}

            {!loading && jobs.length === 0 && (
              <div style={emptyCard}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
                <p style={{ color: "#374151", fontWeight: 700, fontSize: 18 }}>
                  No pending labels
                </p>
                <p style={{ color: "#6b7280", fontSize: 14, marginTop: 4 }}>
                  Labels will appear here after families check in at the kiosk.
                </p>
              </div>
            )}

            {!loading && groups.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {groups.map((group) => {
                  const groupSelected = group.jobs.every((j) => selected.has(j.id));
                  const groupPartial = group.jobs.some((j) => selected.has(j.id));

                  return (
                    <div
                      key={group.securityCode}
                      style={{
                        backgroundColor: "#120A1F",
                        borderRadius: 16,
                        border: "1px solid rgba(212,175,55,0.28)",
                        overflow: "hidden",
                      }}
                    >
                      {/* Group header */}
                      <div
                        style={{
                          padding: "14px 20px",
                          backgroundColor: "#1a2e1a",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 16,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                          {/* Group select toggle */}
                          <button
                            type="button"
                            onClick={() => {
                              if (groupSelected) {
                                setSelected((prev) => {
                                  const next = new Set(prev);
                                  group.jobs.forEach((j) => next.delete(j.id));
                                  return next;
                                });
                              } else {
                                setSelected((prev) => {
                                  const next = new Set(prev);
                                  group.jobs.forEach((j) => next.add(j.id));
                                  return next;
                                });
                              }
                            }}
                            style={{
                              width: 26,
                              height: 26,
                              borderRadius: 6,
                              border: `2px solid ${groupSelected || groupPartial ? ACCENT : "#4b5563"}`,
                              backgroundColor: groupSelected ? ACCENT : groupPartial ? ACCENT + "44" : "transparent",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            {(groupSelected || groupPartial) && (
                              <span style={{ color: "white", fontSize: 13, fontWeight: 900 }}>
                                {groupSelected ? "✓" : "–"}
                              </span>
                            )}
                          </button>

                          <div>
                            <p style={{ color: "white", fontWeight: 700, margin: 0, fontSize: 15 }}>
                              {group.parentName}
                              {group.parentPhone ? (
                                <span style={{ fontWeight: 400, fontSize: 13, opacity: 0.7 }}>
                                  {" "}· {group.parentPhone}
                                </span>
                              ) : null}
                            </p>
                            <p style={{ color: "#86efac", fontSize: 12, margin: "2px 0 0" }}>
                              {group.jobs.length} label{group.jobs.length !== 1 ? "s" : ""}
                            </p>
                          </div>
                        </div>

                        {/* Security code badge */}
                        <div
                          style={{
                            backgroundColor: ACCENT,
                            borderRadius: 12,
                            padding: "6px 16px",
                            fontFamily: "monospace",
                            fontSize: 22,
                            fontWeight: 900,
                            color: "white",
                            letterSpacing: "0.15em",
                            flexShrink: 0,
                          }}
                        >
                          {group.securityCode}
                        </div>
                      </div>

                      {/* Job rows */}
                      <div>
                        {group.jobs.map((job, idx) => {
                          const isChecked = selected.has(job.id);
                          const isParent = job.label_type === "parent";
                          const hasAlert = !!job.allergies || !!job.medical_notes || !!job.special_instructions;

                          return (
                            <div
                              key={job.id}
                              onClick={() => toggleJob(job.id)}
                              style={{
                                padding: "16px 20px",
                                borderTop: idx > 0 ? "1px solid rgba(212,175,55,0.1)" : undefined,
                                backgroundColor: isChecked ? ACCENT + "33" : "rgba(255,255,255,0.02)",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "flex-start",
                                gap: 16,
                                transition: "background 0.1s",
                              }}
                            >
                              {/* Checkbox */}
                              <div
                                style={{
                                  width: 26,
                                  height: 26,
                                  borderRadius: 6,
                                  border: `2px solid ${isChecked ? ACCENT : "#d1d5db"}`,
                                  backgroundColor: isChecked ? ACCENT : "white",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  flexShrink: 0,
                                  marginTop: 2,
                                }}
                              >
                                {isChecked && (
                                  <span style={{ color: "white", fontSize: 14, fontWeight: 900 }}>
                                    ✓
                                  </span>
                                )}
                              </div>

                              {/* Label content */}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                                  <span
                                    style={{
                                      fontSize: 11,
                                      fontWeight: 700,
                                      textTransform: "uppercase",
                                      letterSpacing: 1,
                                      padding: "2px 8px",
                                      borderRadius: 6,
                                      backgroundColor: isParent ? "#e0f2fe" : "#fef9c3",
                                      color: isParent ? "#0369a1" : "#92400e",
                                    }}
                                  >
                                    {isParent ? "👪 Parent Pickup" : "🏷️ Child"}
                                  </span>
                                  <span style={{ fontSize: 18, fontWeight: 700, color: "#111827" }}>
                                    {job.child_name}
                                  </span>
                                  {job.room_name && !isParent && (
                                    <span
                                      style={{
                                        fontSize: 12,
                                        backgroundColor: "#f3f4f6",
                                        padding: "2px 10px",
                                        borderRadius: 20,
                                        color: "#374151",
                                        fontWeight: 600,
                                      }}
                                    >
                                      {job.room_name}
                                    </span>
                                  )}
                                </div>

                                {!isParent && (
                                  <p style={{ fontSize: 13, color: "#6b7280", margin: "4px 0 0" }}>
                                    Parent: {job.parent_name}
                                    {" · "}
                                    <span style={{ color: "#9ca3af" }}>
                                      {fmtTime(job.created_at)}
                                    </span>
                                  </p>
                                )}

                                {hasAlert && (
                                  <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                                    {job.allergies && (
                                      <span
                                        style={{
                                          display: "inline-block",
                                          fontSize: 12,
                                          fontWeight: 700,
                                          backgroundColor: "#dc2626",
                                          color: "white",
                                          padding: "2px 10px",
                                          borderRadius: 6,
                                        }}
                                      >
                                        ⚠️ {job.allergies}
                                      </span>
                                    )}
                                    {job.medical_notes && (
                                      <span style={{ fontSize: 12, color: "#6b7280" }}>
                                        <strong>Medical:</strong> {job.medical_notes}
                                      </span>
                                    )}
                                    {job.special_instructions && (
                                      <span style={{ fontSize: 12, color: "#6b7280" }}>
                                        <strong>Instructions:</strong> {job.special_instructions}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </AppShell>
      </div>
    </>
  );
}

function btnStyle(bg: string, disabled = false): React.CSSProperties {
  return {
    padding: "12px 22px",
    borderRadius: 12,
    border: "none",
    backgroundColor: disabled ? "#e5e7eb" : bg,
    color: disabled ? "#9ca3af" : "white",
    fontSize: 15,
    fontWeight: 700,
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.7 : 1,
    whiteSpace: "nowrap",
  };
}

const emptyCard: React.CSSProperties = {
  backgroundColor: "#120A1F",
  borderRadius: 20,
  padding: "60px 32px",
  textAlign: "center",
  border: "1px solid rgba(212,175,55,0.22)",
};
