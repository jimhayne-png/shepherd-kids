-- ============================================================
-- Certificate workflow table
-- Run after 00_base_schema.sql
-- ============================================================

create table if not exists cm_certificates (
  id                       uuid        primary key default gen_random_uuid(),
  church_id                uuid        not null,
  child_id                 uuid,

  -- Certificate type and template
  cert_type                text        not null default 'birthday',
  template                 text        not null default 'purple',

  -- Certificate content (denormalized so reprints never lose data)
  child_name               text        not null,
  church_name              text,
  church_tagline           text,
  minister_name            text,
  minister_title           text,
  verse                    text,
  reference                text,
  translation              text        not null default 'kjv',
  blessing                 text,
  presentation_date        date,

  -- Workflow status
  --   draft → ready_to_print → printed → presented
  --   presented → email_scheduled | email_sent → archived
  status                   text        not null default 'draft',

  -- Audit trail
  created_by               uuid,
  printed_by               uuid,
  presented_by             uuid,
  printed_at               timestamptz,
  presented_at             timestamptz,

  -- Parent email workflow
  parent_email             text,
  email_scheduled_for      timestamptz,
  parent_email_scheduled_at timestamptz,
  parent_email_sent_at     timestamptz,

  -- Reprint tracking
  reprint_count            integer     not null default 0,

  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

-- Indexes for common query patterns
create index if not exists idx_cm_certs_church    on cm_certificates(church_id);
create index if not exists idx_cm_certs_child     on cm_certificates(child_id);
create index if not exists idx_cm_certs_status    on cm_certificates(status);
create index if not exists idx_cm_certs_created   on cm_certificates(created_at desc);
