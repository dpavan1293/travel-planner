CREATE TABLE IF NOT EXISTS kv_store (
  user_id text NOT NULL,
  key text NOT NULL,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, key)
);

CREATE INDEX IF NOT EXISTS idx_kv_store_user_key_prefix ON kv_store (user_id, key text_pattern_ops);
