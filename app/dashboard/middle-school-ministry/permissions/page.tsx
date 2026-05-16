"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import AppShell, { type NavItem } from "@/components/layout/AppShell";
import { MINISTRY_NAV_ITEMS } from "@/lib/ministry-config";

const ACCENT = "#F28C28";
const MINISTRY_TYPE = "middle-school";

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Church Family", href: "#", isSection: true },
  { label: "👥 Members", href: "/dashboard/members" },
  { label: "🏛️ Departments", href: "/dashboard/departments" },
  { label: "🆕 Visitors", href: "/dashboard/visitors" },
  { label: "Engagement", href: "#", isSection: true },
  { label: "📅 Calendar", href: "/dashboard/calendar" },
  { label: "✅ Attendance", href: "/dashboard/attendance" },
  { label: "📋 Bulletin", href: "/dashboard/bulletin" },
  { label: "📢 Communication Hub", href: "/dashboard/communication" },
  { label: "Pastoral Care", href: "#", isSection: true },
  { label: "🙏 Annual Pastor Touch", href: "/dashboard/pastor-touch" },
  { label: "🏥 Visitation", href: "/dashboard/visitation" },
  { label: "🎂 Birthdays", href: "/dashboard/birthdays" },
  { label: "🔄 Shepherd Pipeline", href: "/dashboard/shepherd" },
  { label: "🙋 Prayer", href: "/dashboard/prayer" },
  { label: "Ministry", href: "#", isSection: true },
  ...MINISTRY_NAV_ITEMS,
  { label: "Outreach", href: "#", isSection: true },
  { label: "✝️ Evangelism", href: "/dashboard/evangelism" },
  { label: "📧 Visitor Onboarding", href: "/dashboard/visitors/sequences" },
  { label: "Marketing", href: "#", isSection: true },
  { label: "⭐ Review Campaign", href: "/dashboard/reviews" },
  { label: "Settings", href: "#", isSection: true },
  { label: "⚙️ Settings", href: "/dashboard/settings" },
  { label: "💳 Billing", href: "/dashboard/billing" },
  { label: "📖 Tutorials", href: "/dashboard/tutorials" },
];

type PermissionForm = {
  id: string;
  student_id: string;
  ministry_type: string;
  parent_name: string;
  parent_phone: string;
  parent_email: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relationship: string;
  allergies: string;
  medications: string;
  medical_notes: string;
  on_campus: boolean;
  off_campus: boolean;
  overnight: boolean;
  photo_permission: boolean;
  video_permission: boolean;
  physical_signature_received: boolean;
  signature_received_date: string | null;
  signed_date: string | null;
  expires_at: string | null;
  created_at: string;
  student: { id: string; first_name: string; last_name: string; grade: string | null; date_of_birth: string | null } | null;
};

function isExpired(form: PermissionForm) {
  if (!form.expires_at) return false;
  return new Date(form.expires_at) < new Date();
}
function isExpiringSoon(form: PermissionForm) {
  if (!form.expires_at) return false;
  const exp = new Date(form.expires_at);
  const today = new Date();
  const in30 = new Date(); in30.setDate(in30.getDate() + 30);
  return exp >= today && exp <= in30;
}
function signatureStatus(form: PermissionForm): 'signed' | 'pending' | 'expired' {
  if (isExpired(form)) return 'expired';
  if (form.physical_signature_received) return 'signed';
  return 'pending';
}
function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function PermPill({ val, label }: { val: boolean; label: string }) {
  return (
    <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
      style={{ backgroundColor: val ? '#f0fdf4' : '#fef2f2', color: val ? '#166534' : '#991b1b' }}>
      {val ? '✓' : '✗'} {label}
    </span>
  );
}

export default function MiddleSchoolPermissionsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [forms, setForms] = useState<PermissionForm[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | 'missing' | 'expiring'>('all');
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [emailingSent, setEmailingSent] = useState<Record<string, boolean>>({});

  const [newStudentId, setNewStudentId] = useState('');
  const [newParentName, setNewParentName] = useState('');
  const [newParentPhone, setNewParentPhone] = useState('');
  const [newParentEmail, setNewParentEmail] = useState('');
  const [newEmergencyName, setNewEmergencyName] = useState('');
  const [newEmergencyPhone, setNewEmergencyPhone] = useState('');
  const [newEmergencyRel, setNewEmergencyRel] = useState('');
  const [newAllergies, setNewAllergies] = useState('');
  const [newMedications, setNewMedications] = useState('');
  const [newMedicalNotes, setNewMedicalNotes] = useState('');
  const [newOnCampus, setNewOnCampus] = useState(true);
  const [newOffCampus, setNewOffCampus] = useState(false);
  const [newOvernight, setNewOvernight] = useState(false);
  const [newPhoto, setNewPhoto] = useState(false);
  const [newVideo, setNewVideo] = useState(false);
  const [newSignedDate, setNewSignedDate] = useState('');

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace('/'); return; }
      const t = session.access_token;
      setToken(t);
      const headers = { Authorization: `Bearer ${t}` };
      const [formsRes, studentsRes] = await Promise.all([
        fetch('/api/middle-school-ministry/permissions', { headers }),
        fetch('/api/middle-school-ministry/students', { headers }),
      ]);
      if (formsRes.ok) { const d = await formsRes.json(); setForms(d.forms ?? []); }
      if (studentsRes.ok) { const d = await studentsRes.json(); setStudents(d.students ?? []); }
      setLoading(false);
    }
    init();
  }, [router]);

  const filtered = useMemo(() => {
    let list = forms;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(f => {
        const sName = f.student ? `${f.student.first_name} ${f.student.last_name}`.toLowerCase() : '';
        return sName.includes(q) || (f.parent_name ?? '').toLowerCase().includes(q);
      });
    }
    if (filter === 'missing') list = list.filter(f => !f.physical_signature_received && !isExpired(f));
    if (filter === 'expiring') list = list.filter(isExpiringSoon);
    return list;
  }, [forms, search, filter]);

  function resetModal() {
    setNewStudentId(''); setNewParentName(''); setNewParentPhone(''); setNewParentEmail('');
    setNewEmergencyName(''); setNewEmergencyPhone(''); setNewEmergencyRel('');
    setNewAllergies(''); setNewMedications(''); setNewMedicalNotes('');
    setNewOnCampus(true); setNewOffCampus(false); setNewOvernight(false);
    setNewPhoto(false); setNewVideo(false); setNewSignedDate('');
  }

  async function handleAddForm() {
    if (!token || !newStudentId) return;
    setSaving(true);
    const res = await fetch('/api/middle-school-ministry/permissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        student_id: newStudentId,
        parent_name: newParentName, parent_phone: newParentPhone, parent_email: newParentEmail,
        emergency_contact_name: newEmergencyName, emergency_contact_phone: newEmergencyPhone,
        emergency_contact_relationship: newEmergencyRel,
        allergies: newAllergies, medications: newMedications, medical_notes: newMedicalNotes,
        on_campus: newOnCampus, off_campus: newOffCampus, overnight: newOvernight,
        photo_permission: newPhoto, video_permission: newVideo,
        signed_date: newSignedDate || null,
      }),
    });
    if (res.ok) {
      const d = await res.json();
      setForms(prev => [d.form, ...prev]);
      setShowAddModal(false);
      resetModal();
    }
    setSaving(false);
  }

  async function handleMarkSigned(formId: string) {
    if (!token) return;
    setMarkingId(formId);
    const res = await fetch(`/api/youth-ministry/permissions/${formId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ physical_signature_received: true }),
    });
    if (res.ok) { const d = await res.json(); setForms(prev => prev.map(f => f.id === formId ? { ...d.form, student: f.student } : f)); }
    setMarkingId(null);
  }

  async function handleEmailParent(formId: string) {
    if (!token) return;
    setEmailingSent(prev => ({ ...prev, [formId]: true }));
    await fetch(`/api/youth-ministry/permissions/${formId}/send-email`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    setTimeout(() => setEmailingSent(prev => ({ ...prev, [formId]: false })), 3000);
  }

  async function handleDelete(formId: string) {
    if (!token || !confirm('Delete this permission form? This cannot be undone.')) return;
    const res = await fetch(`/api/youth-ministry/permissions/${formId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setForms(prev => prev.filter(f => f.id !== formId));
  }

  const total = forms.length;
  const signed = forms.filter(f => f.physical_signature_received).length;
  const expiring = forms.filter(isExpiringSoon).length;
  const expired = forms.filter(isExpired).length;

  if (loading) return (
    <AppShell navItems={navItems}>
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-400" style={{ fontFamily: 'Georgia, serif' }}>Loading permission forms…</p>
      </div>
    </AppShell>
  );

  return (
    <AppShell navItems={navItems}>
      <div className="px-8 py-10" style={{ background: `linear-gradient(135deg, #c2570a 0%, ${ACCENT} 100%)` }}>
        <Link href="/dashboard/ministry/middle-school" className="text-orange-200 text-xs mb-1 block hover:text-white">← Middle School</Link>
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "Georgia, serif" }}>Middle School Permission Forms</h1>
            <p className="text-orange-100 text-sm mt-1">Track parent signatures and activity authorizations</p>
          </div>
          <button onClick={() => { resetModal(); setShowAddModal(true); }}
            className="px-4 py-2.5 rounded-xl text-sm font-bold bg-white flex-shrink-0" style={{ color: ACCENT }}>
            + Add Form
          </button>
        </div>
      </div>

      <div className="px-8 py-8 bg-gray-50 min-h-screen">
        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Total Forms", value: total, emoji: "📝" },
            { label: "Signatures Received", value: signed, emoji: "✅" },
            { label: "Expiring Soon", value: expiring, emoji: "⚠️" },
            { label: "Expired", value: expired, emoji: "❌" },
          ].map(card => (
            <div key={card.label} className="bg-white rounded-xl shadow-md px-5 py-4 flex items-center gap-3 border border-gray-100">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0" style={{ backgroundColor: ACCENT + "22" }}>
                {card.emoji}
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{card.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Search + filter */}
        <div className="mb-4">
          <input type="text" placeholder="Search by student or parent name…" value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white" />
        </div>
        <div className="flex gap-1 mb-5">
          {[{ key: 'all', label: 'All' }, { key: 'missing', label: 'Missing Signature' }, { key: 'expiring', label: 'Expiring Soon' }].map(tab => (
            <button key={tab.key} onClick={() => setFilter(tab.key as any)}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              style={{ backgroundColor: filter === tab.key ? ACCENT : 'white', color: filter === tab.key ? 'white' : '#6b7280', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Cards */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl shadow border border-gray-100 p-12 text-center">
            <p className="text-3xl mb-3">📝</p>
            <p className="font-semibold text-gray-700 mb-1">No permission forms found</p>
            <p className="text-sm text-gray-400">Add a form to get started.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {filtered.map(form => {
              const studentName = form.student ? `${form.student.first_name} ${form.student.last_name}` : 'Unknown Student';
              const status = signatureStatus(form);
              const statusBadge = { signed: 'bg-green-100 text-green-700', pending: 'bg-amber-100 text-amber-700', expired: 'bg-red-100 text-red-700' }[status];
              const statusLabel = { signed: '✓ Signed', pending: '⏳ Pending Signature', expired: '✗ Expired' }[status];
              const expiryColor = isExpired(form) ? '#dc2626' : isExpiringSoon(form) ? '#d97706' : '#6b7280';
              return (
                <div key={form.id} className="bg-white rounded-2xl shadow border border-gray-100 p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900 text-base" style={{ fontFamily: 'Georgia, serif' }}>{studentName}</span>
                      {form.student?.grade && <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-50 text-blue-700">Grade {form.student.grade}</span>}
                    </div>
                    <span className={`text-xs px-3 py-1 rounded-full font-semibold flex-shrink-0 ${statusBadge}`}>{statusLabel}</span>
                  </div>
                  <div className="text-sm text-gray-500 mb-3 flex flex-wrap gap-x-3 gap-y-1">
                    {form.parent_name && <span>👤 {form.parent_name}</span>}
                    {form.parent_phone && <span>📞 {form.parent_phone}</span>}
                    {form.parent_email && <span>✉️ {form.parent_email}</span>}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <PermPill val={form.on_campus} label="On Campus" />
                    <PermPill val={form.off_campus} label="Off Campus" />
                    <PermPill val={form.overnight} label="Overnight" />
                    <PermPill val={form.photo_permission} label="Photo" />
                    <PermPill val={form.video_permission} label="Video" />
                  </div>
                  <div className="text-xs mb-4" style={{ color: expiryColor }}>
                    {form.expires_at ? (isExpired(form) ? `Expired ${fmtDate(form.expires_at)}` : `Valid through ${fmtDate(form.expires_at)}`) : 'No expiry date'}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/dashboard/youth-ministry/permissions/print/${form.id}`} target="_blank"
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50">
                      🖨️ Print
                    </Link>
                    <button onClick={() => handleEmailParent(form.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold border text-white"
                      style={{ backgroundColor: emailingSent[form.id] ? '#22c55e' : ACCENT, borderColor: emailingSent[form.id] ? '#22c55e' : ACCENT }}>
                      {emailingSent[form.id] ? '✓ Sent' : '📧 Email Parent'}
                    </button>
                    {!form.physical_signature_received && !isExpired(form) && (
                      <button onClick={() => handleMarkSigned(form.id)} disabled={markingId === form.id}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-600 text-white hover:bg-green-700 disabled:opacity-60">
                        {markingId === form.id ? 'Saving…' : '✅ Mark Signed'}
                      </button>
                    )}
                    <button onClick={() => handleDelete(form.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-200 text-red-600 hover:bg-red-50 ml-auto">
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900" style={{ fontFamily: 'Georgia, serif' }}>Add Permission Form</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1">Student *</label>
                <select value={newStudentId} onChange={e => setNewStudentId(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white">
                  <option value="">— Select student —</option>
                  {students.map((s: any) => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}{s.grade ? ` (${s.grade})` : ''}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[{ label: 'Parent Name', val: newParentName, set: setNewParentName }, { label: 'Parent Phone', val: newParentPhone, set: setNewParentPhone }].map(({ label, val, set }) => (
                  <div key={label}>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1">{label}</label>
                    <input value={val} onChange={e => set(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1">Parent Email</label>
                <input type="email" value={newParentEmail} onChange={e => setNewParentEmail(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[{ label: 'Emergency Contact', val: newEmergencyName, set: setNewEmergencyName }, { label: 'Emergency Phone', val: newEmergencyPhone, set: setNewEmergencyPhone }].map(({ label, val, set }) => (
                  <div key={label}>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1">{label}</label>
                    <input value={val} onChange={e => set(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1">Relationship</label>
                <input value={newEmergencyRel} onChange={e => setNewEmergencyRel(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Permissions</label>
                <div className="space-y-2">
                  {[
                    { label: 'On-Campus Activities', val: newOnCampus, set: setNewOnCampus },
                    { label: 'Off-Campus Activities', val: newOffCampus, set: setNewOffCampus },
                    { label: 'Overnight Events', val: newOvernight, set: setNewOvernight },
                    { label: 'Photo Permission', val: newPhoto, set: setNewPhoto },
                    { label: 'Video Permission', val: newVideo, set: setNewVideo },
                  ].map(({ label, val, set }) => (
                    <label key={label} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={val} onChange={e => set(e.target.checked)} className="w-4 h-4 rounded" />
                      <span className="text-sm text-gray-700">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1">Signed Date</label>
                <input type="date" value={newSignedDate} onChange={e => setNewSignedDate(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex gap-3">
              <button onClick={() => setShowAddModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600">Cancel</button>
              <button onClick={handleAddForm} disabled={saving || !newStudentId}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white"
                style={{ backgroundColor: ACCENT, opacity: saving || !newStudentId ? 0.6 : 1 }}>
                {saving ? 'Saving…' : 'Add Form'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
