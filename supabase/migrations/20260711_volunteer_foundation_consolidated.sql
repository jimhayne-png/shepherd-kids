-- ================================================================
-- Volunteer Vetted Access Foundation — Consolidated Production Migration
-- File: 20260711_volunteer_foundation_consolidated.sql
--
-- Supersedes 20260711_volunteer_vetted.sql and
-- 20260711_volunteer_security.sql (both are marked superseded;
-- they remain in the repository for history only and must not be
-- re-applied independently).
--
-- This migration is the sole authority for the missing volunteer
-- schema on production. It is safe on databases where cm_volunteers,
-- cm_volunteer_classroom_assignments, and cm_volunteer_sessions do
-- not yet exist.
--
-- Prerequisites (must already exist):
--   public.cm_checkin_rooms    — created by 20260506_cm_checkin.sql
--   public.cm_label_scan_log   — created by 20260614_smart_labels.sql
--   public.cm_parent_requests  — created by 20260615_parent_requests.sql
--
-- Type basis:
--   church_id = TEXT throughout (matches cm_checkin_rooms.church_id,
--               cm_checkin_records.church_id, cm_label_scan_log.church_id
--               all confirmed TEXT in production).
--   cm_checkin_rooms.id = uuid  (FK source for room_id columns).
--   cm_volunteers.id = uuid     (PK / FK source for volunteer_id columns).
--   cm_volunteer_sessions.id = uuid (PK / FK source for volunteer_session_id).
--   auth.users.id = uuid        (Supabase standard).
--
-- APPLICATION CODE CONFLICTS (fix after verifying migration):
--   cm_volunteer_sessions uses issued_at and revoked_at per this spec.
--   Existing app code references signed_in_at and invalidated_at.
--   The following routes require column-name updates before the
--   volunteer session feature can be used:
--     app/api/children-ministry/volunteer-audit/route.ts
--     app/api/kiosk/scan/[token]/route.ts
--     app/api/kiosk/volunteer/[churchId]/session/route.ts
--     app/api/kiosk/volunteer/[churchId]/parent-request/route.ts
-- ================================================================


-- ────────────────────────────────────────────────────────────────
-- SECTION 1: public.cm_volunteers
-- ────────────────────────────────────────────────────────────────
-- church_id TEXT: matches the check-in subsystem's established pattern.
-- pin_hash TEXT: stores scrypt-derived hash only; raw PIN never stored.
-- Phone index is scoped to (church_id, phone) for identity lookup
-- during volunteer sign-in. Partial to exclude NULL phones.

