-- complete_family_safety_review: transactional RPC for Annual Family Safety Review submission.
--
-- All writes — family update, every child update, review completion, and token invalidation —
-- execute inside a single PostgreSQL transaction. Any failure rolls back the entire operation.
--
-- Parameters:
--   p_token_hash      SHA-256 hex digest of the raw URL token (never the raw token)
--   p_family          JSONB of family field updates
--   p_children        JSONB array of child updates, each with an "id" field
--   p_submitted_name  Submitter's full name (collected at confirmation screen)
--   p_submitted_email Submitter's email (collected at confirmation screen)
--   p_had_changes     Whether any field changed (computed server-side in TypeScript)
--   p_change_summary  Structured field-name-only audit log (computed server-side, no raw values)
--
-- Security model:
--   • church_id and family_id are derived ONLY from the review row — never from the caller.
--   • Every child update is gated by family_id AND church_id from the review row.
--   • Token is looked up by hash; after lock, status and expiry are re-verified.
--   • Unknown child IDs cause an exception and full rollback.
--   • Missing canonical children cause an exception and full rollback.
--   • Concurrent submissions of the same token are serialized by FOR UPDATE;
--     the second request will find status = 'completed' and raise 'already_completed'.

CREATE OR REPLACE FUNCTION complete_family_safety_review(
  p_token_hash      text,
  p_family          jsonb,
  p_children        jsonb,
  p_submitted_name  text,
  p_submitted_email text,
  p_had_changes     boolean,
  p_change_summary  jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_review_id         uuid;
  v_church_id         uuid;
  v_family_id         uuid;
  v_status            text;
  v_expires_at        timestamptz;
  v_canonical_ids     uuid[];
  v_submitted_ids     uuid[];
  v_child             jsonb;
  v_child_id          uuid;
  v_allergies_text    text;
  v_allergies_save    text;
  v_photo_status      text;
  v_now               timestamptz := now();
BEGIN

  -- Step 1: find the review row by token hash (not yet locked)
  SELECT id
  INTO   v_review_id
  FROM   cm_family_safety_reviews
  WHERE  token_hash = p_token_hash;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid_token';
  END IF;

  -- Step 2: acquire a row-level lock so concurrent requests are serialized.
  --   The second request waits here until the first commits.
  --   After the first commits (token_hash → NULL, status → 'completed'),
  --   the second request re-reads the now-committed values and hits the
  --   'already_completed' check below.
  SELECT id, church_id, family_id, status, token_expires_at
  INTO   v_review_id, v_church_id, v_family_id, v_status, v_expires_at
  FROM   cm_family_safety_reviews
  WHERE  id = v_review_id
  FOR UPDATE;

  -- Step 3: re-validate after acquiring the lock (values may have changed)
  IF v_status = 'completed' THEN
    RAISE EXCEPTION 'already_completed';
  END IF;

  IF v_expires_at IS NULL OR v_expires_at < v_now THEN
    RAISE EXCEPTION 'expired';
  END IF;

  -- Step 4: confirm family exists under the review's church (never trust caller-supplied IDs)
  IF NOT EXISTS (
    SELECT 1 FROM cm_visitor_families
    WHERE id = v_family_id AND church_id = v_church_id
  ) THEN
    RAISE EXCEPTION 'invalid_token';
  END IF;

  -- Step 5: collect canonical child IDs for this family
  SELECT array_agg(id)
  INTO   v_canonical_ids
  FROM   cm_visitor_children
  WHERE  family_id = v_family_id AND church_id = v_church_id;

  -- Step 6: collect submitted child IDs from JSONB array
  SELECT array_agg((elem->>'id')::uuid)
  INTO   v_submitted_ids
  FROM   jsonb_array_elements(p_children) AS elem;

  -- Step 7: every canonical child must appear in the submission
  IF v_canonical_ids IS NOT NULL THEN
    FOR v_child_id IN SELECT unnest(v_canonical_ids) LOOP
      IF NOT (v_child_id = ANY(COALESCE(v_submitted_ids, ARRAY[]::uuid[]))) THEN
        RAISE EXCEPTION 'missing_child';
      END IF;
    END LOOP;
  END IF;

  -- Step 8: reject unknown child IDs (not in this family/church)
  IF v_submitted_ids IS NOT NULL THEN
    FOR v_child_id IN SELECT unnest(v_submitted_ids) LOOP
      IF NOT (v_child_id = ANY(COALESCE(v_canonical_ids, ARRAY[]::uuid[]))) THEN
        RAISE EXCEPTION 'unknown_child';
      END IF;
    END LOOP;
  END IF;

  -- Step 9: validate photo_permission_status for every submitted child
  FOR v_child IN SELECT * FROM jsonb_array_elements(p_children) LOOP
    v_photo_status := v_child->>'photo_permission_status';
    IF v_photo_status NOT IN ('granted', 'denied') THEN
      RAISE EXCEPTION 'invalid_photo_permission';
    END IF;
  END LOOP;

  -- Step 10: update cm_visitor_families
  --   parent1 names fall back to existing values if submitted as empty.
  --   All other fields are nullable and can be cleared.
  UPDATE cm_visitor_families SET
    parent1_first_name      = COALESCE(NULLIF(trim(p_family->>'parent1_first_name'), ''), parent1_first_name),
    parent1_last_name       = COALESCE(NULLIF(trim(p_family->>'parent1_last_name'),  ''), parent1_last_name),
    parent1_email           = NULLIF(trim(p_family->>'parent1_email'),           ''),
    parent1_phone           = NULLIF(trim(p_family->>'parent1_phone'),           ''),
    parent2_first_name      = NULLIF(trim(p_family->>'parent2_first_name'),      ''),
    parent2_last_name       = NULLIF(trim(p_family->>'parent2_last_name'),       ''),
    parent2_email           = NULLIF(trim(p_family->>'parent2_email'),           ''),
    parent2_phone           = NULLIF(trim(p_family->>'parent2_phone'),           ''),
    address                 = NULLIF(trim(p_family->>'address'),                 ''),
    city                    = NULLIF(trim(p_family->>'city'),                    ''),
    state                   = NULLIF(trim(p_family->>'state'),                   ''),
    zip                     = NULLIF(trim(p_family->>'zip'),                     ''),
    emergency_contact_name  = NULLIF(trim(p_family->>'emergency_contact_name'),  ''),
    emergency_contact_phone = NULLIF(trim(p_family->>'emergency_contact_phone'), '')
  WHERE id = v_family_id AND church_id = v_church_id;

  -- Step 11: update each submitted child
  FOR v_child IN SELECT * FROM jsonb_array_elements(p_children) LOOP
    v_child_id := (v_child->>'id')::uuid;

    -- Re-encode allergies: comma-separated display text → JSON.stringify(string[]) format
    -- This preserves compatibility with the kiosk check-in lookup which parses JSON arrays.
    v_allergies_text := trim(v_child->>'allergies');
    IF v_allergies_text IS NULL OR v_allergies_text = '' THEN
      v_allergies_save := NULL;
    ELSE
      SELECT array_to_json(
        ARRAY(
          SELECT trim(elem)
          FROM   unnest(string_to_array(v_allergies_text, ',')) AS elem
          WHERE  trim(elem) <> ''
        )
      )::text
      INTO v_allergies_save;

      IF v_allergies_save = '[]' THEN
        v_allergies_save := NULL;
      END IF;
    END IF;

    UPDATE cm_visitor_children SET
      date_of_birth           = NULLIF(trim(v_child->>'date_of_birth'), '')::date,
      grade                   = NULLIF(trim(v_child->>'grade'), ''),
      allergies               = v_allergies_save,
      medical_notes           = NULLIF(trim(v_child->>'medical_notes'), ''),
      special_instructions    = NULLIF(trim(v_child->>'special_instructions'), ''),
      authorized_pickups      = NULLIF(trim(v_child->>'authorized_pickups'), ''),
      photo_permission_status = v_child->>'photo_permission_status'
    WHERE id        = v_child_id
      AND family_id = v_family_id
      AND church_id = v_church_id;

    -- If UPDATE matched no rows the child doesn't belong to this family/church
    IF NOT FOUND THEN
      RAISE EXCEPTION 'unknown_child';
    END IF;
  END LOOP;

  -- Step 12: mark review complete and invalidate token — all in this transaction
  UPDATE cm_family_safety_reviews SET
    status                = 'completed',
    completed_at          = v_now,
    completed_by_name     = trim(p_submitted_name),
    completed_by_email    = trim(p_submitted_email),
    confirmation_accepted = true,
    had_changes           = p_had_changes,
    change_summary        = p_change_summary,
    token_hash            = NULL,   -- single-use: prevent any future submission
    updated_at            = v_now
  WHERE id = v_review_id;

END;
$$;
