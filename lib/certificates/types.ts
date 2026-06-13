export type CertificateStatus =
  | 'draft'
  | 'ready_to_print'
  | 'printed'
  | 'presented'
  | 'email_scheduled'
  | 'email_sent'
  | 'archived';

export interface CertificateRecord {
  id: string;
  church_id: string;
  child_id: string | null;
  cert_type: string;
  template: 'purple' | 'white';
  child_name: string;
  church_name: string | null;
  church_tagline: string | null;
  minister_name: string | null;
  minister_title: string | null;
  verse: string | null;
  reference: string | null;
  translation: 'kjv' | 'niv';
  blessing: string | null;
  presentation_date: string | null;
  status: CertificateStatus;
  created_by: string | null;
  printed_by: string | null;
  presented_by: string | null;
  printed_at: string | null;
  presented_at: string | null;
  parent_email: string | null;
  email_scheduled_for: string | null;
  parent_email_scheduled_at: string | null;
  parent_email_sent_at: string | null;
  reprint_count: number;
  created_at: string;
  updated_at: string;
}

export const STATUS_LABEL: Record<CertificateStatus, string> = {
  draft:           'Draft',
  ready_to_print:  'Ready to Print',
  printed:         'Printed',
  presented:       'Presented',
  email_scheduled: 'Email Scheduled',
  email_sent:      'Email Sent',
  archived:        'Archived',
};

export const STATUS_COLOR: Record<CertificateStatus, { bg: string; text: string; border: string }> = {
  draft:           { bg: 'rgba(107,114,128,0.18)', text: '#9CA3AF', border: 'rgba(107,114,128,0.35)' },
  ready_to_print:  { bg: 'rgba(37,99,235,0.18)',   text: '#93C5FD', border: 'rgba(37,99,235,0.35)'   },
  printed:         { bg: 'rgba(124,58,237,0.18)',   text: '#C4B5FD', border: 'rgba(124,58,237,0.35)'  },
  presented:       { bg: 'rgba(5,150,105,0.18)',    text: '#6EE7B7', border: 'rgba(5,150,105,0.35)'   },
  email_scheduled: { bg: 'rgba(217,119,6,0.18)',    text: '#FCD34D', border: 'rgba(217,119,6,0.35)'   },
  email_sent:      { bg: 'rgba(16,185,129,0.18)',   text: '#34D399', border: 'rgba(16,185,129,0.35)'  },
  archived:        { bg: 'rgba(75,85,99,0.18)',     text: '#6B7280', border: 'rgba(75,85,99,0.35)'    },
};

// Ordered steps for the visual timeline (archived is off to the side)
export const STATUS_STEPS: CertificateStatus[] = [
  'draft', 'ready_to_print', 'printed', 'presented', 'email_scheduled', 'email_sent',
];

export function stepIndex(status: CertificateStatus): number {
  const i = STATUS_STEPS.indexOf(status);
  return i === -1 ? STATUS_STEPS.length : i; // archived sits past the end
}
