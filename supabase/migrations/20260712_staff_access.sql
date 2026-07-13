-- Staff Access: multi-user church administration
-- Adds new staff roles, invitation workflow, and audit logging.
--
-- Role model:
--   primary_admin  — exactly one per church; full access including billing transfer
--   church_admin   — full admin access; can manage staff and subscription
--   children_staff — operational ministry access (no billing/settings/staff mgmt)
--   checkin_staff  — check-in and print-station only
--
-- Existing rows with role='admin' are renamed to 'primary_admin'.

-- ── 1. Migrate existing 'admin' → 'primary_admin' ────────────────────────────
UPDATE church_users SET role = 'primary_admin' WHERE role = 'admin';

-- ── 2. Change default for new rows added via invitation ──────────────────────
ALTER TABLE church_users ALTER COLUMN role SET DEFAULT 'church_admin';

-- ── 3. Enforce at most one primary_admin per church ──────────────────────────
-- The index prevents INSERT/UPDATE from producing two primary_admin rows for
-- the same church. Application rules (transfer RPC + API gate) prevent zero.
CREATE UNIQUE INDEX IF NOT EXISTS one_primary_admin_per_church
  ON church_users (church_id)
  WHERE role = 'primary_admin';

-- ── 4. Staff invitations ─────────────────────────────────────────────────────
-- invitation_token_hash stores the SHA-256 hex of the raw token.
-- Only the hash ever touches the database; the raw token is sent by email only.
CREATE TABLE IF NOT EXISTS church_staff_invitations (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id             uuid        NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  invited_by_id         uuid        REFERENCES auth.users(id),
  invited_by_email      text,
  email                 text        NOT NULL,
  first_name            text        NOT NULL,
  last_name             text        NOT NULL,
  phone                 text,
  role                  text        NOT NULL,
  invitation_token_hash text        NOT NULL UNIQUE,
  status                text        NOT NULL DEFAULT 'pending',   -- pending | accepted | expired | revoked
  expires_at            timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at           timestamptz,
  revoked_at            timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staff_inv_hash   ON church_staff_invitations (invitation_token_hash);
CREATE INDEX IF NOT EXISTS idx_staff_inv_church  ON church_staff_invitations (church_id);
CREATE INDEX IF NOT EXISTS idx_staff_inv_email   ON church_staff_invitations (email);
CREATE INDEX IF NOT EXISTS idx_staff_inv_status  ON church_staff_invitations (church_id, status);

-- ── 5. Church audit log ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS church_audit_logs (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id    uuid        NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  actor_id     uuid        REFERENCES auth.users(id),
  actor_email  text,
  action       text        NOT NULL,   -- invitation_sent | invitation_accepted | role_changed |
                                       -- staff_removed | primary_admin_transferred |
                                       -- billing_review_requested | billing_review_completed |
                                       -- invitation_revoked
  target_id    uuid,                   -- affected user_id or invitation id
  target_email text,
  details      jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_church ON church_audit_logs (church_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_time   ON church_audit_logs (church_id, created_at DESC);

-- ── 6. Billing review state on subscriptions ─────────────────────────────────
-- Set when the outgoing primary admin flags that billing needs to be updated
-- after a transfer. Cleared once the new primary confirms they have reviewed.
ALTER TABLE church_subscriptions
  ADD COLUMN IF NOT EXISTS billing_review_required      bool        NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS billing_review_requested_at  timestamptz,
  ADD COLUMN IF NOT EXISTS billing_review_requested_by  uuid        REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS billing_review_reason        text;

-- ── 7. Future-proof billing contact separation ───────────────────────────────
-- Nullable; NULL means "same as primary_admin" (current default).
ALTER TABLE churches
  ADD COLUMN IF NOT EXISTS billing_contact_user_id uuid REFERENCES auth.users(id);

-- ── 8. Atomic primary-admin transfer RPC ─────────────────────────────────────
-- Runs demote + promote in a single transaction so no intermediate state
-- with zero or two primary_admins can persist.
--
-- Parameters:
--   p_church_id          — the church
--   p_current_user_id    — actor (caller): must be primary_admin or church_admin
--   p_new_primary_id     — target: must be church_admin in this church
--   p_billing_action     — 'keep' | 'update'
CREATE OR REPLACE FUNCTION transfer_primary_admin(
  p_church_id       uuid,
  p_current_user_id uuid,
  p_new_primary_id  uuid,
  p_billing_action  text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_primary_user_id uuid;
  v_target_role             text;
BEGIN
  -- Lock the church_users rows for this church to prevent races
  PERFORM 1 FROM church_users WHERE church_id = p_church_id FOR UPDATE;

  -- Confirm target is a church_admin in this church
  SELECT role INTO v_target_role
    FROM church_users
   WHERE church_id = p_church_id
     AND user_id   = p_new_primary_id;

  IF v_target_role IS NULL THEN
    RETURN jsonb_build_object('error', 'Target user is not a staff member of this church.');
  END IF;
  IF v_target_role <> 'church_admin' THEN
    RETURN jsonb_build_object('error', 'Only a Church Administrator can be promoted to Primary Administrator.');
  END IF;

  -- Find current primary (may differ from p_current_user_id if master admin)
  SELECT user_id INTO v_current_primary_user_id
    FROM church_users
   WHERE church_id = p_church_id
     AND role IN ('primary_admin', 'admin');

  -- Demote current primary → church_admin
  IF v_current_primary_user_id IS NOT NULL THEN
    UPDATE church_users
       SET role = 'church_admin'
     WHERE church_id = p_church_id
       AND user_id   = v_current_primary_user_id;
  END IF;

  -- Promote target → primary_admin
  UPDATE church_users
     SET role = 'primary_admin'
   WHERE church_id = p_church_id
     AND user_id   = p_new_primary_id;

  -- Set billing review flag when requested
  IF p_billing_action = 'update' THEN
    UPDATE church_subscriptions
       SET billing_review_required     = true,
           billing_review_requested_at = now(),
           billing_review_requested_by = p_current_user_id,
           billing_review_reason       = 'Outgoing primary administrator requested payment method update after transfer.'
     WHERE church_id = p_church_id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'previousPrimaryUserId', v_current_primary_user_id);
END;
$$;