CREATE TABLE IF NOT EXISTS public.cm_volunteers (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id               text        NOT NULL,
  member_id               uuid        NULL,
  first_name              text        NOT NULL,
  last_name               text        NOT NULL,
  email                   text        NULL,
  phone                   text        NULL,
  roles                   text[]      NOT NULL DEFAULT '{}',
  is_active               boolean     NOT NULL DEFAULT true,
  background_check_status text        NOT NULL DEFAULT 'pending'
    CONSTRAINT cm_volunteers_background_check_status_check
    CHECK (background_check_status IN
      ('not_recorded', 'pending', 'cleared', 'expired', 'denied')),
  background_check_date   date        NULL,
  notes                   text        NULL,
  reliability_score       int         NOT NULL DEFAULT 100,
  approved                boolean     NOT NULL DEFAULT false,
  approved_at             timestamptz NULL,
  approved_by             text        NULL,
  pin_hash                text        NULL,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

-- General church lookup (used for list queries)
CREATE INDEX IF NOT EXISTS idx_cm_volunteers_church
  ON public.cm_volunteers(church_id);

-- Phone-scoped identity lookup used during kiosk PIN verification.
-- Partial: excludes rows where phone is NULL to avoid false uniqueness signals.
CREATE INDEX IF NOT EXISTS idx_cm_volunteers_church_phone
  ON public.cm_volunteers(church_id, phone)
  WHERE phone IS NOT NULL;

-- Prevent duplicate volunteers by phone within a church.
-- Partial unique index: allows NULL phones without blocking them.
CREATE UNIQUE INDEX IF NOT EXISTS idx_cm_volunteers_unique_church_phone
  ON public.cm_volunteers(church_id, phone)
  WHERE phone IS NOT NULL;

ALTER TABLE public.cm_volunteers ENABLE ROW LEVEL SECURITY;


-- ────────────────────────────────────────────────────────────────
-- SECTION 2: public.cm_volunteer_classroom_assignments
-- ────────────────────────────────────────────────────────────────
-- volunteer_id REFERENCES cm_volunteers(id): both uuid — FK compatible.
-- room_id      REFERENCES cm_checkin_rooms(id): both uuid — FK compatible.
-- church_id TEXT: matches the check-in subsystem.
-- Partial unique index on (volunteer_id, room_id) WHERE active prevents
-- duplicate active assignments while allowing historical deactivated rows.

CREATE TABLE IF NOT EXISTS public.cm_volunteer_classroom_assignments (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id    text        NOT NULL,
  volunteer_id uuid        NOT NULL
    REFERENCES public.cm_volunteers(id) ON DELETE CASCADE,
  room_id      uuid        NOT NULL
    REFERENCES public.cm_checkin_rooms(id) ON DELETE CASCADE,
  active       boolean     NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- Prevent duplicate active assignments per volunteer/room pair.
CREATE UNIQUE INDEX IF NOT EXISTS idx_cm_vca_unique_active
  ON public.cm_volunteer_classroom_assignments(volunteer_id, room_id)
  WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_cm_vca_church
  ON public.cm_volunteer_classroom_assignments(church_id);

CREATE INDEX IF NOT EXISTS idx_cm_vca_volunteer
  ON public.cm_volunteer_classroom_assignments(volunteer_id);

CREATE INDEX IF NOT EXISTS idx_cm_vca_room
  ON public.cm_volunteer_classroom_assignments(room_id);

ALTER TABLE public.cm_volunteer_classroom_assignments ENABLE ROW LEVEL SECURITY;


-- ────────────────────────────────────────────────────────────────
-- SECTION 3: public.cm_volunteer_sessions
-- ────────────────────────────────────────────────────────────────
-- session_token_hash TEXT UNIQUE: SHA-256 hash of the bearer token.
--   Raw token lives exclusively in the HttpOnly vk_session cookie.
--   Never stored here.
-- volunteer_id REFERENCES cm_volunteers(id): uuid — FK compatible.
-- room_id      REFERENCES cm_checkin_rooms(id): uuid — FK compatible.
-- church_id TEXT: compared at runtime to cm_checkin_records.church_id
--   (TEXT), so TEXT here avoids any implicit cast or mismatch.
-- issued_at / revoked_at: spec-canonical names.
--   NOTE: app code currently references signed_in_at / invalidated_at.
--   See APPLICATION CODE CONFLICTS in the file header.

CREATE TABLE IF NOT EXISTS public.cm_volunteer_sessions (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id          text        NOT NULL,
  volunteer_id       uuid        NOT NULL
    REFERENCES public.cm_volunteers(id) ON DELETE CASCADE,
  room_id            uuid        NOT NULL
    REFERENCES public.cm_checkin_rooms(id) ON DELETE CASCADE,
  session_token_hash text        NOT NULL,
  issued_at          timestamptz NOT NULL DEFAULT now(),
  expires_at         timestamptz NOT NULL DEFAULT (now() + interval '4 hours'),
  revoked_at         timestamptz NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cm_volunteer_sessions_token_hash_key UNIQUE (session_token_hash)
);

-- Hash lookup — used on every scan request.
CREATE INDEX IF NOT EXISTS idx_cm_vs_token
  ON public.cm_volunteer_sessions(session_token_hash);

-- Active session lookup for audit and admin views.
CREATE INDEX IF NOT EXISTS idx_cm_vs_church_issued
  ON public.cm_volunteer_sessions(church_id, issued_at DESC);

-- Volunteer-scoped lookup: revocation check by volunteer_id.
CREATE INDEX IF NOT EXISTS idx_cm_vs_volunteer
  ON public.cm_volunteer_sessions(volunteer_id);

-- Room-scoped lookup: useful for per-room audit queries.
CREATE INDEX IF NOT EXISTS idx_cm_vs_room
  ON public.cm_volunteer_sessions(room_id);

ALTER TABLE public.cm_volunteer_sessions ENABLE ROW LEVEL SECURITY;


-- ────────────────────────────────────────────────────────────────
-- SECTION 4: public.cm_label_scan_log — volunteer attribution
-- ────────────────────────────────────────────────────────────────
-- volunteer_id uuid: references cm_volunteers.id (uuid). No FK constraint
--   is added: FK locks on this high-write table cause contention, and the
--   insert happens after session validation rather than in a transaction
--   that would benefit from FK enforcement.
-- volunteer_session_id uuid: same rationale.
-- room_id text: may arrive as the UUID string from cm_volunteer_sessions.room_id
--   OR as the text value from cm_checkin_records.room_id. TEXT is the safe
--   common denominator; adding a UUID FK would reject text-typed room IDs.
--
-- No existing rows are affected. All new columns are NULL.

ALTER TABLE public.cm_label_scan_log
  ADD COLUMN IF NOT EXISTS volunteer_id         uuid NULL,
  ADD COLUMN IF NOT EXISTS volunteer_session_id uuid NULL,
  ADD COLUMN IF NOT EXISTS room_id              text NULL;

-- Widen result constraint.
-- DROP IF EXISTS is a no-op when the constraint is already absent.
-- The DO block re-adds the constraint only when it is confirmed absent,
-- preventing a duplicate-constraint error if the column add above
-- is a no-op (table partially migrated).
ALTER TABLE public.cm_label_scan_log
  DROP CONSTRAINT IF EXISTS cm_label_scan_log_result_check;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE t.relnamespace = 'public'::regnamespace
      AND t.relname = 'cm_label_scan_log'
      AND c.conname = 'cm_label_scan_log_result_check'
  ) THEN
    ALTER TABLE public.cm_label_scan_log
      ADD CONSTRAINT cm_label_scan_log_result_check
      CHECK (result IN ('valid', 'expired', 'not_found', 'unauthorized'));
  END IF;
END $$;


-- ────────────────────────────────────────────────────────────────
-- SECTION 5: public.cm_parent_requests — volunteer attribution
-- ────────────────────────────────────────────────────────────────
-- Same type rationale as cm_label_scan_log above.
-- Existing rows are not touched; all new columns default to NULL.

ALTER TABLE public.cm_parent_requests
  ADD COLUMN IF NOT EXISTS volunteer_id         uuid NULL,
  ADD COLUMN IF NOT EXISTS volunteer_session_id uuid NULL,
  ADD COLUMN IF NOT EXISTS room_id              text NULL;

-- Widen source constraint to include 'volunteer_scan'.
ALTER TABLE public.cm_parent_requests
  DROP CONSTRAINT IF EXISTS cm_parent_requests_source_check;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE t.relnamespace = 'public'::regnamespace
      AND t.relname = 'cm_parent_requests'
      AND c.conname = 'cm_parent_requests_source_check'
  ) THEN
    ALTER TABLE public.cm_parent_requests
      ADD CONSTRAINT cm_parent_requests_source_check
      CHECK (source IN ('scan', 'classroom', 'volunteer_scan'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_cm_pr_volunteer
  ON public.cm_parent_requests(volunteer_id);

CREATE INDEX IF NOT EXISTS idx_cm_pr_room
  ON public.cm_parent_requests(room_id);
