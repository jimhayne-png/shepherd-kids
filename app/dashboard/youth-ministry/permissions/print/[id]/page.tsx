"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type FormData = {
  id: string;
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
  signed_date: string | null;
  expires_at: string | null;
  youth_students: { first_name: string; last_name: string; grade: string | null; date_of_birth: string | null } | null;
};

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function Checkbox({ checked, label }: { checked: boolean; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
      <div style={{
        width: 18, height: 18, border: '2px solid #374151', borderRadius: 3,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: checked ? '#1a3a5c' : 'white', flexShrink: 0,
      }}>
        {checked && <span style={{ color: 'white', fontSize: 12, fontWeight: 'bold', lineHeight: 1 }}>✓</span>}
      </div>
      <span style={{ fontSize: 14, color: '#374151' }}>{label}</span>
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div style={{ borderBottom: '2px solid #1a3a5c', marginBottom: 12, paddingBottom: 4, marginTop: 24 }}>
      <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1a3a5c', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</h2>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{label}</div>
      <div style={{ borderBottom: '1px solid #d1d5db', paddingBottom: 4, fontSize: 14, color: '#111827', minHeight: 20 }}>{value || ' '}</div>
    </div>
  );
}

export default function PrintPermissionPage() {
  const params = useParams();
  const id = params.id as string;

  const [form, setForm] = useState<FormData | null>(null);
  const [churchName, setChurchName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const t = session.access_token;
      const headers = { Authorization: `Bearer ${t}` };
      const [formRes, settingsRes] = await Promise.all([
        fetch(`/api/youth-ministry/permissions`, { headers }),
        fetch('/api/settings', { headers }),
      ]);
      if (formRes.ok) {
        const d = await formRes.json();
        const found = (d.forms ?? []).find((f: any) => f.id === id);
        if (found) setForm(found);
      }
      if (settingsRes.ok) {
        const d = await settingsRes.json();
        setChurchName(d.church?.name ?? '');
      }
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb' }}>
      <p style={{ color: '#9ca3af', fontFamily: 'Georgia, serif' }}>Loading…</p>
    </div>
  );

  if (!form) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb' }}>
      <p style={{ color: '#6b7280' }}>Permission form not found.</p>
    </div>
  );

  const student = form.youth_students;
  const studentName = student ? `${student.first_name} ${student.last_name}` : '—';

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; }
        }
        @page { margin: 0.75in; }
      `}</style>

      {/* Print button — hidden when printing */}
      <div className="no-print" style={{ position: 'fixed', top: 16, right: 16, zIndex: 100 }}>
        <button
          onClick={() => window.print()}
          style={{ backgroundColor: '#1a3a5c', color: 'white', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
        >
          🖨️ Print
        </button>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 48px', fontFamily: 'Georgia, serif', color: '#111827', backgroundColor: 'white', minHeight: '100vh' }}>

        {/* Church header */}
        <div style={{ textAlign: 'center', borderBottom: '3px solid #1a3a5c', paddingBottom: 16, marginBottom: 8 }}>
          <p style={{ margin: '0 0 4px', fontSize: 11, color: '#C8A951', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: 'Arial, sans-serif' }}>Youth Ministry</p>
          <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 'normal', color: '#1a3a5c' }}>{churchName || 'Youth Ministry'}</h1>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#374151', letterSpacing: '0.02em' }}>PARENT PERMISSION FORM</h2>
        </div>

        <p style={{ fontSize: 12, color: '#6b7280', textAlign: 'center', margin: '8px 0 24px', fontFamily: 'Arial, sans-serif' }}>
          Valid: {fmtDate(form.signed_date)} — {fmtDate(form.expires_at)}
        </p>

        {/* Student Information */}
        <SectionHeader title="Student Information" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
          <Field label="Student Name" value={studentName} />
          <Field label="Grade" value={student?.grade ?? '—'} />
          <Field label="Date of Birth" value={fmtDate(student?.date_of_birth ?? null)} />
        </div>

        {/* Parent / Guardian */}
        <SectionHeader title="Parent / Guardian" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
          <Field label="Parent/Guardian Name" value={form.parent_name} />
          <Field label="Phone" value={form.parent_phone} />
          <Field label="Email" value={form.parent_email} />
        </div>

        {/* Emergency Contact */}
        <SectionHeader title="Emergency Contact" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
          <Field label="Name" value={form.emergency_contact_name} />
          <Field label="Phone" value={form.emergency_contact_phone} />
          <Field label="Relationship" value={form.emergency_contact_relationship} />
        </div>

        {/* Medical Information */}
        <SectionHeader title="Medical Information" />
        <Field label="Known Allergies" value={form.allergies || 'None'} />
        <Field label="Current Medications" value={form.medications || 'None'} />
        <Field label="Additional Medical Notes" value={form.medical_notes || 'None'} />

        {/* Activity Permissions */}
        <SectionHeader title="Activity Permissions" />
        <p style={{ fontSize: 13, color: '#374151', marginBottom: 12, fontFamily: 'Arial, sans-serif' }}>
          I give permission for my child to participate in the following activities:
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
          <div>
            <Checkbox checked={form.on_campus} label="On-Campus Activities" />
            <Checkbox checked={form.off_campus} label="Off-Campus Activities" />
            <Checkbox checked={form.overnight} label="Overnight Events" />
          </div>
          <div>
            <Checkbox checked={form.photo_permission} label="Photo Permission" />
            <Checkbox checked={form.video_permission} label="Video / Media Permission" />
          </div>
        </div>

        {/* Signature */}
        <SectionHeader title="Parent / Guardian Signature" />
        <p style={{ fontSize: 13, color: '#374151', marginBottom: 20, fontFamily: 'Arial, sans-serif', lineHeight: 1.6 }}>
          By signing below, I certify that the information provided is accurate and I give permission for my child to participate in the activities checked above under the supervision of {churchName || 'church'} youth staff.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 32, marginTop: 8 }}>
          <div>
            {form.physical_signature_received ? (
              <div style={{ borderBottom: '2px solid #374151', paddingBottom: 4, marginBottom: 4, color: '#16a34a', fontSize: 14, fontWeight: 600 }}>✓ Signature on file</div>
            ) : (
              <div style={{ borderBottom: '2px solid #374151', paddingBottom: 24, marginBottom: 4 }} />
            )}
            <div style={{ fontSize: 11, color: '#6b7280', fontFamily: 'Arial, sans-serif' }}>Parent/Guardian Signature</div>
          </div>
          <div>
            <div style={{ borderBottom: '2px solid #374151', paddingBottom: 4, marginBottom: 4, fontSize: 14 }}>
              {form.signed_date ? fmtDate(form.signed_date) : ' '}
            </div>
            <div style={{ fontSize: 11, color: '#6b7280', fontFamily: 'Arial, sans-serif' }}>Date</div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 40, paddingTop: 16, borderTop: '1px solid #e5e7eb', textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 11, color: '#9ca3af', fontFamily: 'Arial, sans-serif' }}>
            {churchName} Youth Ministry · Permission Form · Valid Through {fmtDate(form.expires_at)}
          </p>
        </div>
      </div>
    </>
  );
}
