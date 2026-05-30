CREATE TABLE IF NOT EXISTS public.cm_ministry_config (
  church_id text PRIMARY KEY,
  sidebar_label text NOT NULL DEFAULT '',
  grade_levels text[] NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cm_ministry_config ENABLE ROW LEVEL SECURITY;
