"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AppShell from "@/components/layout/AppShell";

const supabase = createClient();

const CM_ACCENT = "#7B2CBF";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";


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

type Token = { id: string; token: string; label: string; is_active: boolean };

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
  const [tokens, setTokens] = useState<Token[]>([]);
  const [qrDataUrls, setQrDataUrls] = useState<Record<string, string>>({});
  const [newTokenLabel, setNewTokenLabel] = useState("");
  const [showAddToken, setShowAddToken] = useState(false);
  const [converting, setConverting] = useState<string | null>(null);
  const [convertMsg, setConvertMsg] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [savingNotes, setSavingNotes] = useState<string | null>(null);

  function ch(): Record<string, string> {
    return selectedChurchIdRef.current ? { "x-selected-church-id": selectedChurchIdRef.current } : {};
  }

  async function load() {
    const [famRes, tokRes] = await Promise.all([
      fetch("/api/children-ministry/visitors", { credentials: "include", headers: ch() }),
      fetch("/api/children-ministry/visitor-tokens", { credentials: "include", headers: ch() }),
    ]);
    if (famRes.ok) { const d = await famRes.json(); setFamilies(d.families ?? []); setStats(d.stats ?? stats); }
    if (tokRes.ok) { const d = await tokRes.json(); setTokens(d.tokens ?? []); }
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

  async function generateQr(tok: Token) {
    if (qrDataUrls[tok.id]) return;
    const url = `${APP_URL}/kids-checkin/${tok.token}`;
    const { default: QRCode } = await import("qrcode");
    const dataUrl = await QRCode.toDataURL(url, { width: 280, margin: 2, color: { dark: "#1A4A2E", light: "#ffffff" } });
    setQrDataUrls(m => ({ ...m, [tok.id]: dataUrl }));
  }

  async function addToken() {
    if (!newTokenLabel.trim()) return;
    await fetch("/api/children-ministry/visitor-tokens", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", ...ch() },
      body: JSON.stringify({ label: newTokenLabel }),
    });
    setNewTokenLabel(""); setShowAddToken(false);
    await load();
  }

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
        <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "Georgia, serif" }}>🆕 First-Time Visitors</h1>
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
          {["all", "new", "contacted", "returning", "converted"].map(f => (
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

        {/* QR Token Management */}
        <div style={{ background: "#120A1F", border: "1px solid rgba(212,175,55,0.22)", borderRadius: "16px", padding: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
            <div>
              <h2 style={{ fontWeight: 700, color: "#ffffff", fontSize: "17px", margin: 0, fontFamily: "Georgia, serif" }}>Check-In Points</h2>
              <p style={{ fontSize: "12px", color: "#A9A9B8", margin: "3px 0 0" }}>QR codes for your welcome desk, entrance, or tablets</p>
            </div>
            <button onClick={() => setShowAddToken(true)} style={{ padding: "7px 14px", borderRadius: "10px", fontSize: "12px", fontWeight: 700, color: "#ffffff", background: "linear-gradient(135deg, #7B2CBF, #9D4EDD)", border: "none", cursor: "pointer" }}>
              + Add Point
            </button>
          </div>

          {tokens.length === 0 ? (
            <p style={{ color: "#A9A9B8", fontSize: "13px" }}>No check-in points yet. Create one to get your QR code.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {tokens.map(tok => (
                <div key={tok.id} style={{ border: "1px solid rgba(212,175,55,0.2)", borderRadius: "14px", padding: "16px", background: "rgba(255,255,255,0.03)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p style={{ fontSize: "13px", fontWeight: 700, color: "#ffffff", margin: 0 }}>{tok.label}</p>
                      <p style={{ fontSize: "11px", color: "#A9A9B8", fontFamily: "monospace", margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tok.token.slice(0, 12)}…</p>
                    </div>
                    <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "20px", fontWeight: 700, flexShrink: 0, marginLeft: "8px", background: tok.is_active ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.08)", color: tok.is_active ? "#4ade80" : "#A9A9B8" }}>
                      {tok.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  {qrDataUrls[tok.id] ? (
                    <div style={{ textAlign: "center" }}>
                      <img src={qrDataUrls[tok.id]} alt="QR" style={{ width: 140, height: 140, margin: "0 auto 8px", borderRadius: "10px", display: "block" }} />
                      <div style={{ display: "flex", gap: "8px" }}>
                        <a href={qrDataUrls[tok.id]} download={`${tok.label}.png`} style={{ flex: 1, padding: "6px 0", borderRadius: "8px", fontSize: "12px", fontWeight: 700, color: "#ffffff", textAlign: "center", textDecoration: "none", background: "linear-gradient(135deg, #7B2CBF, #9D4EDD)" }}>⬇ Download</a>
                        {APP_URL && <a href={`${APP_URL}/kids-checkin/${tok.token}`} target="_blank" rel="noopener noreferrer" style={{ flex: 1, padding: "6px 0", borderRadius: "8px", fontSize: "12px", fontWeight: 700, border: "1px solid rgba(212,175,55,0.3)", color: "#D4AF37", textAlign: "center", textDecoration: "none" }}>Open ↗</a>}
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => generateQr(tok)} style={{ width: "100%", padding: "8px 0", borderRadius: "10px", fontSize: "12px", fontWeight: 700, border: "1px solid rgba(212,175,55,0.3)", color: "#D4AF37", background: "transparent", cursor: "pointer" }}>
                      Show QR Code
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {showAddToken && (
            <div style={{ marginTop: "16px", display: "flex", gap: "8px", maxWidth: "360px" }}>
              <input value={newTokenLabel} onChange={e => setNewTokenLabel(e.target.value)} placeholder="e.g. Main Entrance QR" style={{ flex: 1, padding: "8px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: "8px", fontSize: "13px", color: "#ffffff", outline: "none" }} />
              <button onClick={addToken} style={{ padding: "8px 14px", borderRadius: "8px", fontSize: "12px", fontWeight: 700, color: "#ffffff", background: "linear-gradient(135deg, #7B2CBF, #9D4EDD)", border: "none", cursor: "pointer" }}>Add</button>
              <button onClick={() => setShowAddToken(false)} style={{ padding: "8px 12px", borderRadius: "8px", fontSize: "12px", border: "1px solid rgba(255,255,255,0.15)", color: "#A9A9B8", background: "transparent", cursor: "pointer" }}>Cancel</button>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
