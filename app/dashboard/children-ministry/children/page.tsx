"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AppShell, { type NavItem } from "@/components/layout/AppShell";

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Members", href: "/dashboard/members" },
  { label: "Departments", href: "/dashboard/departments" },
  { label: "Attendance", href: "/dashboard/attendance" },
  { label: "Visitors", href: "/dashboard/visitors" },
  { label: "Calendar", href: "/dashboard/calendar" },
  { label: "Prayer", href: "/dashboard/prayer" },
  { label: "Communication Hub", href: "/dashboard/communication" },
  { label: "Visitation", href: "/dashboard/visitation" },
  { label: "Shepherd Pipeline", href: "/dashboard/shepherd" },
  { label: "Evangelism", href: "/dashboard/evangelism" },
  { label: "Birthdays", href: "/dashboard/birthdays" },
  { label: "🧒 Children's Ministry", href: "/dashboard/children-ministry" },
  { label: "Settings", href: "/dashboard/settings" },
];

const CM_ACCENT = "#F28C28";

type Season = { id: string; name: string; status: string };
type Team = { id: string; name: string; color: string };
type Child = {
  id: string; first_name: string; last_name: string; grade: string;
  parent1_name: string | null; parent1_email: string | null; parent1_phone: string | null;
  parent2_name: string | null; parent2_email: string | null; parent2_phone: string | null;
  allergies: string | null; medical_notes: string | null;
  authorized_pickups: string[]; photo_permission: boolean; active: boolean;
  team?: { name: string; color: string } | null;
  season_points?: number;
};

const GRADES = ["3rd", "4th", "5th", "6th"];

