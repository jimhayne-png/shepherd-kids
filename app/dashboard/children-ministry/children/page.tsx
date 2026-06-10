"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AppShell from "@/components/layout/AppShell";

const supabase = createClient();

const CM_ACCENT = "#7B2CBF";

type Child = {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  parent_name: string | null;
  parent_phone: string | null;
  parent_email: string | null;
  visit_date: string | null;
};

type MilestoneRecord = {
  id: string;
  milestone_type: string;
  is_completed: boolean;
  completed_at: string | null;
  notes: string | null;
};

type Milestones = {
  salvation: MilestoneRecord | null;
  water_baptism: MilestoneRecord | null;
};

function calcAge(dob: string): number {
  const d = new Date(dob + "T00:00:00");
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  if (today.getMonth() < d.getMonth() || (today.getMonth() === d.getMonth() && today.getDate() < d.getDate())) age--;
  return age;
}
function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function ChildrenPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [search, setSearch] = useState("");
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [milestones, setMilestones] = useState<Milestones | null>(null);
  const [milestonesLoading, setMilestonesLoading] = useState(false);
  const [editField, setEditField] = useState<"salvation" | "water_baptism" | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);

  async function load(t: string) {
    const res = await fetch("/api/children-ministry/children", { headers: { Authorization: `Bearer ${t}` } });
    const data = await res.json();
    setChildren(data.children ?? []);
  }

  async function refreshMilestones(childId: string, t: string) {
    const res = await fetch(`/api/children-ministry/children/${childId}/milestones`, {
      headers: { Authorization: `Bearer ${t}` },
    });
    if (!res.ok) return;
    const data = await res.json();
    const m: Milestones = { salvation: null, water_baptism: null };
    for (const item of (data.milestones ?? []) as MilestoneRecord[]) {
      if (item.milestone_type === "salvation") m.salvation = item;
      if (item.milestone_type === "water_baptism") m.water_baptism = item;
    }
    setMilestones(m);
  }

  async function saveMilestone(type: "salvation" | "water_baptism") {
    if (!selectedChild || !token || !editValue) return;
    setSaving(true);
    const res = await fetch(`/api/children-ministry/children/${selectedChild.id}/milestones`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ milestoneType: type, completedAt: editValue }),
    });
    if (res.ok) {
      await refreshMilestones(selectedChild.id, token);
      setEditField(null);
      setEditValue("");
    }
    setSaving(false);
  }

  useEffect(() => {
    if (!selectedChild || !token) {
      setMilestones(null);
      setEditField(null);
      setEditValue("");
      return;
    }
    let cancelled = false;
    setMilestonesLoading(true);
    setMilestones(null);
    setEditField(null);
    setEditValue("");
    fetch(`/api/children-ministry/children/${selectedChild.id}/milestones`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(async (res) => {
      if (cancelled || !res.ok) return;
      const data = await res.json();
      const m: Milestones = { salvation: null, water_baptism: null };
      for (const item of (data.milestones ?? []) as MilestoneRecord[]) {
        if (item.milestone_type === "salvation") m.salvation = item;
        if (item.milestone_type === "water_baptism") m.water_baptism = item;
      }
      setMilestones(m);
    }).finally(() => { if (!cancelled) setMilestonesLoading(false); });
    return () => { cancelled = true; };
  }, [selectedChild?.id, token]);

  useEffect(() => {
    async function init() {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (!user || error) {
        console.log("Dashboard client user unavailable:", error?.message ?? null);
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const t = session.access_token;
      setToken(t);
      await load(t);
      setLoading(false);
    }
    init();
  }, [router]);

  const filtered = children.filter(c =>
    `${c.first_name} ${c.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
    (c.parent_name ?? "").toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#08060D" }}>
      <div style={{ color: "#D8D8E8" }}>Loading…</div>
    </div>
  );

  return (
    <AppShell navItems={[]}>
      <div className="px-8 py-10" style={{ background: "linear-gradient(135deg, #08060D 0%, #1C0A30 100%)" }}>
        <p className="text-sm mb-1" style={{ color: "#D4AF37" }}>ShepherdKids</p>
        <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "Georgia, serif" }}>🧒 ShepherdKids</h1>
        <p className="text-sm mt-1" style={{ color: "#D8D8E8" }}>{children.length} registered</p>
      </div>

      <div className="px-8 py-8" style={{ backgroundColor: "#0A0814", minHeight: "100vh" }}>
        <div style={{ marginBottom: "20px" }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or parent…"
            style={{ width: "100%", padding: "10px 16px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: "12px", fontSize: "13px", color: "#ffffff", outline: "none", boxSizing: "border-box" }}
          />
        </div>

        <div style={{ background: "#120A1F", border: "1px solid rgba(212,175,55,0.22)", borderRadius: "18px", overflow: "hidden" }}>
          {filtered.length === 0 ? (
            <div style={{ padding: "64px 32px", textAlign: "center" }}>
              <div style={{ fontSize: "48px", marginBottom: "16px" }}>🧒</div>
              <p style={{ color: "#A9A9B8", fontSize: "14px", margin: 0 }}>
                {search ? "No children match your search." : "No children registered yet. They'll appear here after their first kiosk check-in."}
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(212,175,55,0.12)" }}>
                  <th className="text-left px-6 py-3" style={{ fontSize: "11px", fontWeight: 700, color: "#A9A9B8", textTransform: "uppercase", letterSpacing: "0.06em" }}>Child</th>
                  <th className="text-left px-6 py-3" style={{ fontSize: "11px", fontWeight: 700, color: "#A9A9B8", textTransform: "uppercase", letterSpacing: "0.06em" }}>Parent</th>
                  <th className="text-left px-6 py-3" style={{ fontSize: "11px", fontWeight: 700, color: "#A9A9B8", textTransform: "uppercase", letterSpacing: "0.06em" }}>First Visit</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((child, idx) => (
                  <tr
                    key={child.id}
                    onClick={() => setSelectedChild(child)}
                    style={{ borderBottom: idx < filtered.length - 1 ? "1px solid rgba(212,175,55,0.08)" : "none", cursor: "pointer" }}
                    onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.backgroundColor = "rgba(123,44,191,0.1)"}
                    onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.backgroundColor = "transparent"}
                  >
                    <td className="px-6 py-4">
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div
                          style={{ width: "36px", height: "36px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: 700, color: "#ffffff", flexShrink: 0, backgroundColor: CM_ACCENT }}
                        >
                          {child.first_name[0]}{child.last_name[0]}
                        </div>
                        <div>
                          <p style={{ fontWeight: 600, color: "#ffffff", fontSize: "14px", margin: 0 }}>{child.first_name} {child.last_name}</p>
                          {child.date_of_birth && (
                            <p style={{ fontSize: "12px", color: "#A9A9B8", margin: "2px 0 0" }}>{calcAge(child.date_of_birth)} years old</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {child.parent_name && (
                        <p style={{ fontSize: "13px", color: "#D8D8E8", margin: 0 }}>{child.parent_name}</p>
                      )}
                      {child.parent_phone && (
                        <p style={{ fontSize: "12px", color: "#A9A9B8", margin: "2px 0 0" }}>{child.parent_phone}</p>
                      )}
                    </td>
                    <td className="px-6 py-4" style={{ fontSize: "13px", color: "#A9A9B8" }}>
                      {child.visit_date ? fmtDate(child.visit_date) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Child Detail Modal */}
      {selectedChild && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: "16px" }} onClick={() => setSelectedChild(null)}>
          <div style={{ background: "#120A1F", border: "1px solid rgba(212,175,55,0.3)", borderRadius: "18px", width: "100%", maxWidth: "440px" }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(212,175,55,0.15)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#ffffff", margin: 0, fontFamily: "Georgia, serif" }}>
                  {selectedChild.first_name} {selectedChild.last_name}
                </h2>
                {selectedChild.date_of_birth && (
                  <p style={{ fontSize: "12px", color: "#A9A9B8", margin: "3px 0 0" }}>
                    {calcAge(selectedChild.date_of_birth)} years old · DOB {fmtDate(selectedChild.date_of_birth)}
                  </p>
                )}
              </div>
              <button onClick={() => setSelectedChild(null)} style={{ color: "#A9A9B8", background: "none", border: "none", cursor: "pointer", fontSize: "18px" }}>✕</button>
            </div>
            <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "18px" }}>
              {(selectedChild.parent_name || selectedChild.parent_phone || selectedChild.parent_email) && (
                <div>
                  <p style={{ fontSize: "10px", fontWeight: 700, color: "#A9A9B8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>Parent / Guardian</p>
                  {selectedChild.parent_name && <p style={{ fontWeight: 600, color: "#ffffff", fontSize: "13px", margin: 0 }}>{selectedChild.parent_name}</p>}
                  {selectedChild.parent_phone && <p style={{ fontSize: "12px", color: "#A9A9B8", margin: "2px 0 0" }}>{selectedChild.parent_phone}</p>}
                  {selectedChild.parent_email && <p style={{ fontSize: "12px", color: "#A9A9B8", margin: "1px 0 0" }}>{selectedChild.parent_email}</p>}
                </div>
              )}
              {selectedChild.visit_date && (
                <div>
                  <p style={{ fontSize: "10px", fontWeight: 700, color: "#A9A9B8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>First Visit</p>
                  <p style={{ fontSize: "13px", color: "#D8D8E8", margin: 0 }}>{fmtDate(selectedChild.visit_date)}</p>
                </div>
              )}
              <div>
                <p style={{ fontSize: "10px", fontWeight: 700, color: "#A9A9B8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>Faith Journey</p>
                {milestonesLoading ? (
                  <p style={{ fontSize: "12px", color: "#A9A9B8" }}>Loading…</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {(["salvation", "water_baptism"] as const).map((type) => {
                      const label = type === "salvation" ? "✝️ Spiritual Birthday" : "🌊 Baptism Date";
                      const current = milestones?.[type] ?? null;
                      return (
                        <div key={type}>
                          <p style={{ fontSize: "12px", color: "#D8D8E8", marginBottom: "4px" }}>{label}</p>
                          {editField === type ? (
                            <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                              <input
                                type="date"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                style={{ padding: "5px 8px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: "6px", fontSize: "12px", color: "#ffffff", outline: "none" }}
                              />
                              <button
                                onClick={() => saveMilestone(type)}
                                disabled={saving || !editValue}
                                style={{ fontSize: "12px", fontWeight: 600, color: "#ffffff", padding: "5px 12px", borderRadius: "6px", border: "none", cursor: saving || !editValue ? "not-allowed" : "pointer", opacity: saving || !editValue ? 0.5 : 1, background: "linear-gradient(135deg, #7B2CBF, #9D4EDD)" }}
                              >
                                {saving ? "Saving…" : "Save"}
                              </button>
                              <button
                                onClick={() => { setEditField(null); setEditValue(""); }}
                                style={{ fontSize: "12px", color: "#A9A9B8", background: "none", border: "none", cursor: "pointer" }}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : current?.completed_at ? (
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <p style={{ fontSize: "13px", color: "#D8D8E8", margin: 0 }}>{fmtDate(current.completed_at)}</p>
                              <button
                                onClick={() => { setEditField(type); setEditValue(current.completed_at ?? ""); }}
                                style={{ fontSize: "12px", fontWeight: 600, color: "#9D4EDD", background: "none", border: "none", cursor: "pointer" }}
                              >
                                Edit
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => { setEditField(type); setEditValue(""); }}
                              style={{ fontSize: "12px", fontWeight: 600, color: "#9D4EDD", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                            >
                              + Add date
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
