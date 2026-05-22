"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

export default function BlankPermissionFormPage() {
  const [churchName, setChurchName] = useState("Your Church");

  useEffect(() => {
    async function load() {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (!user || error) {
        console.log("Dashboard client user unavailable:", error?.message ?? null);
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch('/api/settings', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const d = await res.json();
        if (d.church?.name) setChurchName(d.church.name);
      }
    }
    load();
  }, []);

  const lineStyle: React.CSSProperties = {
    borderBottom: '1px solid #374151',
    paddingBottom: 4,
    marginBottom: 4,
    minHeight: 22,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 10,
    color: '#6b7280',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: 2,
    fontFamily: 'Arial, sans-serif',
  };

  function BlankField({ label, wide }: { label: string; wide?: boolean }) {
    return (
      <div style={{ marginBottom: 14, gridColumn: wide ? '1 / -1' : undefined }}>
        <div style={labelStyle}>{label}</div>
        <div style={lineStyle} />
      </div>
    );
  }

  function SectionHeader({ title }: { title: string }) {
    return (
      <div style={{ borderBottom: '2px solid #1a3a5c', marginBottom: 12, paddingBottom: 4, marginTop: 24 }}>
        <h2 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#1a3a5c', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{title}</h2>
      </div>
    );
  }

  function Checkbox({ label }: { label: string }) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{ width: 18, height: 18, border: '2px solid #374151', borderRadius: 3, flexShrink: 0 }} />
        <span style={{ fontSize: 14, color: '#374151' }}>{label}</span>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; }
        }
        @page { margin: 0.75in; }
      `}</style>

      {/* Print button */}
      <div className="no-print" style={{ position: 'fixed', top: 16, right: 16, zIndex: 100 }}>
        <button
          onClick={() => window.print()}
          style={{ backgroundColor: '#1a3a5c', color: 'white', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
        >
          🖨️ Print
        </button>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 48px', fontFamily: 'Georgia, serif', color: '#111827', backgroundColor: 'white', minHeight: '100vh' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', borderBottom: '3px solid #1a3a5c', paddingBottom: 16, marginBottom: 8 }}>
          <p style={{ margin: '0 0 4px', fontSize: 11, color: '#C8A951', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: 'Arial, sans-serif' }}>Youth Ministry</p>
          <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 'normal', color: '#1a3a5c' }}>{churchName}</h1>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#374151', letterSpacing: '0.02em' }}>PARENT PERMISSION FORM</h2>
        </div>

        <p style={{ fontSize: 12, color: '#6b7280', textAlign: 'center', margin: '8px 0 24px', fontFamily: 'Arial, sans-serif' }}>
          Please complete all sections and return to the Youth Ministry office.
        </p>

        {/* Student Information */}
        <SectionHeader title="Student Information" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
          <BlankField label="First Name" />
          <BlankField label="Last Name" />
          <BlankField label="Date of Birth" />
          <BlankField label="Grade" />
        </div>

        {/* Parent / Guardian */}
        <SectionHeader title="Parent / Guardian" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
          <BlankField label="Parent/Guardian Name" />
          <BlankField label="Phone" />
          <BlankField label="Email" wide />
        </div>

        {/* Emergency Contact */}
        <SectionHeader title="Emergency Contact" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
          <BlankField label="Name" />
          <BlankField label="Phone" />
          <BlankField label="Relationship" />
        </div>

        {/* Medical Information */}
        <SectionHeader title="Medical Information" />
        <BlankField label="Known Allergies" />
        <BlankField label="Current Medications" />
        <BlankField label="Additional Medical Notes" />

        {/* Activity Permissions */}
        <SectionHeader title="Activity Permissions" />
        <p style={{ fontSize: 13, color: '#374151', marginBottom: 14, fontFamily: 'Arial, sans-serif' }}>
          I give permission for my child to participate in the checked activities:
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
          <div>
            <Checkbox label="On-Campus Activities" />
            <Checkbox label="Off-Campus Activities" />
            <Checkbox label="Overnight Events" />
          </div>
          <div>
            <Checkbox label="Photo Permission" />
            <Checkbox label="Video / Media Permission" />
          </div>
        </div>

        {/* Signature */}
        <SectionHeader title="Parent / Guardian Signature" />
        <p style={{ fontSize: 13, color: '#374151', marginBottom: 20, fontFamily: 'Arial, sans-serif', lineHeight: 1.6 }}>
          By signing below, I certify that the information provided is accurate and I give permission for my child to participate in the activities checked above under the supervision of {churchName} youth staff.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 32 }}>
          <div>
            <div style={{ borderBottom: '2px solid #374151', paddingBottom: 24, marginBottom: 4 }} />
            <div style={{ fontSize: 11, color: '#6b7280', fontFamily: 'Arial, sans-serif' }}>Parent/Guardian Signature</div>
          </div>
          <div>
            <div style={{ borderBottom: '2px solid #374151', paddingBottom: 24, marginBottom: 4 }} />
            <div style={{ fontSize: 11, color: '#6b7280', fontFamily: 'Arial, sans-serif' }}>Date</div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 40, paddingTop: 16, borderTop: '1px solid #e5e7eb', textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 11, color: '#9ca3af', fontFamily: 'Arial, sans-serif' }}>
            {churchName} Youth Ministry · Parent Permission Form
          </p>
        </div>
      </div>
    </>
  );
}
