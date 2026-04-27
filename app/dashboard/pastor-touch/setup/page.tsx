"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import AppShell, { type NavItem } from "@/components/layout/AppShell";
import { MINISTRY_NAV_ITEMS } from "@/lib/ministry-config";

const PURPLE = "#7c3aed";

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Members", href: "/dashboard/members" },
  { label: "Departments", href: "/dashboard/departments" },
  { label: "Attendance", href: "/dashboard/attendance" },
  { label: "Visitors", href: "/dashboard/visitors" },
  { label: "Calendar", href: "/dashboard/calendar" },
  { label: "Communication Hub", href: "/dashboard/communication" },
  { label: "Pastoral Care", href: "#", isSection: true },
  { label: "🙏 Annual Pastor Touch", href: "/dashboard/pastor-touch" },
  { label: "Prayer", href: "/dashboard/prayer" },
  { label: "Visitation", href: "/dashboard/visitation" },
  { label: "Shepherd Pipeline", href: "/dashboard/shepherd" },
  { label: "Birthdays", href: "/dashboard/birthdays" },
  { label: "Evangelism", href: "/dashboard/evangelism" },
  { label: "Ministry", href: "#", isSection: true },
  { label: "🧒 Children's Ministry", href: "/dashboard/children-ministry" },
  ...MINISTRY_NAV_ITEMS,
  { label: "Settings", href: "/dashboard/settings" },
];

type Staff = { id: string; name: string; title: string | null; email: string | null; phone: string | null; active: boolean };

