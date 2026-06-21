"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AppShell from "@/components/layout/AppShell";

const supabase = createClient();

const CM_ACCENT = "#7B2CBF";


type Family = {
  id: string; parent1_first_name: string; parent1_last_name: string;
  parent1_email: string | null; parent1_phone: string | null;
  parent2_first_name: string | null; parent2_last_name: string | null;
  parent2_email: string | null; parent2_phone: string | null;
  how_did_you_hear: string | null; visit_date: string;
  follow_up_sent: boolean; next_day_sent: boolean;
  notes: string | null; status: string;
  children: any[];
};

const STATUS_COLORS: Record<string, string> = {
  new: "#3b82f6", contacted: "#f59e0b", returning: "#8b5cf6", converted: "#22c55e",
};

function fmtDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function calcAge(dob: string): number {
  const d = new Date(dob + "T00:00:00");
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  if (today.getMonth() < d.getMonth() || (today.getMonth() === d.getMonth() && today.getDate() < d.getDate())) age--;
  return age;
}

export default function VisitorsPage() {
  const router = useRouter();
  const selectedChurchIdRef = useRef<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [families, setFamilies] = useState<Family[]>([]);
  const [stats, setStats] = useState({ today: 0, this_week: 0, this_month: 0, converted: 0 });
  const [filter, setFilter] = useState("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [converting, setConverting] = useState<string | null>(null);
  const [convertMsg, setConvertMsg] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [savingNotes, setSavingNotes] = useState<string | null>(null);

  function ch(): Record<string, string> {
    return selectedChurchIdRef.current ? { "x-selected-church-id": selectedChurchIdRef.current } : {};
  }

  async function load() {
    const famRes = await fetch("/api/children-ministry/visitors", { credentials: "include", headers: ch() });
    if (famRes.ok) { const d = await famRes.json(); setFamilies(d.families ?? []); setStats(d.stats ?? stats); }
  }

  useEffect(() => {
    async function init() {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (!user || error) {
        console.log("Dashboard client user unavailable:", error?.message ?? null);
        return;
      }
      const urlParams = new URLSearchParams(window.location.search);
      selectedChurchIdRef.current = urlParams.get("churchId") ?? localStorage.getItem("selected_church_id");
      await load();
      setLoading(false);
    }
    init();
  }, [router]);

  async function updateStatus(familyId: string, status: string) {
    await fetch(`/api/children-ministry/visitors/${familyId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json", ...ch() },
      body: JSON.stringify({ status }),
    });
    setFamilies(fs => fs.map(f => f.id === familyId ? { ...f, status } : f));
  }

  async function saveNotes(familyId: string) {
    setSavingNotes(familyId);
    await fetch(`/api/children-ministry/visitors/${familyId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json", ...ch() },
      body: JSON.stringify({ notes: notes[familyId] ?? "" }),
    });
    setSavingNotes(null);
    setFamilies(fs => fs.map(f => f.id === familyId ? { ...f, notes: notes[familyId] ?? null } : f));
  }

  async function convertFamily(familyId: string) {
    setConverting(familyId);
    const res = await fetch(`/api/children-ministry/visitors/${familyId}/convert`, {
      method: "POST",
      credentials: "include",
      headers: ch(),
    });
    const d = await res.json();
    setConverting(null);
    if (res.ok) {
      setConvertMsg(m => ({ ...m, [familyId]: `✅ ${d.children?.length ?? 0} children added to ShepherdKids` }));
      setFamilies(fs => fs.map(f => f.id === familyId ? { ...f, status: 'converted' } : f));
    } else {
      setConvertMsg(m => ({ ...m, [familyId]: `❌ ${d.error ?? "Error"}` }));
    }
  }

  const filtered = families.filter(f => filter === "all" || f.status === filter);

  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#08060D" }}><div style={{ color: "#D8D8E8" }}>Loading…</div></div>;

  return (
    <AppShell navItems={[]}>
      <div className="px-8 py-10" style={{ background: "linear-gradient(135deg, #08060D 0%, #1C0A30 100%)" }}>
        <p className="text-sm mb-1" style={{ color: "#D4AF37" }}>ShepherdKids</p>
        <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "Georgia, serif" }}>First-Time Visitors</h1>
      </div>

      <div className="px-8 py-8" style={{ backgroundColor: "#0A0814", minHeight: "100vh" }}>
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4" style={{ marginBottom: "24px" }}>
          {[
            { label: "Today", value: stats.today, emoji: "📅", color: "#7B2CBF" },
            { label: "This Week", value: stats.this_week, emoji: "📆", color: "#9D4EDD" },
            { label: "This Month", value: stats.this_month, emoji: "📊", color: "#6366f1" },
            { label: "Converted", value: stats.converted, emoji: "✅", color: "#16a34a" },
          ].map(s => (
            <div key={s.label} style={{ background: "#120A1F", border: "1px solid rgba(212,175,55,0.22)", borderRadius: "14px", padding: "16px 18px", display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0, backgroundColor: s.color + "22" }}>{s.emoji}</div>
              <div>
                <p style={{ fontSize: "22px", fontWeight: 700, color: "#ffffff", margin: 0, lineHeight: 1 }}>{s.value}</p>
                <p style={{ fontSize: "11px", color: "#A9A9B8", margin: "2px 0 0" }}>{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div style={{ display: "flex", gap: "6px", marginBottom: "20px", flexWrap: "wrap" }}>
          {["all", "new", "contacted", "returning"].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ padding: "6px 14px", borderRadius: "10px", fontSize: "12px", fontWeight: 700, textTransform: "capitalize", cursor: "pointer", border: "none", backgroundColor: filter === f ? CM_ACCENT : "rgba(255,255,255,0.07)", color: filter === f ? "#ffffff" : "#A9A9B8" }}>
              {f === "all" ? `All (${families.length})` : f}
            </button>
          ))}
        </div>

        {/* Family list */}
        {filtered.length === 0 ? (
          <div style={{ background: "#120A1F", border: "1px solid rgba(212,175,55,0.22)", borderRadius: "16px", padding: "48px 32px", textAlign: "center", marginBottom: "24px" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>👨‍👩‍👧</div>
            <p style={{ color: "#A9A9B8", margin: 0 }}>No visitor families {filter !== "all" ? `with status "${filter}"` : "yet"}.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "32px" }}>
            {filtered.map(fam => {
              const isOpen = expanded === fam.id;
              return (
                <div key={fam.id} style={{ background: "#120A1F", border: "1px solid rgba(212,175,55,0.22)", borderRadius: "16px", overflow: "hidden" }}>
                  {/* Header row */}
                  <div style={{ display: "flex", alignItems: "center", gap: "16px", padding: "16px 20px", cursor: "pointer" }} onClick={() => setExpanded(isOpen ? null : fam.id)}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "5px" }}>
                        <h3 style={{ fontWeight: 700, color: "#ffffff", fontSize: "14px", margin: 0 }}>{fam.parent1_last_name} Family</h3>
                        <span style={{ fontSize: "11px", padding: "2px 9px", borderRadius: "20px", fontWeight: 700, color: "#ffffff", backgroundColor: STATUS_COLORS[fam.status] ?? "#6b7280" }}>
                          {fam.status}
                        </span>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", fontSize: "12px", color: "#A9A9B8" }}>
                        <span>📅 {fmtDate(fam.visit_date)}</span>
                        <span>👨‍👩‍👧 {fam.children.map((c: any) => c.first_name).join(", ") || "No children"}</span>
                        {fam.follow_up_sent && <span style={{ color: "#4ade80" }}>✅ Welcome email</span>}
                        {fam.next_day_sent && <span style={{ color: "#4ade80" }}>✅ Follow-up sent</span>}
                        {!fam.next_day_sent && <span style={{ color: "#A9A9B8" }}>⬜ Follow-up pending</span>}
                      </div>
                    </div>
                    <span style={{ color: "#A9A9B8", fontSize: "14px" }}>{isOpen ? "▲" : "▼"}</span>
                  </div>

                  {/* Expanded detail */}
                  {isOpen && (
                    <div style={{ padding: "0 20px 20px", borderTop: "1px solid rgba(212,175,55,0.1)", paddingTop: "16px" }}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" style={{ marginBottom: "16px" }}>
                        <div>
                          <p style={{ fontSize: "10px", fontWeight: 700, color: "#A9A9B8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>Parent 1</p>
                          <p style={{ fontSize: "13px", fontWeight: 600, color: "#ffffff", margin: 0 }}>{fam.parent1_first_name} {fam.parent1_last_name}</p>
                          {fam.parent1_phone && <p style={{ fontSize: "12px", color: "#A9A9B8", margin: "2px 0 0" }}>{fam.parent1_phone}</p>}
                          {fam.parent1_email && <p style={{ fontSize: "12px", color: "#A9A9B8", margin: "1px 0 0" }}>{fam.parent1_email}</p>}
                        </div>
                        {fam.parent2_first_name && (
                          <div>
                            <p style={{ fontSize: "10px", fontWeight: 700, color: "#A9A9B8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>Parent 2</p>
                            <p style={{ fontSize: "13px", fontWeight: 600, color: "#ffffff", margin: 0 }}>{fam.parent2_first_name} {fam.parent2_last_name}</p>
                            {fam.parent2_phone && <p style={{ fontSize: "12px", color: "#A9A9B8", margin: "2px 0 0" }}>{fam.parent2_phone}</p>}
                            {fam.parent2_email && <p style={{ fontSize: "12px", color: "#A9A9B8", margin: "1px 0 0" }}>{fam.parent2_email}</p>}
                          </div>
                        )}
                      </div>

                      {fam.children.length > 0 && (
                        <div style={{ marginBottom: "14px" }}>
                          <p style={{ fontSize: "10px", fontWeight: 700, color: "#A9A9B8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>Children</p>
                          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "4px" }}>
                            {fam.children.map((c: any, i: number) => (
                              <li key={c.id ?? i} style={{ fontSize: "13px", color: "#D8D8E8", display: "flex", gap: "6px" }}>
                                <span style={{ color: "#A9A9B8" }}>•</span>
                                <span>{c.first_name} {c.last_name}{c.date_of_birth ? ` · ${calcAge(c.date_of_birth)} yrs old` : ""}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {fam.how_did_you_hear && <p style={{ fontSize: "12px", color: "#A9A9B8", marginBottom: "14px" }}>Heard via: {fam.how_did_you_hear}</p>}

                      <div style={{ marginBottom: "14px" }}>
                        <p style={{ fontSize: "10px", fontWeight: 700, color: "#A9A9B8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>Notes</p>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <textarea
                            value={notes[fam.id] ?? (fam.notes ?? "")}
                            onChange={e => setNotes(n => ({ ...n, [fam.id]: e.target.value }))}
                            rows={2}
                            style={{ flex: 1, padding: "8px 10px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(212,175,55,0.25)", borderRadius: "8px", fontSize: "12px", color: "#ffffff", resize: "none", outline: "none" }}
                          />
                          <button onClick={() => saveNotes(fam.id)} disabled={savingNotes === fam.id} style={{ padding: "6px 12px", borderRadius: "8px", fontSize: "12px", fontWeight: 700, color: "#ffffff", background: "linear-gradient(135deg, #7B2CBF, #9D4EDD)", border: "none", cursor: "pointer", flexShrink: 0 }}>
                            {savingNotes === fam.id ? "…" : "Save"}
                          </button>
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        <select value={fam.status} onChange={e => updateStatus(fam.id, e.target.value)} style={{ padding: "7px 10px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(212,175,55,0.25)", borderRadius: "8px", fontSize: "12px", fontWeight: 600, color: "#ffffff", outline: "none" }}>
                          {["new", "contacted", "returning", "converted"].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                        </select>
                        {fam.status !== "converted" && (
                          <button onClick={() => convertFamily(fam.id)} disabled={converting === fam.id} style={{ padding: "7px 14px", borderRadius: "8px", fontSize: "12px", fontWeight: 700, color: "#ffffff", background: "rgba(34,197,94,0.85)", border: "none", cursor: "pointer" }}>
                            {converting === fam.id ? "Converting…" : "✅ Convert to Members"}
                          </button>
                        )}
                        {convertMsg[fam.id] && <span style={{ fontSize: "12px", fontWeight: 600, color: "#4ade80" }}>{convertMsg[fam.id]}</span>}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

      </div>
    </AppShell>
  );
}
