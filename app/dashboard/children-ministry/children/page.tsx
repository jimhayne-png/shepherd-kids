"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AppShell from "@/components/layout/AppShell";
import { selectedChurchHeaders } from "@/lib/selected-church";

const supabase = createClient();

const ACCENT  = "#7B2CBF";
const ACCENT2 = "#9D4EDD";
const GOLD    = "#D4AF37";
const CARD    = "#120A1F";
const MUTED   = "#A9A9B8";

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

type Family = {
  id: string;
  parent1_first_name: string;
  parent1_last_name: string;
  parent1_phone: string | null;
  parent1_email: string | null;
  status: string;
};

const BLANK_CHILD = {
  first_name: "", last_name: "",
  date_of_birth: "", grade: "",
  allergies: "", medical_notes: "",
  special_instructions: "", authorized_pickups: "",
  photo_permission_status: "not_reviewed" as const,
};

const BLANK_PARENT = {
  parent1_first_name: "", parent1_last_name: "",
  parent1_phone: "", parent1_email: "",
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

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(212,175,55,0.3)",
  borderRadius: "8px",
  fontSize: "13px",
  color: "#ffffff",
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "11px",
  fontWeight: 700,
  color: MUTED,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  marginBottom: "5px",
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: "11px", fontWeight: 700, color: GOLD, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 10px" }}>{children}</p>;
}

function Req() { return <span style={{ color: "#f87171" }}>*</span>; }

function ChildrenContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading]   = useState(true);
  const [token, setToken]       = useState<string | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [search, setSearch]     = useState("");

  // Modal state
  const [showModal, setShowModal] = useState(false);
  // step: "pick-household" | "new-household" | "child-form" | "success"
  const [step, setStep] = useState<"pick-household" | "new-household" | "child-form" | "success">("pick-household");
  const [familySearch, setFamilySearch] = useState("");
  const [families, setFamilies]         = useState<Family[]>([]);
  const [familiesLoaded, setFamiliesLoaded] = useState(false);
  const [selectedFamily, setSelectedFamily] = useState<Family | null>(null);
  const [newParentForm, setNewParentForm]   = useState(BLANK_PARENT);
  const [childForm, setChildForm]           = useState(BLANK_CHILD);
  const [saving, setSaving]   = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [createdChildName, setCreatedChildName] = useState<string | null>(null);
  const [createdFamilyId, setCreatedFamilyId]   = useState<string | null>(null);

  function authHeaders(t: string) {
    return { Authorization: `Bearer ${t}`, ...selectedChurchHeaders() };
  }

  async function loadChildren(t: string) {
    const res = await fetch("/api/children-ministry/children", { headers: authHeaders(t) });
    const data = await res.json();
    setChildren(data.children ?? []);
  }

  async function loadFamilies(t: string) {
    const res = await fetch("/api/children-ministry/parents", { headers: authHeaders(t) });
    if (res.ok) { const d = await res.json(); setFamilies(d.parents ?? []); }
    setFamiliesLoaded(true);
  }

  useEffect(() => {
    async function init() {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (!user || error) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const t = session.access_token;
      setToken(t);
      await loadChildren(t);
      setLoading(false);
    }
    init();
  }, [router]);

  // If navigated here from "Add Child to This Household" on the parents page, auto-open modal with that family pre-selected.
  useEffect(() => {
    const addChildFamilyId = searchParams.get("addChild");
    if (addChildFamilyId && token && families.length > 0) {
      const fam = families.find(f => f.id === addChildFamilyId);
      if (fam) {
        setSelectedFamily(fam);
        setChildForm(BLANK_CHILD);
        setFormError(null);
        setStep("child-form");
        setShowModal(true);
      }
    }
  }, [searchParams, token, families]);

  function openModal() {
    setStep("pick-household");
    setFamilySearch("");
    setSelectedFamily(null);
    setNewParentForm(BLANK_PARENT);
    setChildForm(BLANK_CHILD);
    setFormError(null);
    setCreatedChildName(null);
    setCreatedFamilyId(null);
    setShowModal(true);
    if (token && !familiesLoaded) loadFamilies(token);
  }

  function closeModal() {
    setShowModal(false);
    setFormError(null);
    setCreatedChildName(null);
    setCreatedFamilyId(null);
  }

  async function createChild(familyId: string): Promise<boolean> {
    if (!token) return false;
    const res = await fetch("/api/children-ministry/visitor-children", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders(token) },
      body: JSON.stringify({ ...childForm, family_id: familyId }),
    });
    const data = await res.json();
    if (!res.ok) { setFormError(data.error ?? "Could not create child."); return false; }
    setCreatedChildName(`${childForm.first_name} ${childForm.last_name}`);
    setCreatedFamilyId(familyId);
    await loadChildren(token);
    return true;
  }

  async function submitChildForm() {
    if (!selectedFamily) return;
    setSaving(true);
    setFormError(null);
    if (!childForm.first_name.trim() || !childForm.last_name.trim()) {
      setFormError("First name and last name are required.");
      setSaving(false);
      return;
    }
    const ok = await createChild(selectedFamily.id);
    setSaving(false);
    if (ok) setStep("success");
  }

  async function submitNewHouseholdAndChild() {
    if (!token) return;
    setSaving(true);
    setFormError(null);
    if (!newParentForm.parent1_first_name.trim() || !newParentForm.parent1_last_name.trim()) {
      setFormError("Parent first and last name are required.");
      setSaving(false);
      return;
    }
    if (!newParentForm.parent1_phone.trim() && !newParentForm.parent1_email.trim()) {
      setFormError("A phone number or email address is required.");
      setSaving(false);
      return;
    }
    if (!childForm.first_name.trim() || !childForm.last_name.trim()) {
      setFormError("Child first and last name are required.");
      setSaving(false);
      return;
    }
    // Create family
    const famRes = await fetch("/api/children-ministry/parents", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders(token) },
      body: JSON.stringify({ ...newParentForm, force: true }),
    });
    const famData = await famRes.json();
    if (!famRes.ok && famRes.status !== 409) {
      setFormError(famData.error ?? "Could not create household.");
      setSaving(false);
      return;
    }
    // If 409, create anyway (force was already true — shouldn't happen, but handle gracefully)
    const familyId = famData.family?.id ?? famData.duplicates?.[0]?.id;
    if (!familyId) { setFormError("Could not determine household ID."); setSaving(false); return; }

    const ok = await createChild(familyId);
    if (ok) {
      await loadFamilies(token);
      setFamiliesLoaded(true);
    }
    setSaving(false);
    if (ok) setStep("success");
  }

  const filteredFamilies = families.filter(f => {
    if (!familySearch) return true;
    const q = familySearch.toLowerCase();
    const name = `${f.parent1_first_name} ${f.parent1_last_name}`.toLowerCase();
    return name.includes(q) || (f.parent1_phone ?? "").includes(q) || (f.parent1_email ?? "").toLowerCase().includes(q);
  });

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
      {/* Header */}
      <div className="px-8 py-10" style={{ background: "linear-gradient(135deg, #08060D 0%, #1C0A30 100%)" }}>
        <p className="text-sm mb-1" style={{ color: GOLD }}>ShepherdKids</p>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16 }}>
          <div>
            <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "Georgia, serif" }}>ShepherdKids</h1>
            <p className="text-sm mt-1" style={{ color: "#D8D8E8" }}>{children.length} registered</p>
          </div>
          <button
            onClick={openModal}
            style={{ padding: "10px 20px", background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`, border: "none", borderRadius: "12px", color: "#ffffff", fontSize: "13px", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}
          >
            + Add Child
          </button>
        </div>
      </div>

      <div className="px-8 py-8" style={{ backgroundColor: "#0A0814", minHeight: "100vh" }}>
        <div style={{ marginBottom: "20px" }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or parent…"
            style={inputStyle}
          />
        </div>

        <div style={{ background: CARD, border: "1px solid rgba(212,175,55,0.22)", borderRadius: "18px", overflow: "hidden" }}>
          {filtered.length === 0 ? (
            <div style={{ padding: "64px 32px", textAlign: "center" }}>
              <div style={{ fontSize: "48px", marginBottom: "16px" }}>🧒</div>
              <p style={{ color: MUTED, fontSize: "14px", margin: 0 }}>
                {search ? "No children match your search." : "No children registered yet."}
              </p>
              {!search && (
                <button
                  onClick={openModal}
                  style={{ marginTop: "16px", padding: "10px 20px", background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`, border: "none", borderRadius: "10px", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}
                >
                  + Add Child
                </button>
              )}
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(212,175,55,0.12)" }}>
                  <th className="text-left px-6 py-3" style={{ fontSize: "11px", fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.06em" }}>Child</th>
                  <th className="text-left px-6 py-3" style={{ fontSize: "11px", fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.06em" }}>Parent</th>
                  <th className="text-left px-6 py-3" style={{ fontSize: "11px", fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.06em" }}>First Visit</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((child, idx) => (
                  <tr
                    key={child.id}
                    onClick={() => router.push(`/dashboard/children-ministry/children/${child.id}`)}
                    style={{ borderBottom: idx < filtered.length - 1 ? "1px solid rgba(212,175,55,0.08)" : "none", cursor: "pointer" }}
                    onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.backgroundColor = "rgba(123,44,191,0.1)"}
                    onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.backgroundColor = "transparent"}
                  >
                    <td className="px-6 py-4">
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div style={{ width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: 700, color: "#ffffff", flexShrink: 0, backgroundColor: ACCENT }}>
                          {child.first_name[0]}{child.last_name[0]}
                        </div>
                        <div>
                          <p style={{ fontWeight: 600, color: "#ffffff", fontSize: "14px", margin: 0 }}>{child.first_name} {child.last_name}</p>
                          {child.date_of_birth && <p style={{ fontSize: "12px", color: MUTED, margin: "2px 0 0" }}>{calcAge(child.date_of_birth)} years old</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {child.parent_name && <p style={{ fontSize: "13px", color: "#D8D8E8", margin: 0 }}>{child.parent_name}</p>}
                      {child.parent_phone && <p style={{ fontSize: "12px", color: MUTED, margin: "2px 0 0" }}>{child.parent_phone}</p>}
                    </td>
                    <td className="px-6 py-4" style={{ fontSize: "13px", color: MUTED }}>
                      {child.visit_date ? fmtDate(child.visit_date) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add Child Modal */}
      {showModal && (
        <div
          style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20 }}
          onClick={e => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div style={{ backgroundColor: CARD, border: "1px solid rgba(212,175,55,0.3)", borderRadius: 24, padding: 32, width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto" }}>

            {/* Success */}
            {step === "success" && (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "48px", marginBottom: "12px" }}>✅</div>
                <h2 style={{ color: "#ffffff", fontFamily: "Georgia, serif", fontSize: "20px", margin: "0 0 8px" }}>Child Added</h2>
                <p style={{ color: MUTED, fontSize: "13px", margin: "0 0 28px" }}>
                  <strong style={{ color: "#fff" }}>{createdChildName}</strong> has been added to the household record.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {createdFamilyId && (
                    <button
                      onClick={() => { closeModal(); router.push(`/dashboard/children-ministry/parents/${createdFamilyId}`); }}
                      style={{ padding: "11px", background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`, border: "none", borderRadius: "10px", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}
                    >
                      View Household Record
                    </button>
                  )}
                  <button
                    onClick={() => { setStep("pick-household"); setChildForm(BLANK_CHILD); setSelectedFamily(null); setFormError(null); setCreatedChildName(null); }}
                    style={{ padding: "11px", background: "transparent", border: `1px solid rgba(212,175,55,0.4)`, borderRadius: "10px", color: GOLD, fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
                  >
                    Add Another Child
                  </button>
                  <button onClick={closeModal} style={{ padding: "11px", background: "transparent", border: "none", color: MUTED, fontSize: "13px", cursor: "pointer" }}>
                    Done
                  </button>
                </div>
              </div>
            )}

            {/* Step: Pick household */}
            {step === "pick-household" && (
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                  <h2 style={{ color: "#ffffff", fontFamily: "Georgia, serif", fontSize: "20px", margin: 0 }}>Add Child</h2>
                  <button onClick={closeModal} style={{ background: "none", border: "none", color: MUTED, fontSize: "20px", cursor: "pointer", lineHeight: 1 }}>×</button>
                </div>
                <p style={{ color: "#D8D8E8", fontSize: "13px", margin: "0 0 16px" }}>Search for the child's household, or create a new one.</p>

                <input
                  value={familySearch}
                  onChange={e => { setFamilySearch(e.target.value); if (token && !familiesLoaded) loadFamilies(token); }}
                  placeholder="Search by parent name, phone, or email…"
                  style={{ ...inputStyle, marginBottom: 12 }}
                  autoFocus
                />

                {filteredFamilies.length > 0 && (
                  <div style={{ border: "1px solid rgba(212,175,55,0.2)", borderRadius: 10, overflow: "hidden", marginBottom: 16, maxHeight: 260, overflowY: "auto" }}>
                    {filteredFamilies.slice(0, 30).map((f, i) => (
                      <div
                        key={f.id}
                        onClick={() => { setSelectedFamily(f); setChildForm(BLANK_CHILD); setFormError(null); setStep("child-form"); }}
                        style={{ padding: "12px 16px", borderBottom: i < Math.min(filteredFamilies.length, 30) - 1 ? "1px solid rgba(212,175,55,0.1)" : "none", cursor: "pointer" }}
                        onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.backgroundColor = "rgba(123,44,191,0.1)"}
                        onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.backgroundColor = "transparent"}
                      >
                        <p style={{ color: "#fff", fontWeight: 600, fontSize: "13px", margin: 0 }}>{f.parent1_first_name} {f.parent1_last_name}</p>
                        <p style={{ color: MUTED, fontSize: "12px", margin: "2px 0 0" }}>{[f.parent1_phone, f.parent1_email].filter(Boolean).join(" · ")}</p>
                      </div>
                    ))}
                  </div>
                )}

                {familiesLoaded && filteredFamilies.length === 0 && familySearch && (
                  <p style={{ color: MUTED, fontSize: "13px", marginBottom: 16 }}>No matching household found.</p>
                )}

                <button
                  onClick={() => { setNewParentForm(BLANK_PARENT); setChildForm(BLANK_CHILD); setFormError(null); setStep("new-household"); }}
                  style={{ width: "100%", padding: "11px", background: "transparent", border: "1px solid rgba(212,175,55,0.4)", borderRadius: "10px", color: GOLD, fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
                >
                  + Create New Household
                </button>
              </div>
            )}

            {/* Step: New household + child */}
            {step === "new-household" && (
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                  <h2 style={{ color: "#ffffff", fontFamily: "Georgia, serif", fontSize: "20px", margin: 0 }}>New Household + Child</h2>
                  <button onClick={closeModal} style={{ background: "none", border: "none", color: MUTED, fontSize: "20px", cursor: "pointer", lineHeight: 1 }}>×</button>
                </div>

                {formError && (
                  <div style={{ padding: "10px 14px", background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, color: "#f87171", fontSize: "13px", marginBottom: 16 }}>
                    {formError}
                  </div>
                )}

                <SectionLabel>Parent / Guardian</SectionLabel>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                  <div>
                    <label style={labelStyle}>First Name <Req /></label>
                    <input style={inputStyle} value={newParentForm.parent1_first_name} onChange={e => setNewParentForm(f => ({ ...f, parent1_first_name: e.target.value }))} placeholder="Jane" />
                  </div>
                  <div>
                    <label style={labelStyle}>Last Name <Req /></label>
                    <input style={inputStyle} value={newParentForm.parent1_last_name} onChange={e => setNewParentForm(f => ({ ...f, parent1_last_name: e.target.value }))} placeholder="Smith" />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
                  <div>
                    <label style={labelStyle}>Mobile Phone</label>
                    <input style={inputStyle} type="tel" value={newParentForm.parent1_phone} onChange={e => setNewParentForm(f => ({ ...f, parent1_phone: e.target.value }))} placeholder="(555) 123-4567" />
                  </div>
                  <div>
                    <label style={labelStyle}>Email</label>
                    <input style={inputStyle} type="email" value={newParentForm.parent1_email} onChange={e => setNewParentForm(f => ({ ...f, parent1_email: e.target.value }))} placeholder="jane@example.com" />
                  </div>
                </div>

                <ChildFields form={childForm} setForm={setChildForm} />

                {formError && (
                  <div style={{ padding: "10px 14px", background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, color: "#f87171", fontSize: "13px", marginBottom: 16 }}>
                    {formError}
                  </div>
                )}

                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => setStep("pick-household")} style={{ padding: "11px 16px", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", color: MUTED, fontSize: "13px", cursor: "pointer" }}>Back</button>
                  <button
                    onClick={submitNewHouseholdAndChild}
                    disabled={saving}
                    style={{ flex: 1, padding: "11px", background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`, border: "none", borderRadius: "10px", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}
                  >
                    {saving ? "Saving…" : "Create Household & Add Child"}
                  </button>
                </div>
              </div>
            )}

            {/* Step: Child form for existing household */}
            {step === "child-form" && selectedFamily && (
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <h2 style={{ color: "#ffffff", fontFamily: "Georgia, serif", fontSize: "20px", margin: 0 }}>Add Child</h2>
                  <button onClick={closeModal} style={{ background: "none", border: "none", color: MUTED, fontSize: "20px", cursor: "pointer", lineHeight: 1 }}>×</button>
                </div>
                <p style={{ color: MUTED, fontSize: "12px", margin: "0 0 20px" }}>
                  Household: <strong style={{ color: "#fff" }}>{selectedFamily.parent1_first_name} {selectedFamily.parent1_last_name}</strong>
                </p>

                {formError && (
                  <div style={{ padding: "10px 14px", background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, color: "#f87171", fontSize: "13px", marginBottom: 16 }}>
                    {formError}
                  </div>
                )}

                <ChildFields form={childForm} setForm={setChildForm} />

                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => { setStep("pick-household"); setSelectedFamily(null); }} style={{ padding: "11px 16px", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", color: MUTED, fontSize: "13px", cursor: "pointer" }}>Back</button>
                  <button
                    onClick={submitChildForm}
                    disabled={saving}
                    style={{ flex: 1, padding: "11px", background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`, border: "none", borderRadius: "10px", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}
                  >
                    {saving ? "Saving…" : "Add Child"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}

function ChildFields({ form, setForm }: {
  form: typeof BLANK_CHILD;
  setForm: React.Dispatch<React.SetStateAction<typeof BLANK_CHILD>>;
}) {
  return (
    <>
      <SectionLabel>Child Information</SectionLabel>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
        <div>
          <label style={labelStyle}>First Name <Req /></label>
          <input style={inputStyle} value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} placeholder="Emma" />
        </div>
        <div>
          <label style={labelStyle}>Last Name <Req /></label>
          <input style={inputStyle} value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} placeholder="Smith" />
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
        <div>
          <label style={labelStyle}>Date of Birth</label>
          <input style={inputStyle} type="date" value={form.date_of_birth} onChange={e => setForm(f => ({ ...f, date_of_birth: e.target.value }))} />
        </div>
        <div>
          <label style={labelStyle}>Grade</label>
          <input style={inputStyle} value={form.grade} onChange={e => setForm(f => ({ ...f, grade: e.target.value }))} placeholder="3rd" />
        </div>
      </div>

      <SectionLabel>Safety Information</SectionLabel>
      <div style={{ marginBottom: 10 }}>
        <label style={labelStyle}>Allergies</label>
        <input style={inputStyle} value={form.allergies} onChange={e => setForm(f => ({ ...f, allergies: e.target.value }))} placeholder="Peanuts, tree nuts…" />
      </div>
      <div style={{ marginBottom: 10 }}>
        <label style={labelStyle}>Medical Notes</label>
        <input style={inputStyle} value={form.medical_notes} onChange={e => setForm(f => ({ ...f, medical_notes: e.target.value }))} placeholder="EpiPen in bag, asthma inhaler…" />
      </div>
      <div style={{ marginBottom: 10 }}>
        <label style={labelStyle}>Care Notes / Special Instructions</label>
        <input style={inputStyle} value={form.special_instructions} onChange={e => setForm(f => ({ ...f, special_instructions: e.target.value }))} placeholder="Needs bathroom reminders, separation anxiety…" />
      </div>
      <div style={{ marginBottom: 10 }}>
        <label style={labelStyle}>Authorized Pickups</label>
        <input style={inputStyle} value={form.authorized_pickups} onChange={e => setForm(f => ({ ...f, authorized_pickups: e.target.value }))} placeholder="Grandma Rose, Uncle Bob…" />
      </div>
      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>Photo Permission</label>
        <select
          value={form.photo_permission_status}
          onChange={e => setForm(f => ({ ...f, photo_permission_status: e.target.value as typeof form.photo_permission_status }))}
          style={{ ...inputStyle, cursor: "pointer" }}
        >
          <option value="not_reviewed" style={{ background: "#ffffff", color: "#000000" }}>Not yet reviewed</option>
          <option value="granted" style={{ background: "#ffffff", color: "#000000" }}>Granted</option>
          <option value="denied" style={{ background: "#ffffff", color: "#000000" }}>Denied</option>
        </select>
      </div>
    </>
  );
}

export default function ChildrenPage() {
  return (
    <Suspense fallback={null}>
      <ChildrenContent />
    </Suspense>
  );
}
