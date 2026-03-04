-- 1) Create user_scoring_stats View (Bias Stats)
CREATE OR REPLACE VIEW public.user_scoring_stats AS
WITH global AS (
  SELECT COALESCE(AVG(score)::numeric, 3.0) AS mu
  FROM public.match_reviews
),
given AS (
  SELECT reviewer_id AS user_id,
         AVG(score)::numeric AS avg_given,
         COUNT(*)::int AS n_given
  FROM public.match_reviews
  GROUP BY reviewer_id
),
received AS (
  SELECT target_id AS user_id,
         AVG(score)::numeric AS avg_received,
         COUNT(*)::int AS n_received
  FROM public.match_reviews
  GROUP BY target_id
)
SELECT
  p.id AS user_id,
  g.mu,
  COALESCE(gi.avg_given, g.mu) AS avg_given_score,
  COALESCE(ri.avg_received, g.mu) AS avg_received_score,
  COALESCE(gi.n_given, 0) AS given_count,
  COALESCE(ri.n_received, 0) AS received_count
FROM public.profiles p
CROSS JOIN global g
LEFT JOIN given gi ON gi.user_id = p.id
LEFT JOIN received ri ON ri.user_id = p.id;

-- 2) Performance Indexes
CREATE INDEX IF NOT EXISTS match_reviews_reviewer_target_idx
ON public.match_reviews(reviewer_id, target_id);

CREATE INDEX IF NOT EXISTS match_reviews_target_idx
ON public.match_reviews(target_id);

-- 3) Extend matches table
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS match_score NUMERIC;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS match_meta JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS algorithm_version TEXT;

-- 4) Create match_model_registry
CREATE TABLE IF NOT EXISTS public.match_model_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  algo TEXT NOT NULL,
  version TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'CANDIDATE',
  trained_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  train_window_start TIMESTAMPTZ,
  train_window_end TIMESTAMPTZ,
  train_samples INTEGER NOT NULL DEFAULT 0,
  eval_samples INTEGER NOT NULL DEFAULT 0,
  metric_corr NUMERIC,
  metric_topk_hit NUMERIC,
  metric_calibration NUMERIC,
  notes JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(algo, version)
);

ALTER TABLE public.match_model_registry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "match_model_registry admin read" ON public.match_model_registry;
CREATE POLICY "match_model_registry admin read" ON public.match_model_registry
FOR SELECT USING ((SELECT p.is_admin FROM public.profiles p WHERE p.id = auth.uid()) = true);

REVOKE ALL ON TABLE public.match_model_registry FROM anon, authenticated;
GRANT SELECT ON TABLE public.match_model_registry TO authenticated;
GRANT ALL ON TABLE public.match_model_registry TO service_role;
