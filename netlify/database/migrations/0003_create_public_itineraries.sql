CREATE TABLE IF NOT EXISTS public_itineraries (
  id text PRIMARY KEY,
  data jsonb NOT NULL,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
