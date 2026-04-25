"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import AppShell, { type NavItem } from "@/components/layout/AppShell";
import { MINISTRY_CONFIG, MINISTRY_NAV_ITEMS, stageColor } from "@/lib/ministry-config";

const ACCENT = "#F28C28";

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
  ...MINISTRY_NAV_ITEMS,
  { label: "Settings", href: "/dashboard/settings" },
];

function SubNav({ type, active }: { type: string; active: string }) {
  const cfg = MINISTRY_CONFIG[type];
  const tabs = [
    { label: "Overview", href: `/dashboard/ministry/${type}` },
    { label: "Roster", href: `/dashboard/ministry/${type}/roster` },
    { label: "Attendance", href: `/dashboard/ministry/${type}/attendance` },
    { label: "Follow Up", href: `/dashboard/ministry/${type}/followup` },
    { label: "Pipeline", href: `/dashboard/ministry/${type}/pipeline` },
    { label: "Communication", href: `/dashboard/ministry/${type}/communication` },
    ...(cfg?.hasShepherdGroups ? [
      { label: "Shepherd Groups", href: `/dashboard/ministry/${type}/shepherd-groups` },
      { label: "Team Challenge", href: `/dashboard/children-ministry` },
    ] : []),
  ];
  return (
    <div className="flex gap-1 px-8 pt-4 overflow-x-auto" style={{ borderBottom: "1px solid #e5e7eb", backgroundColor: "white" }}>
      {tabs.map(t => (
        <Link key={t.href} href={t.href} className="px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors"
          style={{ borderColor: active === t.label ? ACCENT : "transparent", color: active === t.label ? ACCENT : "#6b7280" }}>
          {t.label}
        </Link>
      ))}
    </div>
  );
}

type RosterEntry = {
  id: string;
  member_id: string;
  pipeline_stage: string | null;
  status: string;
  joined_date: string | null;
  notes: string | null;
  member: { id: string; first_name: string; last_name: string; email: string | null; phone: string | null } | null;
};

type MemberResult = { id: string; first_name: string; last_name: string; email: string | null; phone: string | null };