export default function SetupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [mode, setMode] = useState<'single' | 'multi'>('single');
  const [staff, setStaff] = useState<Staff[]>([]);
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [assignResult, setAssignResult] = useState<any>(null);
  const [assignError, setAssignError] = useState("");

  // Add staff form
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [staffForm, setStaffForm] = useState({ name: "", title: "", email: "", phone: "" });
  const [addingStaff, setAddingStaff] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);

  async function loadData(t: string) {
    const [settingsRes, membersRes] = await Promise.all([
      fetch(`/api/pastor-touch/settings?year=${year}`, { headers: { Authorization: `Bearer ${t}` } }),
      fetch("/api/members", { headers: { Authorization: `Bearer ${t}` } }),
    ]);
    if (settingsRes.ok) {
      const d = await settingsRes.json();
      setMode(d.settings?.mode ?? 'single');
      setStaff(d.staff ?? []);
    }
    if (membersRes.ok) {
      const d = await membersRes.json();
      setMemberCount((d.members ?? []).filter((m: any) => m.status === 'active').length);
    }
  }

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/"); return; }
      const t = session.access_token;
      setToken(t);
      await loadData(t);
      setLoading(false);
    }
    init();
  }, [router]);

  async function saveSettings() {
    if (!token) return;
    setSavingSettings(true);
    await fetch("/api/pastor-touch/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ year, mode }),
    });
    setSavingSettings(false);
  }

  async function addStaff() {
    if (!token || !staffForm.name.trim()) return;
    setAddingStaff(true);
    await fetch("/api/pastor-touch/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(staffForm),
    });
    setAddingStaff(false);
    setShowAddStaff(false);
    setStaffForm({ name: "", title: "", email: "", phone: "" });
    await loadData(token);
  }

  async function updateStaff(staffId: string, updates: any) {
    if (!token) return;
    await fetch(`/api/pastor-touch/staff/${staffId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(updates),
    });
    await loadData(token);
    setEditingStaff(null);
  }

  async function deactivateStaff(staffId: string) {
    if (!token || !confirm("Remove this pastor? Their assignments will be unlinked.")) return;
    await fetch(`/api/pastor-touch/staff/${staffId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    await loadData(token);
  }

  async function autoAssign() {
    if (!token) return;
    setAssigning(true); setAssignError(""); setAssignResult(null);
    const res = await fetch("/api/pastor-touch/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ year }),
    });
    const data = await res.json();
    setAssigning(false);
    if (!res.ok) { setAssignError(data.error ?? "Error"); return; }
    setAssignResult(data);
  }

  const activeStaff = staff.filter(s => s.active);
  const preview = memberCount && activeStaff.length > 0
    ? `${memberCount} members will be divided among ${activeStaff.length} pastor${activeStaff.length > 1 ? 's' : ''} — ~${Math.ceil(memberCount / activeStaff.length)} each, spread across 52 weeks (~${Math.ceil(Math.ceil(memberCount / activeStaff.length) / 52)}/week each)`
    : null;

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="text-gray-400">Loading…</div></div>;

  return (
    <AppShell navItems={navItems}>
      <div className="px-8 py-10" style={{ background: `linear-gradient(135deg, #4338ca 0%, ${PURPLE} 100%)` }}>
        <Link href="/dashboard/pastor-touch" className="text-purple-200 text-xs mb-1 block hover:text-white">← Annual Pastor Touch</Link>
        <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "Georgia, serif" }}>Setup</h1>
        <p className="text-purple-200 text-sm mt-1">Configure your annual member care system</p>
      </div>

      <div className="px-8 py-8 bg-gray-50 min-h-screen max-w-3xl">

        {/* Step 1 */}
        <div className="bg-white rounded-2xl shadow p-6 mb-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black text-white flex-shrink-0" style={{ backgroundColor: PURPLE }}>1</div>
            <h2 className="font-bold text-gray-800 text-lg" style={{ fontFamily: "Georgia, serif" }}>Year & Mode</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Year</label>
              <select value={year} onChange={e => setYear(parseInt(e.target.value))} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
                {[new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">Pastor Mode</label>
              <div className="flex rounded-xl border border-gray-200 overflow-hidden max-w-xs">
                {(['single', 'multi'] as const).map(m => (
                  <button key={m} onClick={() => setMode(m)} className="flex-1 py-2.5 text-sm font-bold transition-colors" style={{ backgroundColor: mode === m ? PURPLE : "white", color: mode === m ? "white" : "#374151" }}>
                    {m === 'single' ? 'Single Pastor' : 'Multiple Pastors'}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={saveSettings} disabled={savingSettings} className="px-5 py-2.5 rounded-xl text-sm font-bold text-white" style={{ backgroundColor: PURPLE }}>
              {savingSettings ? "Saving…" : "Save Settings"}
            </button>
          </div>
        </div>

        {/* Step 2 — Pastoral Staff */}
        <div className="bg-white rounded-2xl shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black text-white flex-shrink-0" style={{ backgroundColor: PURPLE }}>2</div>
              <h2 className="font-bold text-gray-800 text-lg" style={{ fontFamily: "Georgia, serif" }}>Pastoral Staff</h2>
            </div>
            <button onClick={() => setShowAddStaff(true)} className="px-4 py-2 rounded-xl text-xs font-bold text-white" style={{ backgroundColor: PURPLE }}>+ Add Pastor</button>
          </div>

          {staff.length === 0 ? (
            <p className="text-gray-400 text-sm">No pastoral staff yet. Add at least one pastor to continue.</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 text-xs font-semibold text-gray-400 uppercase tracking-widest">Name</th>
                  <th className="text-left py-2 text-xs font-semibold text-gray-400 uppercase tracking-widest hidden sm:table-cell">Email</th>
                  <th className="text-left py-2 text-xs font-semibold text-gray-400 uppercase tracking-widest">Status</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {staff.map(s => (
                  <tr key={s.id} className="border-b border-gray-50">
                    <td className="py-3">
                      <p className="text-sm font-medium text-gray-900">{s.name}</p>
                      {s.title && <p className="text-xs text-gray-400">{s.title}</p>}
                    </td>
                    <td className="py-3 hidden sm:table-cell text-sm text-gray-500">{s.email ?? "—"}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${s.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>{s.active ? 'Active' : 'Inactive'}</span>
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => setEditingStaff(s)} className="text-xs text-gray-400 hover:text-gray-600">Edit</button>
                        <button onClick={() => deactivateStaff(s.id)} className="text-xs text-red-400 hover:text-red-600">Remove</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Step 3 — Assign */}
        <div className="bg-white rounded-2xl shadow p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black text-white flex-shrink-0" style={{ backgroundColor: PURPLE }}>3</div>
            <h2 className="font-bold text-gray-800 text-lg" style={{ fontFamily: "Georgia, serif" }}>Assign Members</h2>
          </div>

          {preview && (
            <div className="bg-purple-50 border border-purple-100 rounded-xl px-4 py-3 mb-4">
              <p className="text-sm text-purple-800">{preview}</p>
            </div>
          )}

          {assignResult && (
            <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3 mb-4">
              <p className="text-sm text-green-700 font-semibold">✅ {assignResult.assigned} members assigned successfully across {assignResult.pastors} pastor{assignResult.pastors !== 1 ? 's' : ''} — ~{assignResult.members_per_week}/week over {assignResult.weeks_used} weeks</p>
            </div>
          )}

          {assignError && <p className="text-sm text-red-600 mb-3">{assignError}</p>}

          <div className="flex gap-3">
            <button onClick={autoAssign} disabled={assigning || activeStaff.length === 0} className="px-6 py-3 rounded-xl font-bold text-white text-sm transition-opacity hover:opacity-90 disabled:opacity-50" style={{ backgroundColor: PURPLE }}>
              {assigning ? "Assigning…" : "🚀 Auto-Assign All Members"}
            </button>
            {assignResult && (
              <Link href="/dashboard/pastor-touch" className="px-6 py-3 rounded-xl font-bold border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                View Dashboard →
              </Link>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-3">This will clear and rebuild all assignments for {year}. Existing touch logs are preserved.</p>
        </div>
      </div>

      {/* Add Staff Modal */}
      {showAddStaff && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4" onClick={() => setShowAddStaff(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold" style={{ fontFamily: "Georgia, serif" }}>Add Pastoral Staff</h2>
            </div>
            <div className="p-6 space-y-3">
              {[{ label: "Name *", key: "name", placeholder: "Rev. John Smith" }, { label: "Title", key: "title", placeholder: "Associate Pastor" }, { label: "Email", key: "email", placeholder: "john@church.org", type: "email" }, { label: "Phone", key: "phone", placeholder: "(555) 000-0000" }].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
                  <input type={f.type ?? "text"} value={(staffForm as any)[f.key]} onChange={e => setStaffForm(s => ({ ...s, [f.key]: e.target.value }))} placeholder={f.placeholder} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
              ))}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowAddStaff(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium">Cancel</button>
                <button onClick={addStaff} disabled={addingStaff || !staffForm.name.trim()} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white" style={{ backgroundColor: PURPLE }}>
                  {addingStaff ? "Adding…" : "Add Pastor"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Staff Modal */}
      {editingStaff && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4" onClick={() => setEditingStaff(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold" style={{ fontFamily: "Georgia, serif" }}>Edit {editingStaff.name}</h2>
            </div>
            <div className="p-6 space-y-3">
              {[{ label: "Name", key: "name" }, { label: "Title", key: "title" }, { label: "Email", key: "email" }, { label: "Phone", key: "phone" }].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
                  <input value={(editingStaff as any)[f.key] ?? ""} onChange={e => setEditingStaff(s => s ? { ...s, [f.key]: e.target.value } : s)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
              ))}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setEditingStaff(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium">Cancel</button>
                <button onClick={() => updateStaff(editingStaff.id, { name: editingStaff.name, title: editingStaff.title, email: editingStaff.email, phone: editingStaff.phone })} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white" style={{ backgroundColor: PURPLE }}>
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