export default function ChildrenPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [activeSeason, setActiveSeason] = useState<Season | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [search, setSearch] = useState("");
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [childDetail, setChildDetail] = useState<{ points: any[]; attendance: any[]; team: any } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Add child modal
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    firstName: "", lastName: "", grade: "3rd", dateOfBirth: "",
    allergies: "", medicalNotes: "",
    parent1Name: "", parent1Email: "", parent1Phone: "",
    parent2Name: "", parent2Email: "", parent2Phone: "",
    authorizedPickups: "", photoPermission: false,
    teamId: "",
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Edit child modal
  const [editChild, setEditChild] = useState<Child | null>(null);
  const [editForm, setEditForm] = useState<typeof form>({ firstName: "", lastName: "", grade: "3rd", dateOfBirth: "", allergies: "", medicalNotes: "", parent1Name: "", parent1Email: "", parent1Phone: "", parent2Name: "", parent2Email: "", parent2Phone: "", authorizedPickups: "", photoPermission: false, teamId: "" });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  async function load(t: string, sid: string) {
    const res = await fetch(`/api/children-ministry/children?season_id=${sid}`, { headers: { Authorization: `Bearer ${t}` } });
    const data = await res.json();
    setChildren(data.children ?? []);
  }

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/"); return; }
      const t = session.access_token;
      setToken(t);

      const [seasonsRes, teamsRes] = await Promise.all([
        fetch("/api/children-ministry/seasons", { headers: { Authorization: `Bearer ${t}` } }),
        fetch("/api/children-ministry/teams", { headers: { Authorization: `Bearer ${t}` } }),
      ]);
      const seasonsData = await seasonsRes.json();
      const teamsData = await teamsRes.json();
      const allSeasons: Season[] = seasonsData.seasons ?? [];
      setSeasons(allSeasons);
      setTeams(teamsData.teams ?? []);
      const active = allSeasons.find(s => s.status === "active") ?? allSeasons[0] ?? null;
      setActiveSeason(active);

      if (active) await load(t, active.id);
      setLoading(false);
    }
    init();
  }, [router]);

  async function openChild(child: Child) {
    setSelectedChild(child);
    if (!activeSeason) return;
    setDetailLoading(true);
    const res = await fetch(`/api/children-ministry/children/${child.id}?season_id=${activeSeason.id}`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setChildDetail({ points: data.points ?? [], attendance: data.attendance ?? [], team: data.team ?? null });
    setDetailLoading(false);
  }

  async function addChild() {
    if (!form.firstName.trim() || !form.lastName.trim()) { setSaveError("First and last name required"); return; }
    setSaving(true); setSaveError("");
    const res = await fetch("/api/children-ministry/children", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        ...form,
        authorizedPickups: form.authorizedPickups.split(",").map(s => s.trim()).filter(Boolean),
        seasonId: activeSeason?.id,
        teamId: form.teamId || undefined,
      }),
    });
    if (!res.ok) { const d = await res.json(); setSaveError(d.error ?? "Error"); setSaving(false); return; }
    setSaving(false);
    setShowAdd(false);
    setForm({ firstName: "", lastName: "", grade: "3rd", dateOfBirth: "", allergies: "", medicalNotes: "", parent1Name: "", parent1Email: "", parent1Phone: "", parent2Name: "", parent2Email: "", parent2Phone: "", authorizedPickups: "", photoPermission: false, teamId: "" });
    if (token && activeSeason) await load(token, activeSeason.id);
  }

  function openEdit(child: Child, e: React.MouseEvent) {
    e.stopPropagation();
    setEditChild(child);
    setEditForm({
      firstName: child.first_name, lastName: child.last_name, grade: child.grade,
      dateOfBirth: "", allergies: child.allergies ?? "", medicalNotes: child.medical_notes ?? "",
      parent1Name: child.parent1_name ?? "", parent1Email: child.parent1_email ?? "", parent1Phone: child.parent1_phone ?? "",
      parent2Name: child.parent2_name ?? "", parent2Email: child.parent2_email ?? "", parent2Phone: child.parent2_phone ?? "",
      authorizedPickups: (child.authorized_pickups ?? []).join(", "), photoPermission: child.photo_permission ?? false, teamId: "",
    });
    setEditError("");
  }

  async function saveEdit() {
    if (!editChild || !editForm.firstName.trim() || !editForm.lastName.trim()) { setEditError("First and last name required"); return; }
    setEditSaving(true); setEditError("");
    const res = await fetch(`/api/children-ministry/children/${editChild.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        firstName: editForm.firstName, lastName: editForm.lastName, grade: editForm.grade,
        allergies: editForm.allergies, medicalNotes: editForm.medicalNotes,
        parent1Name: editForm.parent1Name, parent1Email: editForm.parent1Email, parent1Phone: editForm.parent1Phone,
        parent2Name: editForm.parent2Name, parent2Email: editForm.parent2Email, parent2Phone: editForm.parent2Phone,
        authorizedPickups: editForm.authorizedPickups.split(",").map((s: string) => s.trim()).filter(Boolean),
        photoPermission: editForm.photoPermission,
      }),
    });
    if (!res.ok) { const d = await res.json(); setEditError(d.error ?? "Error"); setEditSaving(false); return; }
    setEditSaving(false); setEditChild(null);
    if (token && activeSeason) await load(token, activeSeason.id);
  }

  const filtered = children.filter(c =>
    `${c.first_name} ${c.last_name}`.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="text-gray-400">Loading…</div></div>;

  return (
    <AppShell navItems={navItems}>
      <div className="px-8 py-10" style={{ background: `linear-gradient(135deg, #c2570a 0%, ${CM_ACCENT} 100%)` }}>
        <p className="text-orange-100 text-sm mb-1">Children's Ministry</p>
        <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "Georgia, serif" }}>Children</h1>
      </div>

      <div className="px-8 py-8 bg-gray-50 min-h-screen">
        {/* Search + Add */}
        <div className="flex gap-3 mb-6">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search children…" className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white shadow-sm" />
          <button onClick={() => setShowAdd(true)} className="px-5 py-2.5 rounded-xl font-bold text-white text-sm" style={{ backgroundColor: CM_ACCENT }}>
            + Add Child
          </button>
        </div>

        {/* Children table */}
        <div className="bg-white rounded-2xl shadow overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-5xl mb-4">🧒</div>
              <p className="text-gray-400">No children found. Add your first child to get started.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-widest">Name</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-widest">Grade</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-widest">Team</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-widest">Season Pts</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map(child => (
                  <tr key={child.id} onClick={() => openChild(child)} className="border-b border-gray-50 hover:bg-orange-50 cursor-pointer transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0" style={{ backgroundColor: child.team?.color ?? CM_ACCENT }}>
                          {child.first_name[0]}{child.last_name[0]}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{child.first_name} {child.last_name}</p>
                          {child.parent1_name && <p className="text-xs text-gray-400">Parent: {child.parent1_name}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{child.grade}</td>
                    <td className="px-6 py-4">
                      {child.team ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold text-white" style={{ backgroundColor: child.team.color }}>
                          {child.team.name}
                        </span>
                      ) : <span className="text-xs text-gray-400">Unassigned</span>}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-bold" style={{ color: CM_ACCENT }}>
                      {(child.season_points ?? 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <button onClick={(e) => openEdit(child, e)} className="px-3 py-1.5 rounded-lg text-xs font-bold border border-gray-200 text-gray-600 hover:border-orange-300 transition-colors">
                        Edit
                      </button>
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4" onClick={() => setSelectedChild(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-xl font-bold" style={{ fontFamily: "Georgia, serif" }}>{selectedChild.first_name} {selectedChild.last_name}</h2>
                <button onClick={() => setSelectedChild(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
              </div>
              <p className="text-sm text-gray-500">{selectedChild.grade} grade</p>
            </div>

            <div className="p-6 space-y-5">
              {detailLoading ? <p className="text-gray-400 text-sm">Loading…</p> : <>
                {/* Team */}
                {childDetail?.team && (
                  <div className="rounded-xl p-4 text-white" style={{ backgroundColor: childDetail.team.color }}>
                    <p className="text-xs font-bold uppercase tracking-widest opacity-75 mb-0.5">Team</p>
                    <p className="text-lg font-bold">{childDetail.team.name}</p>
                    <p className="text-sm opacity-80">{Number(childDetail.team.total_points).toLocaleString()} total pts</p>
                  </div>
                )}

                {/* Parent info */}
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Parents / Guardians</h3>
                  {selectedChild.parent1_name && (
                    <div className="mb-2">
                      <p className="font-medium text-gray-800 text-sm">{selectedChild.parent1_name}</p>
                      {selectedChild.parent1_email && <p className="text-xs text-gray-400">{selectedChild.parent1_email}</p>}
                      {selectedChild.parent1_phone && <p className="text-xs text-gray-400">{selectedChild.parent1_phone}</p>}
                    </div>
                  )}
                  {selectedChild.parent2_name && (
                    <div>
                      <p className="font-medium text-gray-800 text-sm">{selectedChild.parent2_name}</p>
                      {selectedChild.parent2_email && <p className="text-xs text-gray-400">{selectedChild.parent2_email}</p>}
                      {selectedChild.parent2_phone && <p className="text-xs text-gray-400">{selectedChild.parent2_phone}</p>}
                    </div>
                  )}
                </div>

                {/* Medical */}
                {(selectedChild.allergies || selectedChild.medical_notes) && (
                  <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-red-400 mb-2">Medical</p>
                    {selectedChild.allergies && <p className="text-sm text-red-700"><strong>Allergies:</strong> {selectedChild.allergies}</p>}
                    {selectedChild.medical_notes && <p className="text-sm text-red-700 mt-1">{selectedChild.medical_notes}</p>}
                  </div>
                )}

                {/* Authorized pickups */}
                {selectedChild.authorized_pickups?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Authorized Pickups</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedChild.authorized_pickups.map((p, i) => (
                        <span key={i} className="px-2.5 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-700">{p}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Attendance streak */}
                {childDetail?.attendance && childDetail.attendance.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Attendance Streak</p>
                    <p className="text-2xl font-black" style={{ color: CM_ACCENT }}>
                      🔥 {childDetail.attendance[0]?.consecutive_weeks ?? 0} weeks
                    </p>
                  </div>
                )}

                {/* Points history */}
                {childDetail?.points && childDetail.points.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Points This Season</p>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {childDetail.points.map((p: any) => (
                        <div key={p.id} className="flex justify-between text-sm">
                          <span className="text-gray-600">{p.category.replace(/_/g, ' ')}</span>
                          <span className="font-bold" style={{ color: CM_ACCENT }}>+{Number(p.points).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between font-bold">
                      <span className="text-gray-800">Total</span>
                      <span style={{ color: CM_ACCENT }}>{childDetail.points.reduce((s: number, p: any) => s + Number(p.points), 0).toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </>}
            </div>
          </div>
        </div>
      )}

      {/* Add Child Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 sticky top-0 bg-white">
              <h2 className="text-xl font-bold" style={{ fontFamily: "Georgia, serif" }}>Add Child</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">First Name *</label>
                  <input value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Last Name *</label>
                  <input value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Grade *</label>
                  <select value={form.grade} onChange={e => setForm(f => ({ ...f, grade: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                    {GRADES.map(g => <option key={g} value={g}>{g} Grade</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Date of Birth</label>
                  <input type="date" value={form.dateOfBirth} onChange={e => setForm(f => ({ ...f, dateOfBirth: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
              </div>

              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest pt-2">Parent / Guardian 1</p>
              <div className="grid grid-cols-1 gap-3">
                <input value={form.parent1Name} onChange={e => setForm(f => ({ ...f, parent1Name: e.target.value }))} placeholder="Full name" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                <div className="grid grid-cols-2 gap-3">
                  <input type="email" value={form.parent1Email} onChange={e => setForm(f => ({ ...f, parent1Email: e.target.value }))} placeholder="Email" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                  <input value={form.parent1Phone} onChange={e => setForm(f => ({ ...f, parent1Phone: e.target.value }))} placeholder="Phone" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
              </div>

              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest pt-2">Parent / Guardian 2 (optional)</p>
              <div className="grid grid-cols-1 gap-3">
                <input value={form.parent2Name} onChange={e => setForm(f => ({ ...f, parent2Name: e.target.value }))} placeholder="Full name" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                <div className="grid grid-cols-2 gap-3">
                  <input type="email" value={form.parent2Email} onChange={e => setForm(f => ({ ...f, parent2Email: e.target.value }))} placeholder="Email" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                  <input value={form.parent2Phone} onChange={e => setForm(f => ({ ...f, parent2Phone: e.target.value }))} placeholder="Phone" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Allergies</label>
                <input value={form.allergies} onChange={e => setForm(f => ({ ...f, allergies: e.target.value }))} placeholder="Peanuts, dairy…" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Medical Notes</label>
                <textarea value={form.medicalNotes} onChange={e => setForm(f => ({ ...f, medicalNotes: e.target.value }))} rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Authorized Pickups (comma-separated)</label>
                <input value={form.authorizedPickups} onChange={e => setForm(f => ({ ...f, authorizedPickups: e.target.value }))} placeholder="Grandma Smith, Uncle Joe" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>

              {activeSeason && teams.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Assign to Team</label>
                  <select value={form.teamId} onChange={e => setForm(f => ({ ...f, teamId: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                    <option value="">— No team —</option>
                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              )}

              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.photoPermission} onChange={e => setForm(f => ({ ...f, photoPermission: e.target.checked }))} className="rounded" />
                <span className="text-sm text-gray-700">Photo permission granted</span>
              </label>

              {saveError && <p className="text-sm text-red-600">{saveError}</p>}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowAdd(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium">Cancel</button>
                <button onClick={addChild} disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white" style={{ backgroundColor: CM_ACCENT }}>
                  {saving ? "Saving…" : "Add Child"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Edit Child Modal */}
      {editChild && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4" onClick={() => setEditChild(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 sticky top-0 bg-white">
              <h2 className="text-xl font-bold" style={{ fontFamily: "Georgia, serif" }}>Edit {editChild.first_name} {editChild.last_name}</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">First Name *</label>
                  <input value={editForm.firstName} onChange={e => setEditForm(f => ({ ...f, firstName: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Last Name *</label>
                  <input value={editForm.lastName} onChange={e => setEditForm(f => ({ ...f, lastName: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Grade *</label>
                <select value={editForm.grade} onChange={e => setEditForm(f => ({ ...f, grade: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                  {GRADES.map(g => <option key={g} value={g}>{g} Grade</option>)}
                </select>
              </div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest pt-1">Parent / Guardian 1</p>
              <input value={editForm.parent1Name} onChange={e => setEditForm(f => ({ ...f, parent1Name: e.target.value }))} placeholder="Full name" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              <div className="grid grid-cols-2 gap-3">
                <input type="email" value={editForm.parent1Email} onChange={e => setEditForm(f => ({ ...f, parent1Email: e.target.value }))} placeholder="Email" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                <input value={editForm.parent1Phone} onChange={e => setEditForm(f => ({ ...f, parent1Phone: e.target.value }))} placeholder="Phone" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest pt-1">Parent / Guardian 2</p>
              <input value={editForm.parent2Name} onChange={e => setEditForm(f => ({ ...f, parent2Name: e.target.value }))} placeholder="Full name" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              <div className="grid grid-cols-2 gap-3">
                <input type="email" value={editForm.parent2Email} onChange={e => setEditForm(f => ({ ...f, parent2Email: e.target.value }))} placeholder="Email" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                <input value={editForm.parent2Phone} onChange={e => setEditForm(f => ({ ...f, parent2Phone: e.target.value }))} placeholder="Phone" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Allergies</label>
                <input value={editForm.allergies} onChange={e => setEditForm(f => ({ ...f, allergies: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Medical Notes</label>
                <textarea value={editForm.medicalNotes} onChange={e => setEditForm(f => ({ ...f, medicalNotes: e.target.value }))} rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Authorized Pickups (comma-separated)</label>
                <input value={editForm.authorizedPickups} onChange={e => setEditForm(f => ({ ...f, authorizedPickups: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={editForm.photoPermission} onChange={e => setEditForm(f => ({ ...f, photoPermission: e.target.checked }))} className="rounded" />
                <span className="text-sm text-gray-700">Photo permission granted</span>
              </label>
              {editError && <p className="text-sm text-red-600">{editError}</p>}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setEditChild(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium">Cancel</button>
                <button onClick={saveEdit} disabled={editSaving} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white" style={{ backgroundColor: CM_ACCENT }}>
                  {editSaving ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
