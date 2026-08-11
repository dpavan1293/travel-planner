-- Link di condivisione in sola lettura per i viaggi. Un token pubblico dà accesso
-- in lettura a un singolo viaggio, senza bisogno di login per chi lo riceve.
CREATE TABLE IF NOT EXISTS trip_shares (
  token text PRIMARY KEY,
  owner_id text NOT NULL,
  trip_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS trip_shares_owner_trip_idx ON trip_shares (owner_id, trip_id);
