"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AppShell from "@/components/layout/AppShell";
import { selectedChurchHeaders } from "@/lib/selected-church";

const supabase = createClient();

const ACCENT  = "#7B2CBF";
const ACCENT2 = "#9D4EDD";
const GOLD    = "#D4AF37";
const CARD    = "#120A1F";
const MUTED   = "#A9A9B8";

type Parent = {
  id: string;
  parent1_first_name: string;
  parent1_last_name: string;
  parent1_phone: string | null;
  parent1_email: string | null;
  visit_date: string;
  status: string;
};

type DupFamily = {
  id: string;
  parent1_first_name: string;
  parent1_last_name: string;
  parent1_phone: string | null;
  parent1_email: string | null;
  status: string;
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  new:       { bg: "rgba(59,130,246,0.15)",  text: "#60a5fa" },
  contacted: { bg: "rgba(245,158,11,0.15)",  text: "#fbbf24" },
  returning: { bg: "rgba(157,78,221,0.2)",   text: "#c084fc" },
  converted: { bg: "rgba(34,197,94,0.15)",   text: "#4ade80" },
};

const BLANK_FORM = {
  parent1_first_name: "", parent1_last_name: "",
  parent1_phone: "", parent1_email: "",
  parent2_first_name: "", parent2_last_name: "",
  parent2_phone: "", parent2_email: "",
  address: "", city: "", state: "", zip: "",
  emergency_contact_name: "", emergency_contact_phone: "",
  preferred_language: "",
};

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