export default function RosterPage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = use(params);
  const router = useRouter();
  const cfg = MINISTRY_CONFIG[type];

  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [search, setSearch] = useState("");
  const [confirmRemove, setConfirmRemove] = useState<RosterEntry | null>(null);
  const [removing, setRemoving] = useState(false);

  // Add member modal
  const [showAdd, setShowAdd] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [allMembers, setAllMembers] = useState<MemberResult[]>([]);
  const [adding, setAdding] = useState<string | null>(null);
  const [addError, setAddError] = useState("");

  // Edit modal
  const [editEntry, setEditEntry] = useState<RosterEntry | null>(null);
  const [editStage, setEditStage] = useState("");
  const [editStatus, setEditStatus] = useState("active");
  const [editNotes, setEditNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  async function load(t: string) {
    const res = await fetch(`/api/ministry/${type}/roster`, { headers: { Authorization: `Bearer ${t}` } });
    const data = await res.json();
    setRoster(data.roster ?? []);
  }

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/"); return; }
      const t = session.access_token;
      setToken(t);

      const [_, membersRes] = await Promise.all([
        load(t),
        fetch("/api/members", { headers: { Authorization: `Bearer ${t}` } }),
      ]);
      const mData = await membersRes.json();
      setAllMembers(mData.members ?? []);
      setLoading(false);
    }
    init();
  }, [type, router]);

  const rosterMemberIds = new Set(roster.map(r => r.member_id));

  const filteredRoster = roster.filter(r => {
    const name = `${r.member?.first_name ?? ""} ${r.member?.last_name ?? ""}`.toLowerCase();
    return name.includes(search.toLowerCase());
  });

  const filteredMembers = allMembers.filter(m =>
    !rosterMemberIds.has(m.id) &&
    `${m.first_name} ${m.last_name} ${m.email ?? ""}`.toLowerCase().includes(memberSearch.toLowerCase())
  ).slice(0, 10);

  async function addMember(member: MemberResult) {
    if (!token) return;
    setAdding(member.id); setAddError("");
    const res = await fetch(`/api/ministry/${type}/roster`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ member_id: member.id, pipeline_stage: cfg?.stages[0] ?? null }),
    });
    if (!res.ok) { const d = await res.json(); setAddError(d.error ?? "Error"); setAdding(null); return; }
    setAdding(null);
    await load(token);
  }

  function openEdit(entry: RosterEntry) {
    setEditEntry(entry);
    setEditStage(entry.pipeline_stage ?? "");
    setEditStatus(entry.status);
    setEditNotes(entry.notes ?? "");
    setSaveError("");
  }

  async function saveEdit() {
    if (!editEntry || !token) return;
    setSaving(true); setSaveError("");
    const res = await fetch(`/api/ministry/${type}/roster/${editEntry.member_id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ pipeline_stage: editStage || null, status: editStatus, notes: editNotes }),
    });
    if (!res.ok) { const d = await res.json(); setSaveError(d.error ?? "Error"); setSaving(false); return; }
    setSaving(false);
    setEditEntry(null);
    await load(token);
  }

  async function removeMember() {
    if (!confirmRemove || !token) return;
    setRemoving(true);
    await fetch(`/api/ministry/${type}/roster/${confirmRemove.member_id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setRemoving(false);
    setConfirmRemove(null);
    await load(token);
  }

  if (!cfg) return <AppShell navItems={navItems}><div className="p-8 text-gray-500">Ministry not found.</div></AppShell>;
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="text-gray-400">Loading…</div></div>;

  return (
    <AppShell navItems={navItems}>
      {/* Hero */}
      <div className="px-8 py-8" style={{ background: `linear-gradient(135deg, #c2570a 0%, ${ACCENT} 100%)` }}>
        <Link href={`/dashboard/ministry/${type}`} className="text-orange-200 text-xs mb-1 block hover:text-white">← {cfg.name}</Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "Georgia, serif" }}>Roster</h1>
            <p className="text-orange-100 text-sm mt-1">{roster.length} member{roster.length !== 1 ? "s" : ""}</p>
          </div>
          <button onClick={() => { setShowAdd(true); setMemberSearch(""); setAddError(""); }} className="px-5 py-2.5 rounded-xl font-bold text-sm bg-white" style={{ color: ACCENT }}>
            + Add Member
          </button>
        </div>
      </div>

      <SubNav type={type} active="Roster" />

      <div className="px-8 py-8 bg-gray-50 min-h-screen">
        {/* Search */}
        <div className="mb-6">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search members…" className="w-full max-w-sm px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white shadow-sm" />
        </div>

        {/* Roster table */}
        <div className="bg-white rounded-2xl shadow overflow-hidden">
          {filteredRoster.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-5xl mb-4">{cfg.emoji}</div>
              <p className="text-gray-400">{search ? "No members match your search." : "No members on this roster yet. Click + Add Member to get started."}</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-widest">Name</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-widest">Pipeline Stage</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-widest">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-widest">Joined</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRoster.map(entry => (
                  <tr key={entry.id} className="border-b border-gray-50 hover:bg-orange-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0" style={{ backgroundColor: ACCENT }}>
                          {entry.member?.first_name?.[0]}{entry.member?.last_name?.[0]}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{entry.member?.first_name} {entry.member?.last_name}</p>
                          {entry.member?.email && <p className="text-xs text-gray-400">{entry.member.email}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {entry.pipeline_stage ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold text-white" style={{ backgroundColor: stageColor(cfg.stages, entry.pipeline_stage) }}>
                          {entry.pipeline_stage}
                        </span>
                      ) : <span className="text-xs text-gray-400">—</span>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.status === "active" ? "#22c55e" : "#9ca3af" }} />
                        <span className="text-sm text-gray-600 capitalize">{entry.status}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {entry.joined_date ? new Date(entry.joined_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEdit(entry)} className="px-3 py-1.5 rounded-lg text-xs font-bold border border-gray-200 text-gray-600 hover:border-orange-300 transition-colors">
                          Edit
                        </button>
                        <button onClick={() => setConfirmRemove(entry)} className="px-3 py-1.5 rounded-lg text-xs font-bold text-red-500 border border-red-100 hover:border-red-300 transition-colors">
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add Member Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold" style={{ fontFamily: "Georgia, serif" }}>Add Member to Roster</h2>
            </div>
            <div className="p-6">
              <input
                value={memberSearch}
                onChange={e => setMemberSearch(e.target.value)}
                placeholder="Search by name or email…"
                autoFocus
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm mb-4"
              />
              {addError && <p className="text-sm text-red-600 mb-3">{addError}</p>}
              {memberSearch.trim() === "" ? (
                <p className="text-sm text-gray-400 text-center py-4">Start typing to search members</p>
              ) : filteredMembers.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No matching members found (or all are already on this roster)</p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {filteredMembers.map(m => (
                    <button
                      key={m.id}
                      onClick={() => addMember(m)}
                      disabled={adding === m.id}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-100 hover:border-orange-200 hover:bg-orange-50 text-left transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ backgroundColor: ACCENT }}>
                        {m.first_name[0]}{m.last_name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{m.first_name} {m.last_name}</p>
                        {m.email && <p className="text-xs text-gray-400 truncate">{m.email}</p>}
                      </div>
                      <span className="text-xs font-bold flex-shrink-0" style={{ color: adding === m.id ? "#9ca3af" : ACCENT }}>
                        {adding === m.id ? "Adding…" : "Add →"}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <button onClick={() => setShowAdd(false)} className="w-full py-2.5 border border-gray-200 rounded-xl text-sm font-medium">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editEntry && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4" onClick={() => setEditEntry(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold" style={{ fontFamily: "Georgia, serif" }}>
                Edit — {editEntry.member?.first_name} {editEntry.member?.last_name}
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Pipeline Stage</label>
                <select value={editStage} onChange={e => setEditStage(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                  <option value="">— None —</option>
                  {cfg.stages.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                <select value={editStatus} onChange={e => setEditStatus(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={3} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none" />
              </div>
              {saveError && <p className="text-sm text-red-600">{saveError}</p>}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setEditEntry(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium">Cancel</button>
                <button onClick={saveEdit} disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white" style={{ backgroundColor: ACCENT }}>
                  {saving ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Remove */}
      {confirmRemove && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4" onClick={() => setConfirmRemove(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center" onClick={e => e.stopPropagation()}>
            <div className="text-4xl mb-3">⚠️</div>
            <h2 className="font-bold text-gray-900 mb-2">Remove from Roster?</h2>
            <p className="text-sm text-gray-500 mb-6">
              Remove <strong>{confirmRemove.member?.first_name} {confirmRemove.member?.last_name}</strong> from the {cfg.name} roster?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmRemove(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium">Cancel</button>
              <button onClick={removeMember} disabled={removing} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-red-500">
                {removing ? "Removing…" : "Remove"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
