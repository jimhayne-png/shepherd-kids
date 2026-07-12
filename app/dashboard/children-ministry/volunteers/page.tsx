"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import AppShell from "@/components/layout/AppShell";
import { selectedChurchHeaders } from "@/lib/selected-church";

const supabase = createClient();
const ACCENT = "#7B2CBF";

type Volunteer = {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  background_check_status: string;
  background_check_date: string | null;
  is_active: boolean;
  notes: string | null;
  approved: boolean;
  has_pin: boolean;
  classrooms: { id: string; name: string }[];
  last_issued_at: string | null;
  is_signed_in: boolean;
  current_room_name: string | null;
};

type Room = { id: string; name: string };

const BG_COLORS: Record<string, string> = {
  cleared: "#22c55e",
  pending: "#f59e0b",
  expired: "#ef4444",
  denied: "#ef4444",
  not_recorded: "#9ca3af",
};

const BG_LABELS: Record<string, string> = {
  cleared: "Cleared",
  pending: "Pending",
  expired: "Expired",
  denied: "Denied",
  not_recorded: "Not Recorded",
};

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
}

const inputStyle = {
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(212,175,55,0.3)",
  color: "#ffffff",
  outline: "none",
} as const;

const selectStyle = {
  ...inputStyle,
  colorScheme: "dark",
} as const;

const defaultForm = {
  first_name: "", last_name: "", email: "", phone: "",
  background_check_status: "not_recorded", background_check_date: "",
  approved: false, is_active: true, newPin: "", notes: "",
  classroom_ids: [] as string[],
};

function VolunteerAccessContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);

  const [showModal, setShowModal] = useState(false);
  const [editVol, setEditVol] = useState<Volunteer | null>(null);
  const [form, setForm] = useState({ ...defaultForm });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  async function loadData(t: string) {
    const [vRes, rRes] = await Promise.all([
      fetch("/api/children-ministry/volunteers", { headers: { Authorization: `Bearer ${t}`, ...selectedChurchHeaders() } }),
      fetch("/api/checkin/rooms", { credentials: "include", headers: selectedChurchHeaders() }),
    ]);
    if (vRes.ok) setVolunteers((await vRes.json()).volunteers ?? []);
    if (rRes.ok) setRooms(((await rRes.json()).rooms ?? []).filter((r: Room & { is_active?: boolean }) => r.is_active !== false));
  }

  useEffect(() => {
    async function init() {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (!user || error) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const t = session.access_token;
      setToken(t);
      await loadData(t);
      setLoading(false);
    }
    init();
  }, [router]);

  function openAdd() {
    setEditVol(null);
    setForm({ ...defaultForm });
    setFormError("");
    setShowModal(true);
  }

  function openEdit(v: Volunteer) {
    setEditVol(v);
    setForm({
      first_name: v.first_name,
      last_name: v.last_name,
      email: v.email ?? "",
      phone: v.phone ?? "",
      background_check_status: v.background_check_status,
      background_check_date: v.background_check_date ?? "",
      approved: v.approved,
      is_active: v.is_active,
      newPin: "",
      notes: v.notes ?? "",
      classroom_ids: v.classrooms.map(c => c.id),
    });
    setFormError("");
    setShowModal(true);
  }

  async function save() {
    if (!token || !form.first_name.trim() || !form.last_name.trim()) {
      setFormError("First and last name are required.");
      return;
    }
    setSaving(true);
    setFormError("");

    const payload: Record<string, unknown> = {
      first_name: form.first_name,
      last_name: form.last_name,
      email: form.email,
      phone: form.phone,
      background_check_status: form.background_check_status,
      background_check_date: form.background_check_date || undefined,
      approved: form.approved,
      is_active: form.is_active,
      notes: form.notes,
      classroom_ids: form.classroom_ids,
    };
    if (form.newPin) payload.pin = form.newPin;

    const url = editVol ? `/api/children-ministry/volunteers/${editVol.id}` : "/api/children-ministry/volunteers";
    const method = editVol ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...selectedChurchHeaders() },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const d = await res.json();
      setFormError(d.error ?? "Failed to save.");
      setSaving(false);
      return;
    }

    setSaving(false);
    setShowModal(false);
    await loadData(token);
  }

  async function quickToggle(v: Volunteer, field: "approved" | "is_active", value: boolean) {
    if (!token) return;
    await fetch(`/api/children-ministry/volunteers/${v.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...selectedChurchHeaders() },
      body: JSON.stringify({ [field]: value }),
    });
    await loadData(token);
  }

  // Summary cards
  const stats = useMemo(() => {
    const approved = volunteers.filter(v => v.is_active && v.approved && v.background_check_status === "cleared" && v.has_pin).length;
    const expiring = volunteers.filter(v => v.background_check_status === "expired").length;
    const coveredRooms = new Set(
      volunteers
        .filter(v => v.is_active && v.approved && v.background_check_status === "cleared")
        .flatMap(v => v.classrooms.map(c => c.id))
    ).size;
    const signedIn = volunteers.filter(v => v.is_signed_in).length;
    return { approved, expiring, coveredRooms, signedIn };
  }, [volunteers]);

  const accessReady = (v: Volunteer) =>
    v.is_active && v.approved && v.background_check_status === "cleared" && v.has_pin && v.classrooms.length > 0;

  const missingRequirements = useMemo(() => {
    if (!editVol) return [];
    const missing: string[] = [];
    if (!form.is_active) missing.push("Not active");
    if (!form.approved) missing.push("Not approved");
    if (form.background_check_status !== "cleared") missing.push(`Background check: ${BG_LABELS[form.background_check_status] ?? form.background_check_status}`);
    if (!editVol.has_pin && !form.newPin) missing.push("No PIN configured");
    if (form.classroom_ids.length === 0) missing.push("No classrooms assigned");
    return missing;
  }, [editVol, form]);

  function toggleClassroom(roomId: string) {
    setForm(f => ({
      ...f,
      classroom_ids: f.classroom_ids.includes(roomId)
        ? f.classroom_ids.filter(id => id !== roomId)
        : [...f.classroom_ids, roomId],
    }));
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#08060D" }}>
        <div style={{ color: "#D8D8E8" }}>Loading…</div>
      </div>
    );
  }

  const card = "rounded-2xl overflow-hidden";
  const tableStyle = { background: "#120A1F", border: "1px solid rgba(212,175,55,0.22)" };
  const thStyle = "text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider";
  const thColor = { color: "#A9A9B8" };
  const tdStyle = "px-4 py-3 text-sm";
  const tdColor = { color: "#D8D8E8" };
  const dimColor = { color: "#A9A9B8" };
  const rowBorder = { borderBottom: "1px solid rgba(212,175,55,0.08)" };

  return (
    <AppShell navItems={[]}>
      {/* Header */}
      <div className="px-8 py-10" style={{ background: "linear-gradient(135deg, #08060D 0%, #1C0A30 100%)" }}>
        <p className="text-sm mb-1" style={{ color: "#D4AF37" }}>ShepherdKids — Check-In</p>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "Georgia, serif" }}>Volunteer Access</h1>
            <p className="text-sm mt-1" style={{ color: "#A9A9B8" }}>Approve and manage volunteers who may securely access classrooms and child care information.</p>
          </div>
          <Link href="/dashboard/children-ministry/volunteer-audit" className="px-4 py-2 rounded-xl text-sm font-bold shrink-0"
            style={{ backgroundColor: "rgba(212,175,55,0.12)", color: "#D4AF37", border: "1px solid rgba(212,175,55,0.3)" }}>
            Audit Log →
          </Link>
        </div>
      </div>

      <div className="px-8 py-8" style={{ backgroundColor: "#0A0814", minHeight: "100vh" }}>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Approved Volunteers", value: stats.approved, sub: "Active · Approved · BG Cleared · PIN set", color: "#9D4EDD" },
            { label: "BG Checks Expiring", value: stats.expiring, sub: "Status: expired", color: "#ef4444" },
            { label: "Classrooms Covered", value: stats.coveredRooms, sub: "Rooms with approved volunteers", color: "#22c55e" },
            { label: "Currently Signed In", value: stats.signedIn, sub: "Active sessions right now", color: "#3b82f6" },
          ].map(s => (
            <div key={s.label} className="rounded-xl px-5 py-4" style={{ background: "#120A1F", border: "1px solid rgba(212,175,55,0.22)" }}>
              <p className="text-2xl font-bold mb-0.5" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs font-semibold" style={{ color: "#ffffff" }}>{s.label}</p>
              <p className="text-xs mt-0.5" style={{ color: "#A9A9B8" }}>{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Add button */}
        <div className="flex justify-end mb-4">
          <button onClick={openAdd} className="px-5 py-2.5 rounded-xl font-bold text-white text-sm" style={{ backgroundColor: ACCENT }}>
            + Add Volunteer
          </button>
        </div>

        {/* Volunteer table */}
        <div className={card} style={tableStyle}>
          {volunteers.length === 0 ? (
            <div className="p-12 text-center">
              <p style={{ color: "#A9A9B8" }}>No volunteers yet. Add your first volunteer to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(212,175,55,0.12)" }}>
                    <th className={thStyle} style={thColor}>Volunteer</th>
                    <th className={`${thStyle} hidden md:table-cell`} style={thColor}>Contact</th>
                    <th className={thStyle} style={thColor}>Background Check</th>
                    <th className={`${thStyle} hidden sm:table-cell`} style={thColor}>Approved Access</th>
                    <th className={`${thStyle} hidden lg:table-cell`} style={thColor}>PIN</th>
                    <th className={`${thStyle} hidden lg:table-cell`} style={thColor}>Classrooms</th>
                    <th className={`${thStyle} hidden xl:table-cell`} style={thColor}>Current Status</th>
                    <th className={`${thStyle} hidden xl:table-cell`} style={thColor}>Last Sign-In</th>
                    <th className={thStyle} />
                  </tr>
                </thead>
                <tbody>
                  {volunteers.map(v => (
                    <tr key={v.id} style={rowBorder}
                      onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.backgroundColor = "rgba(123,44,191,0.08)"}
                      onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.backgroundColor = "transparent"}>
                      {/* Volunteer */}
                      <td className={tdStyle}>
                        <div className="flex items-center gap-2">
                          <div>
                            <p className="font-semibold" style={{ color: "#ffffff" }}>{v.first_name} {v.last_name}</p>
                            {!v.is_active && (
                              <span className="text-xs px-1.5 py-0.5 rounded font-bold" style={{ background: "rgba(239,68,68,0.15)", color: "#f87171" }}>Inactive</span>
                            )}
                            {v.is_active && accessReady(v) && (
                              <span className="text-xs px-1.5 py-0.5 rounded font-bold" style={{ background: "rgba(34,197,94,0.12)", color: "#4ade80" }}>Access Ready</span>
                            )}
                          </div>
                        </div>
                      </td>
                      {/* Contact */}
                      <td className={`${tdStyle} hidden md:table-cell`}>
                        {v.phone && <p className="text-xs" style={dimColor}>{v.phone}</p>}
                        {v.email && <p className="text-xs" style={dimColor}>{v.email}</p>}
                        {!v.phone && !v.email && <span className="text-xs" style={dimColor}>—</span>}
                      </td>
                      {/* Background Check */}
                      <td className={tdStyle}>
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold text-white" style={{ backgroundColor: BG_COLORS[v.background_check_status] ?? "#9ca3af" }}>
                          {BG_LABELS[v.background_check_status] ?? v.background_check_status}
                        </span>
                        {v.background_check_date && (
                          <p className="text-xs mt-0.5" style={dimColor}>{new Date(v.background_check_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                        )}
                      </td>
                      {/* Approved Access */}
                      <td className={`${tdStyle} hidden sm:table-cell`}>
                        {v.approved
                          ? <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: "rgba(123,44,191,0.2)", color: "#c084fc" }}>Approved</span>
                          : <span className="text-xs" style={dimColor}>Not Approved</span>}
                      </td>
                      {/* PIN */}
                      <td className={`${tdStyle} hidden lg:table-cell`}>
                        {v.has_pin
                          ? <span className="text-xs font-semibold" style={{ color: "#4ade80" }}>Configured</span>
                          : <span className="text-xs" style={{ color: "#f87171" }}>Not Configured</span>}
                      </td>
                      {/* Classrooms */}
                      <td className={`${tdStyle} hidden lg:table-cell`}>
                        {v.classrooms.length > 0
                          ? <div className="flex flex-wrap gap-1">{v.classrooms.map(c => <span key={c.id} className="text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(212,175,55,0.1)", color: "#D4AF37" }}>{c.name}</span>)}</div>
                          : <span className="text-xs" style={dimColor}>—</span>}
                      </td>
                      {/* Current Status */}
                      <td className={`${tdStyle} hidden xl:table-cell`}>
                        {v.is_signed_in
                          ? <span className="text-xs font-semibold" style={{ color: "#4ade80" }}>Signed In{v.current_room_name ? ` — ${v.current_room_name}` : ""}</span>
                          : <span className="text-xs" style={dimColor}>Not Signed In</span>}
                      </td>
                      {/* Last Sign-In */}
                      <td className={`${tdStyle} hidden xl:table-cell`}>
                        {v.last_issued_at
                          ? <span className="text-xs" style={dimColor}>{fmtDateTime(v.last_issued_at)}</span>
                          : <span className="text-xs" style={dimColor}>Never</span>}
                      </td>
                      {/* Actions */}
                      <td className={tdStyle}>
                        <div className="flex flex-wrap gap-1.5 justify-end">
                          <button onClick={() => openEdit(v)} className="px-2.5 py-1 rounded-lg text-xs font-bold" style={{ border: "1px solid rgba(212,175,55,0.3)", color: "#A9A9B8", background: "transparent" }}>
                            Edit Access
                          </button>
                          {v.approved
                            ? <button onClick={() => quickToggle(v, "approved", false)} className="px-2.5 py-1 rounded-lg text-xs font-bold" style={{ border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", background: "transparent" }}>Revoke</button>
                            : <button onClick={() => quickToggle(v, "approved", true)} className="px-2.5 py-1 rounded-lg text-xs font-bold" style={{ border: "1px solid rgba(34,197,94,0.3)", color: "#4ade80", background: "transparent" }}>Approve</button>}
                          {v.is_active
                            ? <button onClick={() => quickToggle(v, "is_active", false)} className="px-2.5 py-1 rounded-lg text-xs font-bold" style={{ border: "1px solid rgba(239,68,68,0.2)", color: "#9ca3af", background: "transparent" }}>Deactivate</button>
                            : <button onClick={() => quickToggle(v, "is_active", true)} className="px-2.5 py-1 rounded-lg text-xs font-bold" style={{ border: "1px solid rgba(34,197,94,0.2)", color: "#4ade80", background: "transparent" }}>Reactivate</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4" onClick={() => setShowModal(false)}>
          <div className="rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto" style={{ background: "#120A1F", border: "1px solid rgba(212,175,55,0.3)" }} onClick={e => e.stopPropagation()}>
            {/* Modal header */}
            <div className="p-6 sticky top-0 z-10" style={{ borderBottom: "1px solid rgba(212,175,55,0.15)", background: "#120A1F" }}>
              <h2 className="text-xl font-bold" style={{ fontFamily: "Georgia, serif", color: "#ffffff" }}>
                {editVol ? `Vetted Classroom Access — ${editVol.first_name} ${editVol.last_name}` : "Add Volunteer"}
              </h2>
            </div>

            <div className="p-6 space-y-5">
              {/* Access summary (edit only) */}
              {editVol && (
                <div className="rounded-xl p-4" style={{
                  background: missingRequirements.length === 0 ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
                  border: `1px solid ${missingRequirements.length === 0 ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.25)"}`,
                }}>
                  {missingRequirements.length === 0 ? (
                    <p className="text-sm font-bold" style={{ color: "#4ade80" }}>Access Ready — this volunteer can sign into classrooms and scan child labels.</p>
                  ) : (
                    <>
                      <p className="text-sm font-bold mb-2" style={{ color: "#f87171" }}>Access not ready — missing:</p>
                      <ul className="space-y-0.5">
                        {missingRequirements.map(r => <li key={r} className="text-xs" style={{ color: "#f87171" }}>· {r}</li>)}
                      </ul>
                    </>
                  )}
                </div>
              )}

              {/* Name */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "#A9A9B8" }}>First Name *</label>
                  <input value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} className="w-full px-3 py-2 rounded-lg text-sm" style={inputStyle} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "#A9A9B8" }}>Last Name *</label>
                  <input value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} className="w-full px-3 py-2 rounded-lg text-sm" style={inputStyle} />
                </div>
              </div>

              {/* Contact */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "#A9A9B8" }}>Phone</label>
                  <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="w-full px-3 py-2 rounded-lg text-sm" style={inputStyle} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "#A9A9B8" }}>Email</label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="w-full px-3 py-2 rounded-lg text-sm" style={inputStyle} />
                </div>
              </div>

              {/* Active */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium" style={{ color: "#ffffff" }}>Active</p>
                  <p className="text-xs" style={{ color: "#A9A9B8" }}>Inactive volunteers cannot sign into classrooms</p>
                </div>
                <button type="button" onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))} className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0" style={{ backgroundColor: form.is_active ? ACCENT : "rgba(255,255,255,0.15)" }}>
                  <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform" style={{ transform: form.is_active ? "translateX(1.375rem)" : "translateX(0.125rem)" }} />
                </button>
              </div>

              {/* Background Check */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "#A9A9B8" }}>Background Check Status</label>
                  <select value={form.background_check_status} onChange={e => setForm(f => ({ ...f, background_check_status: e.target.value }))} className="w-full px-3 py-2 rounded-lg text-sm" style={selectStyle}>
                    <option value="not_recorded">Not Recorded</option>
                    <option value="pending">Pending</option>
                    <option value="cleared">Cleared</option>
                    <option value="expired">Expired</option>
                    <option value="denied">Denied</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "#A9A9B8" }}>Background Check Date</label>
                  <input type="date" value={form.background_check_date} onChange={e => setForm(f => ({ ...f, background_check_date: e.target.value }))} className="w-full px-3 py-2 rounded-lg text-sm" style={inputStyle} />
                </div>
              </div>

              {/* Approved for Classroom Access */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium" style={{ color: "#ffffff" }}>Approved for Classroom Access</p>
                  <p className="text-xs" style={{ color: "#A9A9B8" }}>Grant access when background check is cleared and PIN is set</p>
                </div>
                <button type="button" onClick={() => setForm(f => ({ ...f, approved: !f.approved }))} className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0" style={{ backgroundColor: form.approved ? "#22c55e" : "rgba(255,255,255,0.15)" }}>
                  <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform" style={{ transform: form.approved ? "translateX(1.375rem)" : "translateX(0.125rem)" }} />
                </button>
              </div>

              {/* PIN */}
              <div className="rounded-xl p-4" style={{ background: "rgba(123,44,191,0.08)", border: "1px solid rgba(123,44,191,0.25)" }}>
                <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#c084fc" }}>PIN Configuration</p>
                {editVol?.has_pin && !form.newPin && (
                  <p className="text-xs mb-2" style={{ color: "#4ade80" }}>✓ PIN is configured</p>
                )}
                {editVol && !editVol.has_pin && !form.newPin && (
                  <p className="text-xs mb-2" style={{ color: "#f87171" }}>No PIN configured — volunteer cannot sign in until a PIN is set</p>
                )}
                <label className="block text-xs font-medium mb-1" style={{ color: "#A9A9B8" }}>
                  {editVol?.has_pin ? "Set New PIN (leave blank to keep current)" : "Set 4-Digit PIN"}
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  value={form.newPin}
                  onChange={e => setForm(f => ({ ...f, newPin: e.target.value.replace(/\D/g, "").slice(0, 4) }))}
                  placeholder="• • • •"
                  className="w-28 px-3 py-2 rounded-lg text-sm text-center font-mono tracking-widest"
                  style={inputStyle}
                />
              </div>

              {/* Classroom Assignments */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#D4AF37" }}>Classroom Assignments</label>
                {rooms.length === 0 ? (
                  <p className="text-xs" style={{ color: "#A9A9B8" }}>No classrooms available. Add classrooms in Check-In Setup.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {rooms.map(r => (
                      <button key={r.id} type="button" onClick={() => toggleClassroom(r.id)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors" style={{
                        border: form.classroom_ids.includes(r.id) ? "1px solid rgba(212,175,55,0.5)" : "1px solid rgba(212,175,55,0.2)",
                        background: form.classroom_ids.includes(r.id) ? "rgba(212,175,55,0.1)" : "transparent",
                        color: form.classroom_ids.includes(r.id) ? "#D4AF37" : "#A9A9B8",
                      }}>
                        <span className="w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center text-xs" style={{ borderColor: form.classroom_ids.includes(r.id) ? "#D4AF37" : "rgba(212,175,55,0.3)", background: form.classroom_ids.includes(r.id) ? "#D4AF37" : "transparent", color: "#000" }}>
                          {form.classroom_ids.includes(r.id) ? "✓" : ""}
                        </span>
                        {r.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "#A9A9B8" }}>Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="w-full px-3 py-2 rounded-lg text-sm resize-none" style={inputStyle} />
              </div>

              {formError && <p className="text-sm" style={{ color: "#f87171" }}>{formError}</p>}

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-xl text-sm font-medium" style={{ border: "1px solid rgba(212,175,55,0.3)", color: "#A9A9B8", background: "transparent" }}>Cancel</button>
                <button onClick={save} disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white" style={{ backgroundColor: ACCENT }}>
                  {saving ? "Saving…" : editVol ? "Save Changes" : "Add Volunteer"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

export default function VolunteersPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#08060D" }}><div style={{ color: "#D8D8E8" }}>Loading…</div></div>}>
      <VolunteerAccessContent />
    </Suspense>
  );
}