export default function ParentsPage() {
  const router = useRouter();
  const [loading, setLoading]   = useState(true);
  const [token, setToken]       = useState<string | null>(null);
  const [parents, setParents]   = useState<Parent[]>([]);
  const [search, setSearch]     = useState("");

  // Modal state
  const [showModal, setShowModal]   = useState(false);
  const [form, setForm]             = useState(BLANK_FORM);
  const [saving, setSaving]         = useState(false);
  const [formError, setFormError]   = useState<string | null>(null);
  const [dupes, setDupes]           = useState<DupFamily[] | null>(null);
  const [createdFamily, setCreatedFamily] = useState<{ id: string; name: string } | null>(null);

  function authHeaders(t: string) {
    return { Authorization: `Bearer ${t}`, ...selectedChurchHeaders() };
  }

  async function loadParents(t: string) {
    const res = await fetch("/api/children-ministry/parents", { headers: authHeaders(t) });
    if (res.ok) { const d = await res.json(); setParents(d.parents ?? []); }
  }

  useEffect(() => {
    async function init() {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (!user || error) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setToken(session.access_token);
      await loadParents(session.access_token);
      setLoading(false);
    }
    init();
  }, [router]);

  function openModal() {
    setForm(BLANK_FORM);
    setFormError(null);
    setDupes(null);
    setCreatedFamily(null);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setDupes(null);
    setCreatedFamily(null);
    setFormError(null);
  }

  async function submitForm(force = false) {
    if (!token) return;
    setFormError(null);
    setSaving(true);
    const res = await fetch("/api/children-ministry/parents", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders(token) },
      body: JSON.stringify({ ...form, force }),
    });
    const data = await res.json();
    setSaving(false);

    if (res.status === 409 && data.duplicates) {
      setDupes(data.duplicates);
      return;
    }
    if (!res.ok) {
      setFormError(data.error ?? "Something went wrong.");
      return;
    }

    const f = data.family;
    setCreatedFamily({ id: f.id, name: `${f.parent1_first_name} ${f.parent1_last_name}` });
    await loadParents(token);
  }

  const filtered = parents.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    const name = `${p.parent1_first_name} ${p.parent1_last_name}`.toLowerCase();
    const phone = (p.parent1_phone ?? "").replace(/\D/g, "");
    return name.includes(q) || phone.includes(q.replace(/\D/g, "")) || (p.parent1_phone ?? "").includes(q) || (p.parent1_email ?? "").toLowerCase().includes(q);
  });

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#08060D" }}>
      <div style={{ color: "#D8D8E8" }}>Loading…</div>
    </div>
  );

  return (
    <AppShell navItems={[]}>
      {/* Header */}
      <div style={{ padding: "40px 32px 32px", background: "linear-gradient(135deg, #08060D 0%, #1C0A30 100%)" }}>
        <p style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.06em", color: GOLD, marginBottom: "6px", textTransform: "uppercase" }}>
          ShepherdKids
        </p>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16 }}>
          <div>
            <h1 style={{ fontSize: "28px", fontWeight: 700, color: "#ffffff", margin: 0, fontFamily: "Georgia, serif" }}>Families</h1>
            <p style={{ fontSize: "13px", color: "#D8D8E8", margin: "6px 0 0" }}>
              {parents.length} registered {parents.length === 1 ? "family" : "families"}
            </p>
          </div>
          <button
            onClick={openModal}
            style={{
              padding: "10px 20px",
              background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`,
              border: "none",
              borderRadius: "12px",
              color: "#ffffff",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            + Add Parent
          </button>
        </div>
      </div>

      <div style={{ backgroundColor: "#0A0814", minHeight: "100vh", padding: "32px" }}>
        {/* Search */}
        <div style={{ marginBottom: "20px" }}>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, phone, or email…"
            autoFocus
            style={inputStyle}
          />
        </div>

        {/* Empty state */}
        {filtered.length === 0 ? (
          <div style={{ background: CARD, border: "1px solid rgba(212,175,55,0.22)", borderRadius: "18px", padding: "64px 32px", textAlign: "center" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>👨‍👩‍👧</div>
            <p style={{ color: MUTED, fontWeight: 600, fontSize: "14px", margin: 0 }}>
              {search ? "No families match your search." : "No families registered yet."}
            </p>
            {!search && (
              <button
                onClick={openModal}
                style={{ marginTop: "16px", padding: "10px 20px", background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`, border: "none", borderRadius: "10px", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}
              >
                + Add Parent
              </button>
            )}
          </div>
        ) : (
          <div style={{ background: CARD, border: "1px solid rgba(212,175,55,0.22)", borderRadius: "18px", overflow: "hidden" }}>
            {filtered.map((p, i) => {
              const sc = STATUS_COLORS[p.status] ?? { bg: "rgba(255,255,255,0.08)", text: MUTED };
              return (
                <div
                  key={p.id}
                  onClick={() => router.push(`/dashboard/children-ministry/parents/${p.id}`)}
                  style={{ padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", borderBottom: i < filtered.length - 1 ? "1px solid rgba(212,175,55,0.1)" : "none", cursor: "pointer" }}
                  onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.backgroundColor = "rgba(123,44,191,0.1)"}
                  onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.backgroundColor = "transparent"}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 600, color: "#ffffff", fontSize: "14px", margin: 0 }}>
                      {p.parent1_first_name} {p.parent1_last_name}
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginTop: "3px" }}>
                      {p.parent1_phone && <span style={{ fontSize: "12px", color: MUTED }}>{p.parent1_phone}</span>}
                      {p.parent1_email && <span style={{ fontSize: "12px", color: MUTED }}>{p.parent1_email}</span>}
                    </div>
                  </div>
                  <div style={{ flexShrink: 0, textAlign: "right" }}>
                    <span style={{ fontSize: "11px", fontWeight: 700, padding: "3px 10px", borderRadius: "20px", textTransform: "capitalize", backgroundColor: sc.bg, color: sc.text }}>
                      {p.status}
                    </span>
                    <p style={{ fontSize: "11px", color: MUTED, margin: "4px 0 0" }}>{fmtDate(p.visit_date)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Parent Modal */}
      {showModal && (
        <div
          style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20 }}
          onClick={e => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div style={{ backgroundColor: CARD, border: "1px solid rgba(212,175,55,0.3)", borderRadius: 24, padding: 32, width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto" }}>

            {/* Success state */}
            {createdFamily ? (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "48px", marginBottom: "12px" }}>✅</div>
                <h2 style={{ color: "#ffffff", fontFamily: "Georgia, serif", fontSize: "20px", margin: "0 0 8px" }}>Household Created</h2>
                <p style={{ color: MUTED, fontSize: "13px", margin: "0 0 28px" }}>
                  <strong style={{ color: "#fff" }}>{createdFamily.name}</strong> has been added to Families and Household Records.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <button
                    onClick={() => { closeModal(); router.push(`/dashboard/children-ministry/children?addChild=${createdFamily.id}`); }}
                    style={{ padding: "11px", background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`, border: "none", borderRadius: "10px", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}
                  >
                    Add Child to This Household
                  </button>
                  <button
                    onClick={() => { closeModal(); router.push(`/dashboard/children-ministry/parents/${createdFamily.id}`); }}
                    style={{ padding: "11px", background: "transparent", border: `1px solid rgba(212,175,55,0.4)`, borderRadius: "10px", color: GOLD, fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
                  >
                    View Household Record
                  </button>
                  <button
                    onClick={closeModal}
                    style={{ padding: "11px", background: "transparent", border: "none", color: MUTED, fontSize: "13px", cursor: "pointer" }}
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : dupes ? (
              /* Duplicate warning */
              <div>
                <h2 style={{ color: GOLD, fontFamily: "Georgia, serif", fontSize: "18px", margin: "0 0 8px" }}>Possible Duplicate</h2>
                <p style={{ color: "#D8D8E8", fontSize: "13px", margin: "0 0 16px" }}>
                  We found {dupes.length === 1 ? "a household" : "households"} that may already match this family:
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
                  {dupes.map(d => (
                    <div key={d.id} style={{ padding: "12px 16px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(212,175,55,0.2)", borderRadius: 10 }}>
                      <p style={{ color: "#fff", fontWeight: 600, fontSize: "13px", margin: 0 }}>{d.parent1_first_name} {d.parent1_last_name}</p>
                      <p style={{ color: MUTED, fontSize: "12px", margin: "3px 0 0" }}>{[d.parent1_phone, d.parent1_email].filter(Boolean).join(" · ")}</p>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <button
                    onClick={() => { setDupes(null); router.push(`/dashboard/children-ministry/parents/${dupes[0].id}`); closeModal(); }}
                    style={{ padding: "10px", background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`, border: "none", borderRadius: "10px", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}
                  >
                    Use Existing Household
                  </button>
                  <button
                    onClick={() => submitForm(true)}
                    disabled={saving}
                    style={{ padding: "10px", background: "transparent", border: "1px solid rgba(212,175,55,0.4)", borderRadius: "10px", color: GOLD, fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
                  >
                    {saving ? "Creating…" : "Create Anyway"}
                  </button>
                  <button
                    onClick={() => setDupes(null)}
                    style={{ padding: "10px", background: "transparent", border: "none", color: MUTED, fontSize: "13px", cursor: "pointer" }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              /* Form */
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                  <h2 style={{ color: "#ffffff", fontFamily: "Georgia, serif", fontSize: "20px", margin: 0 }}>Add Parent</h2>
                  <button onClick={closeModal} style={{ background: "none", border: "none", color: MUTED, fontSize: "20px", cursor: "pointer", lineHeight: 1 }}>×</button>
                </div>

                {formError && (
                  <div style={{ padding: "10px 14px", background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, color: "#f87171", fontSize: "13px", marginBottom: 16 }}>
                    {formError}
                  </div>
                )}

                <SectionLabel>Primary Guardian</SectionLabel>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                  <div>
                    <label style={labelStyle}>First Name <Req /></label>
                    <input style={inputStyle} value={form.parent1_first_name} onChange={e => setForm(f => ({ ...f, parent1_first_name: e.target.value }))} placeholder="Jane" />
                  </div>
                  <div>
                    <label style={labelStyle}>Last Name <Req /></label>
                    <input style={inputStyle} value={form.parent1_last_name} onChange={e => setForm(f => ({ ...f, parent1_last_name: e.target.value }))} placeholder="Smith" />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
                  <div>
                    <label style={labelStyle}>Mobile Phone</label>
                    <input style={inputStyle} type="tel" value={form.parent1_phone} onChange={e => setForm(f => ({ ...f, parent1_phone: e.target.value }))} placeholder="(555) 123-4567" />
                  </div>
                  <div>
                    <label style={labelStyle}>Email</label>
                    <input style={inputStyle} type="email" value={form.parent1_email} onChange={e => setForm(f => ({ ...f, parent1_email: e.target.value }))} placeholder="jane@example.com" />
                  </div>
                </div>

                <SectionLabel>Second Guardian (optional)</SectionLabel>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                  <div>
                    <label style={labelStyle}>First Name</label>
                    <input style={inputStyle} value={form.parent2_first_name} onChange={e => setForm(f => ({ ...f, parent2_first_name: e.target.value }))} placeholder="John" />
                  </div>
                  <div>
                    <label style={labelStyle}>Last Name</label>
                    <input style={inputStyle} value={form.parent2_last_name} onChange={e => setForm(f => ({ ...f, parent2_last_name: e.target.value }))} placeholder="Smith" />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
                  <div>
                    <label style={labelStyle}>Mobile Phone</label>
                    <input style={inputStyle} type="tel" value={form.parent2_phone} onChange={e => setForm(f => ({ ...f, parent2_phone: e.target.value }))} placeholder="(555) 123-4567" />
                  </div>
                  <div>
                    <label style={labelStyle}>Email</label>
                    <input style={inputStyle} type="email" value={form.parent2_email} onChange={e => setForm(f => ({ ...f, parent2_email: e.target.value }))} placeholder="john@example.com" />
                  </div>
                </div>

                <SectionLabel>Home Address (optional)</SectionLabel>
                <div style={{ marginBottom: 10 }}>
                  <label style={labelStyle}>Street Address</label>
                  <input style={inputStyle} value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="123 Main St" />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
                  <div>
                    <label style={labelStyle}>City</label>
                    <input style={inputStyle} value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="Springfield" />
                  </div>
                  <div>
                    <label style={labelStyle}>State</label>
                    <input style={inputStyle} value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} placeholder="IL" maxLength={2} />
                  </div>
                  <div>
                    <label style={labelStyle}>ZIP</label>
                    <input style={inputStyle} value={form.zip} onChange={e => setForm(f => ({ ...f, zip: e.target.value }))} placeholder="62701" />
                  </div>
                </div>

                <SectionLabel>Emergency Contact (optional)</SectionLabel>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
                  <div>
                    <label style={labelStyle}>Name</label>
                    <input style={inputStyle} value={form.emergency_contact_name} onChange={e => setForm(f => ({ ...f, emergency_contact_name: e.target.value }))} placeholder="Grandma Rose" />
                  </div>
                  <div>
                    <label style={labelStyle}>Phone</label>
                    <input style={inputStyle} type="tel" value={form.emergency_contact_phone} onChange={e => setForm(f => ({ ...f, emergency_contact_phone: e.target.value }))} placeholder="(555) 987-6543" />
                  </div>
                </div>

                <SectionLabel>Preferences (optional)</SectionLabel>
                <div style={{ marginBottom: 24 }}>
                  <label style={labelStyle}>Preferred Language</label>
                  <input style={inputStyle} value={form.preferred_language} onChange={e => setForm(f => ({ ...f, preferred_language: e.target.value }))} placeholder="English" />
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={() => submitForm(false)}
                    disabled={saving}
                    style={{ flex: 1, padding: "11px", background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`, border: "none", borderRadius: "10px", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}
                  >
                    {saving ? "Saving…" : "Create Household"}
                  </button>
                  <button
                    onClick={closeModal}
                    style={{ padding: "11px 18px", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", color: MUTED, fontSize: "13px", cursor: "pointer" }}
                  >
                    Cancel
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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: "11px", fontWeight: 700, color: GOLD, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 10px" }}>
      {children}
    </p>
  );
}

function Req() {
  return <span style={{ color: "#f87171" }}>*</span>;
}
