"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import AppShell, { type NavItem } from "@/components/layout/AppShell";
import { MINISTRY_NAV_ITEMS } from "@/lib/ministry-config";

const ACCENT = "#F28C28";

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
  youth_students: { first_name: string; last_name: string; grade: string | null; date_of_birth: string | null } | null;
};

function isExpired(form: PermissionForm) {
  if (!form.expires_at) return false;
  return new Date(form.expires_at) < new Date();
}
function isExpiringSoon(form: PermissionForm) {
  if (!form.expires_at) return false;
  const exp = new Date(form.expires_at);
  const today = new Date();
  const in30 = new Date();
  in30.setDate(in30.getDate() + 30);
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

export default function PermissionsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [forms, setForms] = useState<PermissionForm[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | 'missing' | 'expiring'>('all');
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [emailingSent, setEmailingSent] = useState<Record<string, boolean>>({});
  const [markingId, setMarkingId] = useState<string | null>(null);

  // Add modal form state
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
      if (!session) { router.push('/login'); return; }
      const t = session.access_token;
      setToken(t);
      const headers = { Authorization: `Bearer ${t}` };
      const [formsRes, studentsRes] = await Promise.all([
        fetch('/api/youth-ministry/permissions', { headers }),
        fetch('/api/youth-ministry/students', { headers }),
      ]);
      if (formsRes.ok) {
        const d = await formsRes.json();
        setForms(d.forms ?? []);
      }
      if (studentsRes.ok) {
        const d = await studentsRes.json();
        setStudents(d.students ?? []);
      }
      setLoading(false);
    }
    init();
  }, [router]);

  const filtered = useMemo(() => {
    let list = forms;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(f => {
        const sName = f.youth_students ? `${f.youth_students.first_name} ${f.youth_students.last_name}`.toLowerCase() : '';
        const pName = (f.parent_name ?? '').toLowerCase();
        return sName.includes(q) || pName.includes(q);
      });
    }
    if (filter === 'missing') list = list.filter(f => !f.physical_signature_received && !isExpired(f));
    if (filter === 'expiring') list = list.filter(f => isExpiringSoon(f));
    return list;
  }, [forms, search, filter]);

  const total = forms.length;
  const signed = forms.filter(f => f.physical_signature_received).length;
  const expiring = forms.filter(isExpiringSoon).length;
  const expired = forms.filter(isExpired).length;

  function resetModalState() {
    setNewStudentId('');
    setNewParentName('');
    setNewParentPhone('');
    setNewParentEmail('');
    setNewEmergencyName('');
    setNewEmergencyPhone('');
    setNewEmergencyRel('');
    setNewAllergies('');
    setNewMedications('');
    setNewMedicalNotes('');
    setNewOnCampus(true);
    setNewOffCampus(false);
    setNewOvernight(false);
    setNewPhoto(false);
    setNewVideo(false);
    setNewSignedDate('');
  }

  async function handleAddForm() {
    if (!token || !newStudentId) return;
    setSaving(true);
    const res = await fetch('/api/youth-ministry/permissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        student_id: newStudentId,
        parent_name: newParentName,
        parent_phone: newParentPhone,
        parent_email: newParentEmail,
        emergency_contact_name: newEmergencyName,
        emergency_contact_phone: newEmergencyPhone,
        emergency_contact_relationship: newEmergencyRel,
        allergies: newAllergies,
        medications: newMedications,
        medical_notes: newMedicalNotes,
        on_campus: newOnCampus,
        off_campus: newOffCampus,
        overnight: newOvernight,
        photo_permission: newPhoto,
        video_permission: newVideo,
        signed_date: newSignedDate || null,
      }),
    });
    if (res.ok) {
      const d = await res.json();
      setForms(prev => [d.form, ...prev]);
      setShowAddModal(false);
      resetModalState();
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
    if (res.ok) {
      const d = await res.json();
      setForms(prev => prev.map(f => f.id === formId ? d.form : f));
    }
    setMarkingId(null);
  }

  async function handleEmailParent(formId: string) {
    if (!token) return;
    setEmailingSent(prev => ({ ...prev, [formId]: true }));
    await fetch(`/api/youth-ministry/permissions/${formId}/send-email`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    setTimeout(() => setEmailingSent(prev => ({ ...prev, [formId]: false })), 3000);
  }

  async function handleDelete(formId: string) {
    if (!token) return;
    if (!confirm('Delete this permission form? This cannot be undone.')) return;
    const res = await fetch(`/api/youth-ministry/permissions/${formId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setForms(prev => prev.filter(f => f.id !== formId));
    }
  }

  function PermPill({ val, label }: { val: boolean; label: string }) {
    return (
      <span
        className="text-xs px-2 py-0.5 rounded-full font-semibold"
        style={{
          backgroundColor: val ? '#f0fdf4' : '#fef2f2',
          color: val ? '#166534' : '#991b1b',
        }}
      >
        {val ? '✓' : '✗'} {label}
      </span>
    );
  }

  if (loading) {
    return (
      <AppShell navItems={navItems}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-gray-400" style={{ fontFamily: 'Georgia, serif' }}>Loading permission forms…</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell navItems={navItems}>
      {/* Header */}
      <div
        className="rounded-2xl mb-6 px-7 py-6 flex items-center justify-between"
        style={{ background: 'linear-gradient(135deg, #c2570a 0%, #F28C28 100%)' }}
      >
        <div>
          <p className="text-orange-100 text-sm mb-1" style={{ fontFamily: 'Georgia, serif' }}>Youth Ministry</p>
          <h1 className="text-white text-2xl font-bold" style={{ fontFamily: 'Georgia, serif' }}>Permission Forms</h1>
          <p className="text-orange-100 text-sm mt-1">Track parent signatures and activity authorizations</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/youth-ministry"
            className="text-orange-100 text-sm hover:text-white transition-colors"
          >
            ← Back
          </Link>
          <button
            onClick={() => { resetModalState(); setShowAddModal(true); }}
            className="bg-white text-sm font-semibold rounded-xl px-4 py-2 hover:bg-orange-50 transition-colors"
            style={{ color: ACCENT }}
          >
            + Add Permission Form
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Forms", value: total, emoji: "📝" },
          { label: "Signatures Received", value: signed, emoji: "✅" },
          { label: "Expiring Soon", value: expiring, emoji: "⚠️" },
          { label: "Expired", value: expired, emoji: "❌" },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-xl shadow-md px-5 py-4 flex items-center gap-3 border border-gray-100">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0"
              style={{ backgroundColor: ACCENT + "22" }}
            >
              {card.emoji}
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by student or parent name…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-transparent"
          style={{ focusRingColor: ACCENT } as any}
        />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-5">
        {[
          { key: 'all', label: 'All' },
          { key: 'missing', label: 'Missing Signature' },
          { key: 'expiring', label: 'Expiring Soon' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as any)}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-colors"
            style={{
              backgroundColor: filter === tab.key ? ACCENT : 'white',
              color: filter === tab.key ? 'white' : '#6b7280',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Form cards */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl shadow border border-gray-100 p-12 text-center">
          <p className="text-3xl mb-3">📝</p>
          <p className="font-semibold text-gray-700 mb-1">No permission forms found</p>
          <p className="text-sm text-gray-400">Add a form to get started.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map(form => {
            const student = form.youth_students;
            const studentName = student ? `${student.first_name} ${student.last_name}` : 'Unknown Student';
            const status = signatureStatus(form);
            const statusBadge = {
              signed: 'bg-green-100 text-green-700',
              pending: 'bg-amber-100 text-amber-700',
              expired: 'bg-red-100 text-red-700',
            }[status];
            const statusLabel = {
              signed: '✓ Signed',
              pending: '⏳ Pending Signature',
              expired: '✗ Expired',
            }[status];
            const expiryColor = isExpired(form) ? '#dc2626' : isExpiringSoon(form) ? '#d97706' : '#6b7280';

            return (
              <div key={form.id} className="bg-white rounded-2xl shadow border border-gray-100 p-5">
                {/* Top row */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900 text-base" style={{ fontFamily: 'Georgia, serif' }}>
                      {studentName}
                    </span>
                    {student?.grade && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-50 text-blue-700">
                        Grade {student.grade}
                      </span>
                    )}
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full font-semibold flex-shrink-0 ${statusBadge}`}>
                    {statusLabel}
                  </span>
                </div>

                {/* Parent info */}
                <div className="text-sm text-gray-500 mb-3 flex flex-wrap gap-x-3 gap-y-1">
                  {form.parent_name && <span>👤 {form.parent_name}</span>}
                  {form.parent_phone && <span>📞 {form.parent_phone}</span>}
                  {form.parent_email && <span>✉️ {form.parent_email}</span>}
                </div>

                {/* Permission pills */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  <PermPill val={form.on_campus} label="On Campus" />
                  <PermPill val={form.off_campus} label="Off Campus" />
                  <PermPill val={form.overnight} label="Overnight" />
                  <PermPill val={form.photo_permission} label="Photo" />
                  <PermPill val={form.video_permission} label="Video" />
                </div>

                {/* Expiry */}
                <div className="text-xs mb-4" style={{ color: expiryColor }}>
                  {form.expires_at ? (
                    isExpired(form)
                      ? `Expired ${fmtDate(form.expires_at)}`
                      : `Valid through ${fmtDate(form.expires_at)}`
                  ) : 'No expiry date set'}
                  {form.physical_signature_received && form.signature_received_date && (
                    <span className="text-gray-400 ml-3">· Signed {fmtDate(form.signature_received_date)}</span>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2 items-center">
                  <Link
                    href={`/dashboard/youth-ministry/permissions/print/${form.id}`}
                    target="_blank"
                    className="text-xs px-3 py-1.5 rounded-lg font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    🖨️ Print Form
                  </Link>

                  {form.parent_email && (
                    <button
                      onClick={() => handleEmailParent(form.id)}
                      disabled={emailingSent[form.id]}
                      className="text-xs px-3 py-1.5 rounded-lg font-medium border transition-colors"
                      style={{
                        borderColor: emailingSent[form.id] ? '#16a34a' : ACCENT,
                        color: emailingSent[form.id] ? '#16a34a' : ACCENT,
                        backgroundColor: emailingSent[form.id] ? '#f0fdf4' : 'white',
                      }}
                    >
                      {emailingSent[form.id] ? '✓ Sent!' : '📧 Email to Parent'}
                    </button>
                  )}

                  {!form.physical_signature_received && !isExpired(form) && (
                    <button
                      onClick={() => handleMarkSigned(form.id)}
                      disabled={markingId === form.id}
                      className="text-xs px-3 py-1.5 rounded-lg font-medium text-white transition-colors"
                      style={{ backgroundColor: markingId === form.id ? '#9ca3af' : '#16a34a' }}
                    >
                      {markingId === form.id ? 'Saving…' : '✓ Mark Signed'}
                    </button>
                  )}

                  <button
                    onClick={() => handleDelete(form.id)}
                    className="text-xs px-3 py-1.5 rounded-lg font-medium text-red-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 transition-colors ml-auto"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Permission Form Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div
              className="px-6 py-4 rounded-t-2xl flex items-center justify-between"
              style={{ background: 'linear-gradient(135deg, #c2570a 0%, #F28C28 100%)' }}
            >
              <h2 className="text-white font-bold text-lg" style={{ fontFamily: 'Georgia, serif' }}>
                Add Permission Form
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-white/80 hover:text-white text-xl font-bold leading-none"
              >
                ×
              </button>
            </div>

            <div className="px-6 py-5 flex flex-col gap-5">
              {/* Student */}
              <div>
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3 pb-1 border-b border-gray-200">
                  Student
                </h3>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500 font-medium">Student *</label>
                  <select
                    value={newStudentId}
                    onChange={e => setNewStudentId(e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
                    style={{ '--tw-ring-color': ACCENT } as any}
                  >
                    <option value="">Select a student…</option>
                    {students.map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {s.first_name} {s.last_name}{s.grade ? ` — Grade ${s.grade}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Parent Contact */}
              <div>
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3 pb-1 border-b border-gray-200">
                  Parent / Guardian
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { label: 'Full Name', val: newParentName, set: setNewParentName, placeholder: 'Jane Smith' },
                    { label: 'Phone', val: newParentPhone, set: setNewParentPhone, placeholder: '(555) 000-0000' },
                    { label: 'Email', val: newParentEmail, set: setNewParentEmail, placeholder: 'jane@example.com', type: 'email' },
                  ].map(f => (
                    <div key={f.label} className="flex flex-col gap-1">
                      <label className="text-xs text-gray-500 font-medium">{f.label}</label>
                      <input
                        type={(f as any).type ?? 'text'}
                        value={f.val}
                        onChange={e => f.set(e.target.value)}
                        placeholder={f.placeholder}
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Emergency Contact */}
              <div>
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3 pb-1 border-b border-gray-200">
                  Emergency Contact
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { label: 'Name', val: newEmergencyName, set: setNewEmergencyName, placeholder: 'John Smith' },
                    { label: 'Phone', val: newEmergencyPhone, set: setNewEmergencyPhone, placeholder: '(555) 000-0000' },
                    { label: 'Relationship', val: newEmergencyRel, set: setNewEmergencyRel, placeholder: 'Uncle, Grandparent…' },
                  ].map(f => (
                    <div key={f.label} className="flex flex-col gap-1">
                      <label className="text-xs text-gray-500 font-medium">{f.label}</label>
                      <input
                        type="text"
                        value={f.val}
                        onChange={e => f.set(e.target.value)}
                        placeholder={f.placeholder}
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Medical */}
              <div>
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3 pb-1 border-b border-gray-200">
                  Medical Information
                </h3>
                <div className="flex flex-col gap-3">
                  {[
                    { label: 'Known Allergies', val: newAllergies, set: setNewAllergies, placeholder: 'Peanuts, bee stings…' },
                    { label: 'Current Medications', val: newMedications, set: setNewMedications, placeholder: 'Epipen, Inhaler…' },
                    { label: 'Additional Medical Notes', val: newMedicalNotes, set: setNewMedicalNotes, placeholder: 'Any other relevant information…' },
                  ].map(f => (
                    <div key={f.label} className="flex flex-col gap-1">
                      <label className="text-xs text-gray-500 font-medium">{f.label}</label>
                      <textarea
                        value={f.val}
                        onChange={e => f.set(e.target.value)}
                        placeholder={f.placeholder}
                        rows={2}
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 resize-none"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Permissions */}
              <div>
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3 pb-1 border-b border-gray-200">
                  Activity Permissions
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'On-Campus Activities', val: newOnCampus, set: setNewOnCampus },
                    { label: 'Off-Campus Activities', val: newOffCampus, set: setNewOffCampus },
                    { label: 'Overnight Events', val: newOvernight, set: setNewOvernight },
                    { label: 'Photo Permission', val: newPhoto, set: setNewPhoto },
                    { label: 'Video / Media Permission', val: newVideo, set: setNewVideo },
                  ].map(f => (
                    <label key={f.label} className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={f.val}
                        onChange={e => f.set(e.target.checked)}
                        className="w-4 h-4 rounded"
                        style={{ accentColor: ACCENT }}
                      />
                      <span className="text-sm text-gray-700">{f.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Signed Date */}
              <div>
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3 pb-1 border-b border-gray-200">
                  Form Date
                </h3>
                <div className="flex flex-col gap-1 max-w-xs">
                  <label className="text-xs text-gray-500 font-medium">Signed Date (leave blank for today)</label>
                  <input
                    type="date"
                    value={newSignedDate}
                    onChange={e => setNewSignedDate(e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm rounded-xl font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddForm}
                  disabled={saving || !newStudentId}
                  className="px-5 py-2 text-sm rounded-xl font-semibold text-white transition-colors"
                  style={{ backgroundColor: saving || !newStudentId ? '#d1d5db' : ACCENT }}
                >
                  {saving ? 'Saving…' : 'Save Permission Form'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
